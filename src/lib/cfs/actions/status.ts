'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected } from '@/lib/portal-access';
import { CFS_STATUS_OPTIONS, formatCfsLabel } from '@/lib/cfs/constants';
import {
  actionError,
  actionOk,
  parseFormData,
  zodOptionalString,
  zodRequiredString,
} from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
import {
  CfsActionState,
  cfsDetailPath,
  enumWithDefault,
  loadActionAccess,
  requiredId,
} from './shared';

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

  const addResult = await supabase.schema('case_mgmt').rpc('cfs_add_note', {
    p_cfs_id: cfsId,
    p_note: note,
  });
    assertRpcOk(addResult, 'cfs_add_note');

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

    const updateResult = await supabase.schema('case_mgmt').rpc('cfs_update_status', {
      p_cfs_id: cfsId,
      p_status: status,
      p_notes: notes ?? undefined,
    });
    assertRpcOk(updateResult, 'cfs_update_status');

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({ cfsId, message: `Status updated: ${formatCfsLabel(status)}.` });
  } catch (error) {
    console.error('updateCfsStatusAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to update status.');
  }
}
