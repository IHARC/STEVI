'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { queuePortalNotification } from '@/lib/notifications';
import { getBoolean, getNumber, getString, parseEnum } from '@/lib/server-actions/form';
import {
  CFS_ATTACHMENTS_BUCKET,
  CFS_ACCESS_LEVEL_OPTIONS,
  CFS_ORIGIN_OPTIONS,
  CFS_SOURCE_OPTIONS,
  CFS_STATUS_OPTIONS,
  INCIDENT_PRIORITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  NOTIFY_CHANNEL_OPTIONS,
  PUBLIC_CATEGORY_OPTIONS,
  REPORT_METHOD_OPTIONS,
  REPORT_PRIORITY_OPTIONS,
  REPORT_STATUS_OPTIONS,
  VERIFICATION_METHOD_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  formatCfsLabel,
  formatReportStatus,
} from '@/lib/cfs/constants';
import { sanitizeFileName } from '@/lib/utils';
import type { Database } from '@/types/supabase';

const CFS_LIST_PATH = '/ops/cfs';
const cfsDetailPath = (cfsId: number | string) => `/ops/cfs/${cfsId}`;
const incidentDetailPath = (incidentId: number | string) => `/ops/incidents/${incidentId}`;
const MAX_CFS_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export type CfsActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  cfsId?: number;
  incidentId?: number;
  trackingId?: string;
};

export const initialCfsActionState: CfsActionState = { status: 'idle' };

export type CfsAttachmentActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export const initialCfsAttachmentActionState: CfsAttachmentActionState = { status: 'idle' };

type NotifySummary = {
  notify_opt_in: boolean | null;
  notify_channel: Database['core']['Enums']['notify_channel_enum'] | null;
  notify_target: string | null;
  report_number: string;
  public_tracking_id: string | null;
};

function parseOptionalDatetime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseUrgencyIndicators(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeEmailTarget(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function normalizePhoneTarget(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return hasPlus ? `+${digits}` : digits;
}

function normalizeNotifyTarget(channel: 'email' | 'sms', value: string | null): string | null {
  return channel === 'sms' ? normalizePhoneTarget(value) : normalizeEmailTarget(value);
}

async function fetchNotifySummary(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  cfsId: number,
): Promise<NotifySummary | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('calls_for_service')
    .select('notify_opt_in, notify_channel, notify_target, report_number, public_tracking_id')
    .eq('id', cfsId)
    .maybeSingle();

  if (error || !data) return null;
  return data as NotifySummary;
}

async function maybeNotifyReporter(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  cfsId: number,
  message: { subject: string; bodyText: string; bodySms?: string; type: string },
) {
  const summary = await fetchNotifySummary(supabase, cfsId);
  if (!summary || !summary.notify_opt_in || !summary.notify_channel || summary.notify_channel === 'none' || !summary.notify_target) {
    return;
  }

  const channel = summary.notify_channel === 'sms' ? 'sms' : 'email';
  const bodyText = channel === 'sms' ? message.bodySms ?? message.bodyText : message.bodyText;

  await queuePortalNotification(supabase, {
    email: channel === 'email' ? summary.notify_target : null,
    phone: channel === 'sms' ? summary.notify_target : null,
    channels: [channel],
    subject: message.subject,
    bodyText,
    type: message.type,
    payload: {
      report_number: summary.report_number,
      public_tracking_id: summary.public_tracking_id,
    },
  });
}

export async function createCfsCallAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canCreateCfs) {
      return { status: 'error', message: 'You do not have permission to create calls for service.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before creating a call.');

    const origin = parseEnum(getString(formData, 'origin'), CFS_ORIGIN_OPTIONS) ?? 'community';
    const source = parseEnum(getString(formData, 'source'), CFS_SOURCE_OPTIONS) ?? 'phone';
    const reportMethod = parseEnum(getString(formData, 'report_method'), REPORT_METHOD_OPTIONS) ?? 'phone';
    const reportPriority = parseEnum(getString(formData, 'report_priority_assessment'), REPORT_PRIORITY_OPTIONS) ?? 'routine';
    const reportReceivedAt = parseOptionalDatetime(getString(formData, 'report_received_at'));
    const receivedAt = parseOptionalDatetime(getString(formData, 'received_at'));

    const reporterName = getString(formData, 'reporter_name');
    const reporterPhone = getString(formData, 'reporter_phone');
    const reporterEmail = getString(formData, 'reporter_email');
    const reporterAddress = getString(formData, 'reporter_address');
    const reporterRelationship = getString(formData, 'reporter_relationship');
    const anonymousReporter = getBoolean(formData, 'anonymous_reporter');
    const anonymousDetails = getString(formData, 'anonymous_reporter_details');

    let reportingPersonId = getNumber(formData, 'reporting_person_id');
    let reportingOrgId = getNumber(formData, 'reporting_organization_id');
    const referringOrgId = getNumber(formData, 'referring_organization_id');
    const referringAgencyName = getString(formData, 'referring_agency_name');

    const locationText = getString(formData, 'location_text');
    const reportedLocation = getString(formData, 'reported_location');
    const reportedCoordinates = getString(formData, 'reported_coordinates');
    const locationConfidence = getString(formData, 'location_confidence');

    const initialNarrative = getString(formData, 'initial_report_narrative', { required: true, trim: true });
    if (!initialNarrative || initialNarrative.length < 8) {
      return { status: 'error', message: 'Provide a short summary (at least 8 characters).' };
    }

    const typeHint = parseEnum(getString(formData, 'type_hint'), INCIDENT_TYPE_OPTIONS);
    const priorityHint = parseEnum(getString(formData, 'priority_hint'), INCIDENT_PRIORITY_OPTIONS);

    const urgencyIndicators = parseUrgencyIndicators(getString(formData, 'urgency_indicators'));

    const notifyOptIn = getBoolean(formData, 'notify_opt_in');
    const notifyChannel = parseEnum(getString(formData, 'notify_channel'), NOTIFY_CHANNEL_OPTIONS) ?? 'none';
    const rawNotifyTarget = getString(formData, 'notify_target');
    let notifyTarget = rawNotifyTarget;

    if (notifyOptIn && (!notifyChannel || notifyChannel === 'none')) {
      return { status: 'error', message: 'Select a notification channel or disable notifications.' };
    }

    if (notifyOptIn && notifyChannel !== 'none') {
      notifyTarget = normalizeNotifyTarget(notifyChannel, rawNotifyTarget);
      if (!notifyTarget) {
        return {
          status: 'error',
          message: notifyChannel === 'sms' ? 'Enter a valid phone number for SMS updates.' : 'Enter a valid email address.',
        };
      }
      if (notifyChannel === 'email' && !notifyTarget.includes('@')) {
        return { status: 'error', message: 'Enter a valid email address.' };
      }
    }

    if (anonymousReporter) {
      reportingPersonId = null;
      reportingOrgId = null;
    }

    if (reportingPersonId && reportingOrgId) {
      return { status: 'error', message: 'Select either a reporting person or organization, not both.' };
    }

    const payload: Record<string, unknown> = {
      owning_organization_id: access.organizationId,
      origin,
      source,
      report_method: reportMethod,
      report_priority_assessment: reportPriority,
      report_received_at: reportReceivedAt,
      received_at: receivedAt,
      reporting_person_id: reportingPersonId,
      reporting_organization_id: reportingOrgId,
      anonymous_reporter: anonymousReporter,
      anonymous_reporter_details: anonymousDetails,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      reporter_email: reporterEmail,
      reporter_address: reporterAddress,
      reporter_relationship: reporterRelationship,
      initial_report_narrative: initialNarrative,
      location_text: locationText,
      reported_location: reportedLocation,
      reported_coordinates: reportedCoordinates,
      location_confidence: locationConfidence,
      notify_opt_in: notifyOptIn,
      notify_channel: notifyOptIn ? notifyChannel : 'none',
      notify_target: notifyOptIn ? notifyTarget : null,
      type_hint: typeHint,
      priority_hint: priorityHint,
      urgency_indicators: urgencyIndicators,
      referring_organization_id: referringOrgId,
      referring_agency_name: referringAgencyName,
    };

    const { data: callId, error } = await supabase
      .schema('case_mgmt')
      .rpc('cfs_create_call', { p_payload: payload });

    if (error || !callId) {
      throw error ?? new Error('Unable to create the call.');
    }

    const cfsId = Number(callId);

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_created',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: {
        origin,
        source,
        report_method: reportMethod,
        report_priority_assessment: reportPriority,
        report_status: 'active',
        status: 'received',
        reporting_organization_id: reportingOrgId,
        reporting_person_id: reportingPersonId,
      },
    });

    const publicTrackingEnabled = getBoolean(formData, 'public_tracking_enabled');
    if (publicTrackingEnabled) {
      if (!access.canPublicTrackCfs) {
        return { status: 'error', message: 'You do not have permission to enable public tracking.' };
      }
      const category = parseEnum(getString(formData, 'public_category'), PUBLIC_CATEGORY_OPTIONS);
      const publicLocation = getString(formData, 'public_location_area');
      const publicSummary = getString(formData, 'public_summary');

      if (!category || !publicLocation) {
        return { status: 'error', message: 'Provide a public category and location to enable tracking.' };
      }

      const { data: trackingId, error: trackingError } = await supabase
        .schema('case_mgmt')
        .rpc('cfs_public_tracking_upsert', {
          p_cfs_id: cfsId,
          p_category: category,
          p_public_location_area: publicLocation,
          p_public_summary: publicSummary ?? undefined,
        });

      if (trackingError) {
        return { status: 'error', message: trackingError.message };
      }

      if (trackingId) {
        await logAuditEvent(supabase, {
          actorProfileId: access.profile.id,
          action: 'cfs_public_tracking_enabled',
          entityType: 'case_mgmt.cfs_public_tracking',
          entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'cfs_public_tracking', id: String(trackingId) }),
          meta: {
            cfs_id: cfsId,
            category,
            public_location_area: publicLocation,
          },
        });
      }
    }

    if (notifyOptIn && notifyChannel !== 'none' && notifyTarget) {
      await maybeNotifyReporter(supabase, cfsId, {
        subject: `Request received (${cfsId})`,
        bodyText: `We have received your request and our outreach team is reviewing it.\n\nTracking ID: ${cfsId}`,
        bodySms: `Request received. Tracking ID ${cfsId}.`,
        type: 'cfs_received',
      });
    }

    revalidatePath(CFS_LIST_PATH);
    redirect(cfsDetailPath(cfsId));
  } catch (error) {
    console.error('createCfsCallAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to create the call.' };
  }
}

export async function triageCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const priority = parseEnum(getString(formData, 'report_priority_assessment'), REPORT_PRIORITY_OPTIONS) ?? 'routine';
    const typeHint = parseEnum(getString(formData, 'type_hint'), INCIDENT_TYPE_OPTIONS);
    const priorityHint = parseEnum(getString(formData, 'priority_hint'), INCIDENT_PRIORITY_OPTIONS);
    const urgencyIndicators = parseUrgencyIndicators(getString(formData, 'urgency_indicators'));
    const notes = getString(formData, 'phase_notes');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canTriageCfs) {
      return { status: 'error', message: 'You do not have permission to triage this call.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_triage', {
      p_cfs_id: cfsId,
      p_payload: {
        report_priority_assessment: priority,
        urgency_indicators: urgencyIndicators,
        type_hint: typeHint,
        priority_hint: priorityHint,
        phase_notes: notes,
      },
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_triaged',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: { report_priority_assessment: priority, type_hint: typeHint, priority_hint: priorityHint },
    });

    await maybeNotifyReporter(supabase, cfsId, {
      subject: `Request triaged (${cfsId})`,
      bodyText: 'Your request has been triaged. A coordinator is reviewing the next steps.',
      bodySms: 'Your request has been triaged. A coordinator is reviewing next steps.',
      type: 'cfs_triaged',
    });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Call triaged.' };
  } catch (error) {
    console.error('triageCfsAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to triage the call.' };
  }
}

export async function verifyCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const status = parseEnum(getString(formData, 'verification_status'), VERIFICATION_STATUS_OPTIONS) ?? 'pending';
    const method = parseEnum(getString(formData, 'verification_method'), VERIFICATION_METHOD_OPTIONS) ?? 'none_required';
    const notes = getString(formData, 'verification_notes') ?? '';

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canTriageCfs) {
      return { status: 'error', message: 'You do not have permission to verify this call.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_verify', {
      p_cfs_id: cfsId,
      p_status: status,
      p_method: method,
      p_notes: notes,
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_verified',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: { verification_status: status, verification_method: method },
    });

    await maybeNotifyReporter(supabase, cfsId, {
      subject: `Request verified (${cfsId})`,
      bodyText: 'Your request has been verified and is moving to the next step.',
      bodySms: 'Your request has been verified and is moving to the next step.',
      type: 'cfs_verified',
    });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Verification saved.' };
  } catch (error) {
    console.error('verifyCfsAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update verification.' };
  }
}

export async function dismissCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const reportStatus = parseEnum(getString(formData, 'report_status'), REPORT_STATUS_OPTIONS) ?? 'resolved';
    const notes = getString(formData, 'resolution_notes') ?? '';

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return { status: 'error', message: 'You do not have permission to close this call.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_dismiss', {
      p_cfs_id: cfsId,
      p_report_status: reportStatus,
      p_notes: notes,
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_closed',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: { report_status: reportStatus },
    });

    await maybeNotifyReporter(supabase, cfsId, {
      subject: `Request closed (${cfsId})`,
      bodyText: `Your request has been closed with status: ${formatReportStatus(reportStatus)}.`,
      bodySms: `Your request has been closed (${formatReportStatus(reportStatus)}).`,
      type: 'cfs_closed',
    });

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(CFS_LIST_PATH);
    return { status: 'success', message: 'Call closed.' };
  } catch (error) {
    console.error('dismissCfsAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to close the call.' };
  }
}

export async function markDuplicateCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const duplicateOf = getNumber(formData, 'duplicate_of_report_id', { required: true }) as number;
    const notes = getString(formData, 'duplicate_notes') ?? '';

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return { status: 'error', message: 'You do not have permission to mark duplicates.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_mark_duplicate', {
      p_cfs_id: cfsId,
      p_duplicate_of: duplicateOf,
      p_notes: notes,
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_marked_duplicate',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: { duplicate_of_report_id: duplicateOf },
    });

    await maybeNotifyReporter(supabase, cfsId, {
      subject: `Request merged (${cfsId})`,
      bodyText: 'Your request was merged with an existing report. The outreach team is continuing follow-up on the original request.',
      bodySms: 'Your request was merged with an existing report. We are continuing follow-up.',
      type: 'cfs_duplicate',
    });

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(CFS_LIST_PATH);
    return { status: 'success', message: 'Marked as duplicate.' };
  } catch (error) {
    console.error('markDuplicateCfsAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to mark duplicate.' };
  }
}

export async function convertCfsToIncidentAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const incidentType = parseEnum(getString(formData, 'incident_type'), INCIDENT_TYPE_OPTIONS);
    const description = getString(formData, 'incident_description');
    const incidentStatus = getString(formData, 'incident_status');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canDispatchCfs) {
      return { status: 'error', message: 'You do not have permission to dispatch this call.' };
    }

    const payload: Record<string, unknown> = {
      incident_type: incidentType,
      description,
      status: incidentStatus,
      phase_notes: getString(formData, 'dispatch_notes'),
    };

    const { data: incidentId, error } = await supabase
      .schema('case_mgmt')
      .rpc('cfs_convert_to_incident', { p_cfs_id: cfsId, p_payload: payload });

    if (error || !incidentId) {
      throw error ?? new Error('Unable to convert call.');
    }

    const incidentNumeric = Number(incidentId);

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_converted_to_incident',
      entityType: 'case_mgmt.incidents',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'incidents', id: incidentNumeric }),
      meta: { cfs_id: cfsId, incident_type: incidentType },
    });

    await maybeNotifyReporter(supabase, cfsId, {
      subject: `Request dispatched (${cfsId})`,
      bodyText: 'Your request has been dispatched to an outreach team. We will follow up once there is an update.',
      bodySms: 'Your request has been dispatched to an outreach team.',
      type: 'cfs_dispatched',
    });

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(incidentDetailPath(incidentNumeric));
    return { status: 'success', message: 'Converted to incident.', incidentId: incidentNumeric };
  } catch (error) {
    console.error('convertCfsToIncidentAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to convert to incident.' };
  }
}

export async function shareCfsWithOrgAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const orgId = getNumber(formData, 'organization_id', { required: true }) as number;
    const accessLevel = parseEnum(getString(formData, 'access_level'), CFS_ACCESS_LEVEL_OPTIONS) ?? 'view';
    const reason = getString(formData, 'share_reason');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canShareCfs) {
      return { status: 'error', message: 'You do not have permission to share this call.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_grant_org_access', {
      p_cfs_id: cfsId,
      p_org_id: orgId,
      p_access_level: accessLevel,
      p_reason: reason ?? undefined,
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_shared',
      entityType: 'case_mgmt.cfs_org_access',
      entityRef: null,
      meta: { cfs_id: cfsId, organization_id: orgId, access_level: accessLevel },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Organization added.' };
  } catch (error) {
    console.error('shareCfsWithOrgAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to share this call.' };
  }
}

export async function revokeCfsOrgAccessAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const orgId = getNumber(formData, 'organization_id', { required: true }) as number;
    const reason = getString(formData, 'revoke_reason');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canShareCfs) {
      return { status: 'error', message: 'You do not have permission to revoke access.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_revoke_org_access', {
      p_cfs_id: cfsId,
      p_org_id: orgId,
      p_reason: reason ?? undefined,
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_share_revoked',
      entityType: 'case_mgmt.cfs_org_access',
      entityRef: null,
      meta: { cfs_id: cfsId, organization_id: orgId },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Access revoked.' };
  } catch (error) {
    console.error('revokeCfsOrgAccessAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to revoke access.' };
  }
}

export async function transferCfsOwnershipAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const orgId = getNumber(formData, 'organization_id', { required: true }) as number;
    const reason = getString(formData, 'transfer_reason');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canDispatchCfs) {
      return { status: 'error', message: 'You do not have permission to transfer ownership.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_transfer_ownership', {
      p_cfs_id: cfsId,
      p_new_org_id: orgId,
      p_reason: reason ?? undefined,
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_transfer_ownership',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: { new_org_id: orgId, reason },
    });

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(CFS_LIST_PATH);
    return { status: 'success', message: 'Ownership transferred.' };
  } catch (error) {
    console.error('transferCfsOwnershipAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to transfer ownership.' };
  }
}

export async function enablePublicTrackingAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const category = parseEnum(getString(formData, 'public_category'), PUBLIC_CATEGORY_OPTIONS);
    const publicLocation = getString(formData, 'public_location_area');
    const publicSummary = getString(formData, 'public_summary');

    if (!category || !publicLocation) {
      return { status: 'error', message: 'Provide a public category and location.' };
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canPublicTrackCfs) {
      return { status: 'error', message: 'You do not have permission to update public tracking.' };
    }

    const { data: trackingId, error } = await supabase.schema('case_mgmt').rpc('cfs_public_tracking_upsert', {
      p_cfs_id: cfsId,
      p_category: category,
      p_public_location_area: publicLocation,
      p_public_summary: publicSummary ?? undefined,
    });

    if (error) {
      throw error;
    }

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Public tracking enabled.', trackingId: trackingId ?? undefined };
  } catch (error) {
    console.error('enablePublicTrackingAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to enable tracking.' };
  }
}

export async function disablePublicTrackingAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canPublicTrackCfs) {
      return { status: 'error', message: 'You do not have permission to update public tracking.' };
    }

    await supabase.schema('case_mgmt').rpc('cfs_public_tracking_disable', { p_cfs_id: cfsId });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Public tracking disabled.' };
  } catch (error) {
    console.error('disablePublicTrackingAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to disable tracking.' };
  }
}

export async function addCfsNoteAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const note = getString(formData, 'note', { required: true, trim: true });

    if (!note || note.length < 4) {
      return { status: 'error', message: 'Add a brief note (at least 4 characters).' };
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return { status: 'error', message: 'You do not have permission to add notes.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization to add a note.');

    const { error } = await supabase
      .schema('case_mgmt')
      .from('cfs_timeline')
      .insert({
        incident_report_id: cfsId,
        phase: 'follow_up',
        sub_phase: 'note',
        phase_started_at: new Date().toISOString(),
        phase_status: 'completed',
        phase_notes: note,
        performed_by: access.userId,
        organization_id: access.organizationId,
        created_by: access.userId,
      });

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_note_added',
      entityType: 'case_mgmt.cfs_timeline',
      entityRef: null,
      meta: { cfs_id: cfsId },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Note added.' };
  } catch (error) {
    console.error('addCfsNoteAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to add note.' };
  }
}

export async function updateCfsStatusAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const status = parseEnum(getString(formData, 'status'), CFS_STATUS_OPTIONS) ?? 'received';
    const notes = getString(formData, 'status_notes');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return { status: 'error', message: 'You do not have permission to update status.' };
    }

    const { error } = await supabase
      .schema('case_mgmt')
      .from('calls_for_service')
      .update({ status })
      .eq('id', cfsId);

    if (error) {
      throw error;
    }

    if (notes) {
      await supabase.schema('case_mgmt').from('cfs_timeline').insert({
        incident_report_id: cfsId,
        phase: 'response',
        sub_phase: 'status_update',
        phase_started_at: new Date().toISOString(),
        phase_status: 'completed',
        phase_notes: notes,
        performed_by: access.userId,
        organization_id: access.organizationId,
        created_by: access.userId,
      });
    }

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: `Status updated: ${formatCfsLabel(status)}.` };
  } catch (error) {
    console.error('updateCfsStatusAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update status.' };
  }
}

export async function uploadCfsAttachmentAction(
  _prevState: CfsAttachmentActionState,
  formData: FormData,
): Promise<CfsAttachmentActionState> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const notes = getString(formData, 'attachment_notes');
    const file = formData.get('attachment');

    if (!(file instanceof File)) {
      return { status: 'error', message: 'Select a file to upload.' };
    }

    if (file.size > MAX_CFS_ATTACHMENT_BYTES) {
      return { status: 'error', message: 'Attachment must be under 15 MB.' };
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return { status: 'error', message: 'You do not have permission to upload attachments.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization to upload attachments.');

    const sanitizedName = sanitizeFileName(file.name || 'attachment');
    const objectPath = `cfs/${cfsId}/${randomUUID()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage.from(CFS_ATTACHMENTS_BUCKET).upload(objectPath, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

    if (uploadError) {
      throw uploadError;
    }

    const metadata: Record<string, unknown> = {};
    if (file.name) metadata.original_name = file.name;
    if (notes) metadata.notes = notes;

    const { data: attachmentRow, error: insertError } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .insert({
        cfs_id: cfsId,
        organization_id: access.organizationId,
        uploaded_by: access.userId,
        file_name: file.name || sanitizedName,
        file_type: file.type || null,
        file_size: file.size,
        storage_bucket: CFS_ATTACHMENTS_BUCKET,
        storage_path: objectPath,
        metadata: Object.keys(metadata).length ? metadata : null,
      })
      .select('id')
      .single();

    if (insertError || !attachmentRow) {
      await supabase.storage.from(CFS_ATTACHMENTS_BUCKET).remove([objectPath]);
      throw insertError ?? new Error('Unable to save attachment.');
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_attachment_uploaded',
      entityType: 'case_mgmt.cfs_attachments',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'cfs_attachments', id: attachmentRow.id }),
      meta: { cfs_id: cfsId, file_name: file.name || sanitizedName, file_size: file.size },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return { status: 'success', message: 'Attachment uploaded.' };
  } catch (error) {
    console.error('uploadCfsAttachmentAction error', error);
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to upload attachment.' };
  }
}

export async function deleteCfsAttachmentAction(formData: FormData): Promise<void> {
  try {
    const cfsId = getNumber(formData, 'cfs_id', { required: true }) as number;
    const attachmentId = getString(formData, 'attachment_id', { required: true });

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canDeleteCfs) {
      return;
    }

    const { data: attachment, error } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .select('id, storage_bucket, storage_path, file_name')
      .eq('id', attachmentId)
      .eq('cfs_id', cfsId)
      .maybeSingle();

    if (error || !attachment) {
      return;
    }

    const { error: storageError } = await supabase.storage.from(attachment.storage_bucket).remove([attachment.storage_path]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      throw deleteError;
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_attachment_deleted',
      entityType: 'case_mgmt.cfs_attachments',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'cfs_attachments', id: attachmentId }),
      meta: { cfs_id: cfsId, file_name: attachment.file_name },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return;
  } catch (error) {
    console.error('deleteCfsAttachmentAction error', error);
    return;
  }
}
