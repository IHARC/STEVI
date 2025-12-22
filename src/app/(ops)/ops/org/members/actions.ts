'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';
import type { SupabaseServerClient } from '@/lib/supabase/types';

const membersPath = (organizationId: number) => `/ops/organizations/${organizationId}`;

type ActionResult = { success: true } | { success: false; error: string };

type ToggleRolePayload = {
  profileId: string;
  orgRoleId: string;
  enable: boolean;
};

async function requireOrgAdminContext(targetOrgId: number | null) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  const isIharcAdmin = access.isGlobalAdmin;
  const orgId = isIharcAdmin ? (targetOrgId ?? access.organizationId ?? null) : access.organizationId ?? null;

  if (!orgId) {
    throw new Error('Select an organization to manage.');
  }

  const canAdminThisOrg = isIharcAdmin || (access.canManageOrgUsers && access.organizationId === orgId);
  if (!canAdminThisOrg) {
    throw new Error('Organization admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);
  const portal = supabase.schema('portal');
  return { supabase, portal, actorProfile, orgId, isIharcAdmin, access };
}

async function setRole(
  supabase: SupabaseServerClient,
  payload: ToggleRolePayload & { userId: string; organizationId: number; actorId: string },
) {
  const core = supabase.schema('core');
  if (payload.enable) {
    const { error } = await core
      .from('user_org_roles')
      .insert({
        user_id: payload.userId,
        organization_id: payload.organizationId,
        org_role_id: payload.orgRoleId,
        granted_by: payload.actorId,
      }, { onConflict: 'user_id,organization_id,org_role_id' });
    if (error) throw error;
    return;
  }

  const { error } = await core
    .from('user_org_roles')
    .delete()
    .match({ user_id: payload.userId, organization_id: payload.organizationId, org_role_id: payload.orgRoleId });

  if (error) {
    throw error;
  }
}

export async function toggleMemberRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    const orgRoleId = formData.get('org_role_id');
    const enableValue = formData.get('enable');

    if (typeof profileId !== 'string' || typeof orgRoleId !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid form data.');
    }

    const enable = enableValue === 'true';

    const orgIdValue = formData.get('organization_id');
    const parsedOrgId = typeof orgIdValue === 'string' ? Number.parseInt(orgIdValue, 10) : null;
    const { supabase, portal, actorProfile, orgId, isIharcAdmin, access } = await requireOrgAdminContext(
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

    if (!isIharcAdmin && member.organization_id !== orgId) {
      throw new Error('You can only manage members in your organization.');
    }

    const { data: orgRole, error: orgRoleError } = await supabase
      .schema('core')
      .from('org_roles')
      .select('id, organization_id, name')
      .eq('id', orgRoleId)
      .maybeSingle();
    if (orgRoleError || !orgRole) {
      throw orgRoleError ?? new Error('Role not found.');
    }
    if (orgRole.organization_id !== orgId) {
      throw new Error('Role does not belong to this organization.');
    }

    await setRole(supabase, {
      profileId,
      orgRoleId: orgRoleId,
      enable,
      userId: member.user_id,
      organizationId: orgId,
      actorId: access.userId,
    });

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: enable ? 'org_role_granted' : 'org_role_revoked',
    entityType: 'profile',
    entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
    meta: { role_id: orgRoleId, organization_id: orgId },
  });

    await revalidatePath(membersPath(orgId));

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
    const { supabase, portal, actorProfile, orgId, isIharcAdmin } = await requireOrgAdminContext(
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

    if (!isIharcAdmin && member.organization_id !== orgId) {
      throw new Error('You can only remove members from your organization.');
    }

    const now = new Date().toISOString();

    const { error: deleteRolesError } = await supabase
      .schema('core')
      .from('user_org_roles')
      .delete()
      .match({ user_id: member.user_id, organization_id: orgId });
    if (deleteRolesError) {
      throw deleteRolesError;
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

    await revalidatePath(membersPath(orgId));

    return { success: true };
  } catch (error) {
    console.error('removeMemberAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to remove member.';
    return { success: false, error: message };
  }
}
