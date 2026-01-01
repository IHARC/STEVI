'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { queuePortalNotification } from '@/lib/notifications';
import {
  ActionState,
  actionError,
  actionOk,
  parseFormData,
  zodBoolean,
  zodOptionalNumber,
  zodOptionalString,
  zodRequiredNumber,
  zodRequiredString,
} from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
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

async function loadActionAccess(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return loadPortalAccess(supabase, { allowSideEffects: true });
}

type CfsActionData = {
  cfsId?: number;
  incidentId?: number;
  trackingId?: string;
  message?: string;
};

export type CfsActionState = ActionState<CfsActionData>;

export const initialCfsActionState: CfsActionState = { status: 'idle' };

type CfsAttachmentActionData = {
  attachmentId?: string;
  message?: string;
};

export type CfsAttachmentActionState = ActionState<CfsAttachmentActionData>;

export const initialCfsAttachmentActionState: CfsAttachmentActionState = { status: 'idle' };

type NotifySummary = {
  notify_opt_in: boolean | null;
  notify_channel: Database['core']['Enums']['notify_channel_enum'] | null;
  notify_target: string | null;
  report_number: string;
  public_tracking_id: string | null;
};

const enumOrUndefined = <T extends string>(options: readonly T[]) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.enum(options as [T, ...T[]]).optional(),
  );

const enumWithDefault = <T extends string>(options: readonly T[], fallback: T) =>
  enumOrUndefined(options).transform((value) => value ?? fallback);

const requiredId = (label: string) => zodRequiredNumber(label, { int: true, positive: true });

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
    const parsed = parseFormData(
      formData,
      z.object({
        origin: enumWithDefault(CFS_ORIGIN_OPTIONS, 'community'),
        source: enumWithDefault(CFS_SOURCE_OPTIONS, 'phone'),
        report_method: enumWithDefault(REPORT_METHOD_OPTIONS, 'phone'),
        report_priority_assessment: enumWithDefault(REPORT_PRIORITY_OPTIONS, 'routine'),
        report_received_at: zodOptionalString(),
        received_at: zodOptionalString(),
        reporter_name: zodOptionalString(),
        reporter_phone: zodOptionalString(),
        reporter_email: zodOptionalString(),
        reporter_address: zodOptionalString(),
        reporter_relationship: zodOptionalString(),
        anonymous_reporter: zodBoolean(),
        anonymous_reporter_details: zodOptionalString(),
        reporting_person_id: zodOptionalNumber(),
        reporting_organization_id: zodOptionalNumber(),
        referring_organization_id: zodOptionalNumber(),
        referring_agency_name: zodOptionalString(),
        location_text: zodOptionalString(),
        reported_location: zodOptionalString(),
        reported_coordinates: zodOptionalString(),
        location_confidence: zodOptionalString(),
        initial_report_narrative: zodRequiredString('Provide a short summary (at least 8 characters).', { min: 8 }),
        type_hint: enumOrUndefined(INCIDENT_TYPE_OPTIONS),
        priority_hint: enumOrUndefined(INCIDENT_PRIORITY_OPTIONS),
        urgency_indicators: zodOptionalString(),
        notify_opt_in: zodBoolean(),
        notify_channel: enumWithDefault(NOTIFY_CHANNEL_OPTIONS, 'none'),
        notify_target: zodOptionalString(),
        public_tracking_enabled: zodBoolean(),
        public_category: enumOrUndefined(PUBLIC_CATEGORY_OPTIONS),
        public_location_area: zodOptionalString(),
        public_summary: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      origin,
      source,
      report_method: reportMethod,
      report_priority_assessment: reportPriority,
      report_received_at,
      received_at,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      reporter_email: reporterEmail,
      reporter_address: reporterAddress,
      reporter_relationship: reporterRelationship,
      anonymous_reporter: anonymousReporter,
      anonymous_reporter_details: anonymousDetails,
      reporting_person_id,
      reporting_organization_id,
      referring_organization_id: referringOrgId,
      referring_agency_name: referringAgencyName,
      location_text: locationText,
      reported_location: reportedLocation,
      reported_coordinates: reportedCoordinates,
      location_confidence: locationConfidence,
      initial_report_narrative: initialNarrative,
      type_hint: typeHint,
      priority_hint: priorityHint,
      urgency_indicators: urgencyIndicatorsRaw,
      notify_opt_in: notifyOptIn,
      notify_channel: notifyChannel,
      notify_target: rawNotifyTarget,
      public_tracking_enabled: publicTrackingEnabled,
      public_category: publicCategory,
      public_location_area: publicLocation,
      public_summary: publicSummary,
    } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canCreateCfs) {
      return actionError('You do not have permission to create calls for service.');
    }

    assertOrganizationSelected(access, 'Select an acting organization before creating a call.');

    const reportReceivedAt = parseOptionalDatetime(report_received_at ?? null);
    const receivedAt = parseOptionalDatetime(received_at ?? null);

    const urgencyIndicators = parseUrgencyIndicators(urgencyIndicatorsRaw ?? null);

    let reportingPersonId = reporting_person_id ?? null;
    let reportingOrgId = reporting_organization_id ?? null;

    let notifyTarget = rawNotifyTarget ?? null;

    if (notifyOptIn && notifyChannel === 'none') {
      return actionError('Select a notification channel or disable notifications.', {
        notify_channel: 'Select a notification channel or disable notifications.',
      });
    }

    if (notifyOptIn && notifyChannel !== 'none') {
      notifyTarget = normalizeNotifyTarget(notifyChannel, rawNotifyTarget ?? null);
      if (!notifyTarget) {
        return actionError(
          notifyChannel === 'sms' ? 'Enter a valid phone number for SMS updates.' : 'Enter a valid email address.',
          { notify_target: notifyChannel === 'sms' ? 'Enter a valid phone number.' : 'Enter a valid email address.' },
        );
      }
      if (notifyChannel === 'email' && !notifyTarget.includes('@')) {
        return actionError('Enter a valid email address.', { notify_target: 'Enter a valid email address.' });
      }
    }

    if (anonymousReporter) {
      reportingPersonId = null;
      reportingOrgId = null;
    }

    if (reportingPersonId && reportingOrgId) {
      return actionError('Select either a reporting person or organization, not both.', {
        reporting_person_id: 'Select either a person or organization.',
        reporting_organization_id: 'Select either a person or organization.',
      });
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

    const createResult = await supabase.schema('case_mgmt').rpc('cfs_create_call', { p_payload: payload });
    assertRpcOk(createResult, 'cfs_create_call');

    const callId = createResult.data;
    if (!callId) {
      throw new Error('Unable to create the call.');
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

    if (publicTrackingEnabled) {
      if (!access.canPublicTrackCfs) {
        return actionError('You do not have permission to enable public tracking.');
      }

      if (!publicCategory || !publicLocation) {
        return actionError('Provide a public category and location to enable tracking.', {
          public_category: 'Select a public category.',
          public_location_area: 'Provide a public location area.',
        });
      }

      const trackingResult = await supabase
        .schema('case_mgmt')
        .rpc('cfs_public_tracking_upsert', {
          p_cfs_id: cfsId,
          p_category: publicCategory,
          p_public_location_area: publicLocation,
          p_public_summary: publicSummary ?? undefined,
        });

      if (trackingResult.error) {
        return actionError(trackingResult.error.message);
      }

      if (trackingResult.data) {
        await logAuditEvent(supabase, {
          actorProfileId: access.profile.id,
          action: 'cfs_public_tracking_enabled',
          entityType: 'case_mgmt.cfs_public_tracking',
          entityRef: buildEntityRef({
            schema: 'case_mgmt',
            table: 'cfs_public_tracking',
            id: String(trackingResult.data),
          }),
          meta: {
            cfs_id: cfsId,
            category: publicCategory,
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
    return actionError(error instanceof Error ? error.message : 'Unable to create the call.');
  }
}

export async function triageCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        report_priority_assessment: enumWithDefault(REPORT_PRIORITY_OPTIONS, 'routine'),
        type_hint: enumOrUndefined(INCIDENT_TYPE_OPTIONS),
        priority_hint: enumOrUndefined(INCIDENT_PRIORITY_OPTIONS),
        urgency_indicators: zodOptionalString(),
        phase_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      cfs_id: cfsId,
      report_priority_assessment: priority,
      type_hint: typeHint,
      priority_hint: priorityHint,
      urgency_indicators: urgencyIndicatorsRaw,
      phase_notes: notes,
    } = parsed.data;
    const urgencyIndicators = parseUrgencyIndicators(urgencyIndicatorsRaw ?? null);

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canTriageCfs) {
      return actionError('You do not have permission to triage this call.');
    }

    const triageResult = await supabase.schema('case_mgmt').rpc('cfs_triage', {
      p_cfs_id: cfsId,
      p_payload: {
        report_priority_assessment: priority,
        urgency_indicators: urgencyIndicators,
        type_hint: typeHint,
        priority_hint: priorityHint,
        phase_notes: notes,
      },
    });
    assertRpcOk(triageResult, 'cfs_triage');

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
    return actionOk({ cfsId, message: 'Triage saved.' });
  } catch (error) {
    console.error('triageCfsAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to triage the call.');
  }
}

export async function verifyCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        verification_status: enumWithDefault(VERIFICATION_STATUS_OPTIONS, 'pending'),
        verification_method: enumWithDefault(VERIFICATION_METHOD_OPTIONS, 'none_required'),
        verification_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      cfs_id: cfsId,
      verification_status: status,
      verification_method: method,
      verification_notes: notes,
    } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canTriageCfs) {
      return actionError('You do not have permission to verify this call.');
    }

    const verifyResult = await supabase.schema('case_mgmt').rpc('cfs_verify', {
      p_cfs_id: cfsId,
      p_status: status,
      p_method: method,
      p_notes: notes ?? '',
    });
    assertRpcOk(verifyResult, 'cfs_verify');

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
    return actionOk({ cfsId, message: 'Verification saved.' });
  } catch (error) {
    console.error('verifyCfsAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to update verification.');
  }
}

export async function dismissCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        report_status: enumWithDefault(REPORT_STATUS_OPTIONS, 'resolved'),
        resolution_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, report_status: reportStatus, resolution_notes: notes } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return actionError('You do not have permission to close this call.');
    }

    const dismissResult = await supabase.schema('case_mgmt').rpc('cfs_dismiss', {
      p_cfs_id: cfsId,
      p_report_status: reportStatus,
      p_notes: notes,
    });
    assertRpcOk(dismissResult, 'cfs_dismiss');

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
    return actionOk({ cfsId, message: 'Call closed.' });
  } catch (error) {
    console.error('dismissCfsAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to close the call.');
  }
}

export async function markDuplicateCfsAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        duplicate_of_report_id: requiredId('Duplicate report is required.'),
        duplicate_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, duplicate_of_report_id: duplicateOf, duplicate_notes: notes } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return actionError('You do not have permission to mark duplicates.');
    }

    const duplicateResult = await supabase.schema('case_mgmt').rpc('cfs_mark_duplicate', {
      p_cfs_id: cfsId,
      p_duplicate_of: duplicateOf,
      p_notes: notes,
    });
    assertRpcOk(duplicateResult, 'cfs_mark_duplicate');

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
    return actionOk({ cfsId, message: 'Marked as duplicate.' });
  } catch (error) {
    console.error('markDuplicateCfsAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to mark duplicate.');
  }
}

export async function convertCfsToIncidentAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        incident_type: enumOrUndefined(INCIDENT_TYPE_OPTIONS),
        incident_description: zodOptionalString(),
        incident_status: zodOptionalString(),
        dispatch_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      cfs_id: cfsId,
      incident_type: incidentType,
      incident_description: description,
      incident_status: incidentStatus,
      dispatch_notes: dispatchNotes,
    } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canDispatchCfs) {
      return actionError('You do not have permission to dispatch this call.');
    }

    const payload: Record<string, unknown> = {
      incident_type: incidentType,
      description,
      status: incidentStatus,
      phase_notes: dispatchNotes ?? undefined,
    };

    const convertResult = await supabase
      .schema('case_mgmt')
      .rpc('cfs_convert_to_incident', { p_cfs_id: cfsId, p_payload: payload });
    assertRpcOk(convertResult, 'cfs_convert_to_incident');

    const incidentNumeric = Number(convertResult.data);
    if (!incidentNumeric) {
      throw new Error('Unable to convert call.');
    }

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
    return actionOk({ cfsId, incidentId: incidentNumeric, message: 'Converted to incident.' });
  } catch (error) {
    console.error('convertCfsToIncidentAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to convert to incident.');
  }
}

export async function shareCfsWithOrgAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        organization_id: requiredId('Organization is required.'),
        access_level: enumWithDefault(CFS_ACCESS_LEVEL_OPTIONS, 'view'),
        share_reason: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      cfs_id: cfsId,
      organization_id: orgId,
      access_level: accessLevel,
      share_reason: reason,
    } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canShareCfs) {
      return actionError('You do not have permission to share this call.');
    }

    const grantResult = await supabase.schema('case_mgmt').rpc('cfs_grant_org_access', {
      p_cfs_id: cfsId,
      p_org_id: orgId,
      p_access_level: accessLevel,
      p_reason: reason ?? undefined,
    });
    assertRpcOk(grantResult, 'cfs_grant_org_access');

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_shared',
      entityType: 'case_mgmt.cfs_org_access',
      entityRef: null,
      meta: { cfs_id: cfsId, organization_id: orgId, access_level: accessLevel },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({ cfsId, message: 'Organization added.' });
  } catch (error) {
    console.error('shareCfsWithOrgAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to share this call.');
  }
}

export async function revokeCfsOrgAccessAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        organization_id: requiredId('Organization is required.'),
        revoke_reason: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, organization_id: orgId, revoke_reason: reason } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canShareCfs) {
      return actionError('You do not have permission to revoke access.');
    }

    const revokeResult = await supabase.schema('case_mgmt').rpc('cfs_revoke_org_access', {
      p_cfs_id: cfsId,
      p_org_id: orgId,
      p_reason: reason ?? undefined,
    });
    assertRpcOk(revokeResult, 'cfs_revoke_org_access');

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_share_revoked',
      entityType: 'case_mgmt.cfs_org_access',
      entityRef: null,
      meta: { cfs_id: cfsId, organization_id: orgId },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({ cfsId, message: 'Access revoked.' });
  } catch (error) {
    console.error('revokeCfsOrgAccessAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to revoke access.');
  }
}

export async function transferCfsOwnershipAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        organization_id: requiredId('Organization is required.'),
        transfer_reason: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, organization_id: orgId, transfer_reason: reason } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canDispatchCfs) {
      return actionError('You do not have permission to transfer ownership.');
    }

    const transferResult = await supabase.schema('case_mgmt').rpc('cfs_transfer_ownership', {
      p_cfs_id: cfsId,
      p_new_org_id: orgId,
      p_reason: reason ?? undefined,
    });
    assertRpcOk(transferResult, 'cfs_transfer_ownership');

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_transfer_ownership',
      entityType: 'case_mgmt.calls_for_service',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'calls_for_service', id: cfsId }),
      meta: { new_org_id: orgId, reason },
    });

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(CFS_LIST_PATH);
    return actionOk({ cfsId, message: 'Ownership transferred.' });
  } catch (error) {
    console.error('transferCfsOwnershipAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to transfer ownership.');
  }
}

export async function enablePublicTrackingAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        public_category: enumOrUndefined(PUBLIC_CATEGORY_OPTIONS),
        public_location_area: zodOptionalString(),
        public_summary: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      cfs_id: cfsId,
      public_category: category,
      public_location_area: publicLocation,
      public_summary: publicSummary,
    } = parsed.data;

    if (!category || !publicLocation) {
      const fieldErrors: Record<string, string> = {};
      if (!category) fieldErrors.public_category = 'Select a public category.';
      if (!publicLocation) fieldErrors.public_location_area = 'Provide a public location.';
      return actionError('Provide a public category and location.', fieldErrors);
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canPublicTrackCfs) {
      return actionError('You do not have permission to update public tracking.');
    }

    const trackingResult = await supabase.schema('case_mgmt').rpc('cfs_public_tracking_upsert', {
      p_cfs_id: cfsId,
      p_category: category,
      p_public_location_area: publicLocation,
      p_public_summary: publicSummary ?? undefined,
    });

    assertRpcOk(trackingResult, 'cfs_public_tracking_upsert');

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({
      cfsId,
      trackingId: trackingResult.data ?? undefined,
      message: 'Public tracking enabled.',
    });
  } catch (error) {
    console.error('enablePublicTrackingAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to enable tracking.');
  }
}

export async function disablePublicTrackingAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canPublicTrackCfs) {
      return actionError('You do not have permission to update public tracking.');
    }

    const disableResult = await supabase
      .schema('case_mgmt')
      .rpc('cfs_public_tracking_disable', { p_cfs_id: cfsId });
    assertRpcOk(disableResult, 'cfs_public_tracking_disable');

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({ cfsId, message: 'Public tracking disabled.' });
  } catch (error) {
    console.error('disablePublicTrackingAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to disable tracking.');
  }
}

export async function addCfsNoteAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        note: zodRequiredString('Add a brief note (at least 4 characters).', { min: 4 }),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, note } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return actionError('You do not have permission to add notes.');
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
    return actionOk({ cfsId, message: 'Note added.' });
  } catch (error) {
    console.error('addCfsNoteAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to add note.');
  }
}

export async function updateCfsStatusAction(
  _prevState: CfsActionState,
  formData: FormData,
): Promise<CfsActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        status: enumWithDefault(CFS_STATUS_OPTIONS, 'received'),
        status_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, status, status_notes: notes } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return actionError('You do not have permission to update status.');
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
    return actionOk({ cfsId, message: `Status updated: ${formatCfsLabel(status)}.` });
  } catch (error) {
    console.error('updateCfsStatusAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to update status.');
  }
}

export async function uploadCfsAttachmentAction(
  _prevState: CfsAttachmentActionState,
  formData: FormData,
): Promise<CfsAttachmentActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        attachment_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, attachment_notes: notes } = parsed.data;
    const file = formData.get('attachment');

    if (!(file instanceof File)) {
      return actionError('Select a file to upload.', { attachment: 'Select a file to upload.' });
    }

    if (file.size > MAX_CFS_ATTACHMENT_BYTES) {
      return actionError('Attachment must be under 15 MB.', { attachment: 'Attachment must be under 15 MB.' });
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return actionError('You do not have permission to upload attachments.');
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
    return actionOk({ attachmentId: attachmentRow.id, message: 'Attachment uploaded.' });
  } catch (error) {
    console.error('uploadCfsAttachmentAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to upload attachment.');
  }
}

export async function deleteCfsAttachmentAction(formData: FormData): Promise<CfsAttachmentActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        attachment_id: zodRequiredString('Attachment is required.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, attachment_id: attachmentId } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canDeleteCfs) {
      return actionError('You do not have permission to delete attachments.');
    }

    const { data: attachment, error } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .select('id, storage_bucket, storage_path, file_name')
      .eq('id', attachmentId)
      .eq('cfs_id', cfsId)
      .maybeSingle();

    if (error || !attachment) {
      return actionError('Attachment not found.');
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
    return actionOk({ attachmentId, message: 'Attachment deleted.' });
  } catch (error) {
    console.error('deleteCfsAttachmentAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to delete attachment.');
  }
}
