'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PUBLIC_CATEGORY_OPTIONS } from '@/lib/cfs/constants';
import { actionError, actionOk, parseFormData, zodOptionalString } from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
import { CfsActionState, cfsDetailPath, enumOrUndefined, loadActionAccess, requiredId } from './shared';

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
