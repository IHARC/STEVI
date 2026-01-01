'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected } from '@/lib/portal-access';
import {
  CFS_ORIGIN_OPTIONS,
  CFS_SOURCE_OPTIONS,
  INCIDENT_PRIORITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  NOTIFY_CHANNEL_OPTIONS,
  PUBLIC_CATEGORY_OPTIONS,
  REPORT_METHOD_OPTIONS,
  REPORT_PRIORITY_OPTIONS,
} from '@/lib/cfs/constants';
import {
  actionError,
  parseFormData,
  zodBoolean,
  zodOptionalNumber,
  zodOptionalString,
  zodRequiredString,
} from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
import {
  CFS_LIST_PATH,
  CfsActionState,
  cfsDetailPath,
  enumOrUndefined,
  enumWithDefault,
  loadActionAccess,
  normalizeNotifyTarget,
  parseOptionalDatetime,
  parseUrgencyIndicators,
} from './shared';
import { maybeNotifyReporter } from './notifications';

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
      public_tracking_enabled: publicTrackingEnabled,
      public_category: publicCategory ?? null,
      public_location_area: publicLocation ?? null,
      public_summary: publicSummary ?? null,
    };

    const createResult = await supabase.schema('case_mgmt').rpc('cfs_create_call', { p_payload: payload });
    assertRpcOk(createResult, 'cfs_create_call');

    const response = createResult.data as { call_id?: number | string; tracking_id?: string | null } | null;
    const cfsId = response?.call_id ? Number(response.call_id) : Number.NaN;
    if (!cfsId || Number.isNaN(cfsId)) {
      throw new Error('Unable to create the call.');
    }

    if (notifyOptIn && notifyChannel !== 'none' && notifyTarget) {
      await maybeNotifyReporter(
        supabase,
        cfsId,
        {
          subject: `Request received (${cfsId})`,
          bodyText: `We have received your request and our outreach team is reviewing it.\n\nTracking ID: ${cfsId}`,
          bodySms: `Request received. Tracking ID ${cfsId}.`,
          type: 'cfs_received',
        },
        { actorProfileId: access.profile.id },
      );
    }

    revalidatePath(CFS_LIST_PATH);
    redirect(cfsDetailPath(cfsId));
  } catch (error) {
    console.error('createCfsCallAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to create the call.');
  }
}
