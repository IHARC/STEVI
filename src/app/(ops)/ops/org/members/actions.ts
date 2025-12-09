'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';
import type { SupabaseServerClient } from '@/lib/supabase/types';

const MEMBERS_PATH = '/ops/org/members';

type ActionResult = { success: true } | { success: false; error: string };

type ToggleRolePayload = {
  profileId: string;
  roleName: 'portal_org_admin' | 'portal_org_rep';
  enable: boolean;
};

async function requireOrgAdminContext(targetOrgId: number | null) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  const canAdminAnyOrg = access.canAccessOpsAdmin;
  const orgId = targetOrgId ?? access.organizationId ?? null;

  if (!orgId) {
    throw new Error('Select an organization to manage.');
  }

  const canAdminThisOrg = canAdminAnyOrg || (access.canManageOrgUsers && access.organizationId === orgId);
  if (!canAdminThisOrg) {
    throw new Error('Organization admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);
  const portal = supabase.schema('portal');
  return { supabase, portal, actorProfile, orgId, canAdminAnyOrg }; 
}

async function setRole(
  supabase: SupabaseServerClient,
  payload: ToggleRolePayload,
) {
  const portal = supabase.schema('portal');
  const { error } = await portal.rpc('set_profile_role', {
    p_profile_id: payload.profileId,
    p_role_name: payload.roleName,
    p_enable: payload.enable,
  });

  if (error) {
    throw error;
  }
}

export async function toggleMemberRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    const roleName = formData.get('role_name');
    const enableValue = formData.get('enable');

    if (typeof profileId !== 'string' || typeof roleName !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid form data.');
    }

    const enable = enableValue === 'true';
    if (roleName !== 'portal_org_admin' && roleName !== 'portal_org_rep') {
      throw new Error('Unsupported role.');
    }

    const orgIdValue = formData.get('organization_id');
    const parsedOrgId = typeof orgIdValue === 'string' ? Number.parseInt(orgIdValue, 10) : null;
    const { supabase, portal, actorProfile, orgId, canAdminAnyOrg } = await requireOrgAdminContext(
      Number.isFinite(parsedOrgId) ? parsedOrgId : null,
    );

    const { data: member, error: memberError } = await portal
      .from('profiles')
      .select('id, organization_id, user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (memberError || !member) {
      throw memberError ?? new Error('Member not found.');
    }

    if (!canAdminAnyOrg && member.organization_id !== orgId) {
      throw new Error('You can only manage members in your organization.');
    }

    await setRole(supabase, { profileId, roleName: roleName as ToggleRolePayload['roleName'], enable });

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: enable ? 'org_role_granted' : 'org_role_revoked',
    entityType: 'profile',
    entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
    meta: { role: roleName, organization_id: orgId },
  });

    await revalidatePath(MEMBERS_PATH);

    return { success: true };
  } catch (error) {
    console.error('toggleMemberRoleAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to update member.';
    return { success: false, error: message };
  }
}

export async function removeMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    if (typeof profileId !== 'string') {
      throw new Error('Missing member id.');
    }

    const orgIdValue = formData.get('organization_id');
    const parsedOrgId = typeof orgIdValue === 'string' ? Number.parseInt(orgIdValue, 10) : null;
    const { supabase, portal, actorProfile, orgId, canAdminAnyOrg } = await requireOrgAdminContext(
      Number.isFinite(parsedOrgId) ? parsedOrgId : null,
    );

    const { data: member, error: memberError } = await portal
      .from('profiles')
      .select('id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (memberError || !member) {
      throw memberError ?? new Error('Member not found.');
    }

    if (!canAdminAnyOrg && member.organization_id !== orgId) {
      throw new Error('You can only remove members from your organization.');
    }

    const now = new Date().toISOString();

    for (const roleName of ['portal_org_admin', 'portal_org_rep'] as const) {
      try {
        await setRole(supabase, { profileId, roleName, enable: false });
      } catch (roleError) {
        console.warn(`Failed to revoke ${roleName} role when removing member`, roleError);
      }
    }

    const clearOrg = await portal
      .from('profiles')
      .update({ organization_id: null, updated_at: now })
      .eq('id', profileId);
    if (clearOrg.error) throw clearOrg.error;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'org_member_removed',
    entityType: 'profile',
    entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
    meta: { organization_id: orgId },
  });

    await revalidatePath(MEMBERS_PATH);

    return { success: true };
  } catch (error) {
    console.error('removeMemberAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to remove member.';
    return { success: false, error: message };
  }
}
