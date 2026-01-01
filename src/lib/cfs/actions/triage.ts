'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  INCIDENT_PRIORITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  REPORT_PRIORITY_OPTIONS,
  VERIFICATION_METHOD_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
} from '@/lib/cfs/constants';
import { actionError, actionOk, parseFormData, zodOptionalString } from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
import { CfsActionState, cfsDetailPath, enumOrUndefined, enumWithDefault, loadActionAccess, parseUrgencyIndicators, requiredId } from './shared';
import { maybeNotifyReporter } from './notifications';

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
