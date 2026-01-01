'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CFS_ACCESS_LEVEL_OPTIONS } from '@/lib/cfs/constants';
import { actionError, actionOk, parseFormData, zodOptionalString } from '@/lib/server-actions/validate';
import { assertRpcOk } from '@/lib/supabase/guards';
import {
  CFS_LIST_PATH,
  CfsActionState,
  cfsDetailPath,
  enumWithDefault,
  loadActionAccess,
  requiredId,
} from './shared';

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

    revalidatePath(cfsDetailPath(cfsId));
    revalidatePath(CFS_LIST_PATH);
    return actionOk({ cfsId, message: 'Ownership transferred.' });
  } catch (error) {
    console.error('transferCfsOwnershipAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to transfer ownership.');
  }
}
