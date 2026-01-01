'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  INCIDENT_TYPE_OPTIONS,
  REPORT_STATUS_OPTIONS,
  formatReportStatus,
} from '@/lib/cfs/constants';
import { actionError, actionOk, parseFormData, zodOptionalString } from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
import {
  CFS_LIST_PATH,
  CfsActionState,
  cfsDetailPath,
  enumOrUndefined,
  enumWithDefault,
  incidentDetailPath,
  loadActionAccess,
  requiredId,
} from './shared';
import { maybeNotifyReporter } from './notifications';

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

    await maybeNotifyReporter(
      supabase,
      cfsId,
      {
        subject: `Request closed (${cfsId})`,
        bodyText: `Your request has been closed with status: ${formatReportStatus(reportStatus)}.`,
        bodySms: `Your request has been closed (${formatReportStatus(reportStatus)}).`,
        type: 'cfs_closed',
      },
      { actorProfileId: access.profile.id },
    );

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

    await maybeNotifyReporter(
      supabase,
      cfsId,
      {
        subject: `Request merged (${cfsId})`,
        bodyText:
          'Your request was merged with an existing report. The outreach team is continuing follow-up on the original request.',
        bodySms: 'Your request was merged with an existing report. We are continuing follow-up.',
        type: 'cfs_duplicate',
      },
      { actorProfileId: access.profile.id },
    );

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

    await maybeNotifyReporter(
      supabase,
      cfsId,
      {
        subject: `Request dispatched (${cfsId})`,
        bodyText: 'Your request has been dispatched to an outreach team. We will follow up once there is an update.',
        bodySms: 'Your request has been dispatched to an outreach team.',
        type: 'cfs_dispatched',
      },
      { actorProfileId: access.profile.id },
    );

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(incidentDetailPath(incidentNumeric));
    return actionOk({ cfsId, incidentId: incidentNumeric, message: 'Converted to incident.' });
  } catch (error) {
    console.error('convertCfsToIncidentAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to convert to incident.');
  }
}
