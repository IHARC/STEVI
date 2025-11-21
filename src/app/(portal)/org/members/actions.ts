'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent } from '@/lib/audit';
import type { SupabaseServerClient } from '@/lib/supabase/types';

const MEMBERS_PATH = '/org/members';

type ActionResult = { success: true } | { success: false; error: string };

type ToggleRolePayload = {
  profileId: string;
  roleName: 'org_admin' | 'org_rep';
  enable: boolean;
};

async function requireOrgAdminContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to continue.');
  }

  const actorProfile = await ensurePortalProfile(supabase, user.id);
  if (actorProfile.role !== 'org_admin') {
    throw new Error('Organization admin access is required.');
  }

  if (!actorProfile.organization_id) {
    throw new Error('Your profile is not linked to an organization.');
  }

  const portal = supabase.schema('portal');
  return { supabase, portal, actorProfile };
}

async function upsertRoleAssignment(
  portal: ReturnType<SupabaseServerClient['schema']>,
  payload: ToggleRolePayload,
  actorProfileId: string,
) {
  const roleResponse = await portal.from('roles').select('id').eq('name', payload.roleName).maybeSingle();
  if (roleResponse.error || !roleResponse.data) {
    throw roleResponse.error ?? new Error('Role not found.');
  }

  const roleId = roleResponse.data.id;
  const now = new Date().toISOString();

  if (payload.enable) {
    const existing = await portal
      .from('profile_roles')
      .select('id, revoked_at')
      .eq('profile_id', payload.profileId)
      .eq('role_id', roleId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (!existing.data) {
      const insert = await portal.from('profile_roles').insert({
        profile_id: payload.profileId,
        role_id: roleId,
        granted_at: now,
        granted_by_profile_id: actorProfileId,
      });
      if (insert.error) throw insert.error;
    } else if (existing.data.revoked_at) {
      const restore = await portal
        .from('profile_roles')
        .update({
          revoked_at: null,
          revoked_by_profile_id: null,
          reason: null,
          updated_at: now,
          granted_at: now,
          granted_by_profile_id: actorProfileId,
        })
        .eq('id', existing.data.id);
      if (restore.error) throw restore.error;
    }
  } else {
    const revoke = await portal
      .from('profile_roles')
      .update({
        revoked_at: now,
        revoked_by_profile_id: actorProfileId,
        updated_at: now,
      })
      .eq('profile_id', payload.profileId)
      .eq('role_id', roleId)
      .is('revoked_at', null);
    if (revoke.error) throw revoke.error;
  }
}

function normalizeProfileRole(roleName: 'org_admin' | 'org_rep', enable: boolean, currentRole: string | null) {
  if (!enable) {
    if (currentRole === roleName) {
      return 'user';
    }
    return currentRole ?? 'user';
  }
  return roleName;
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
    if (roleName !== 'org_admin' && roleName !== 'org_rep') {
      throw new Error('Unsupported role.');
    }

    const { supabase, portal, actorProfile } = await requireOrgAdminContext();

    const { data: member, error: memberError } = await portal
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', profileId)
      .maybeSingle();

    if (memberError || !member) {
      throw memberError ?? new Error('Member not found.');
    }

    if (member.organization_id !== actorProfile.organization_id) {
      throw new Error('You can only manage members in your organization.');
    }

    await upsertRoleAssignment(portal, { profileId, roleName: roleName as ToggleRolePayload['roleName'], enable }, actorProfile.id);

    const nextRole = normalizeProfileRole(roleName as ToggleRolePayload['roleName'], enable, member.role);
    if (nextRole !== member.role) {
      const roleUpdate = await portal
        .from('profiles')
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq('id', profileId);
      if (roleUpdate.error) throw roleUpdate.error;
    }

    await supabase.rpc('portal_refresh_profile_claims', { p_profile_id: profileId }).catch(() => undefined);

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'org_role_granted' : 'org_role_revoked',
      entityType: 'profile',
      entityId: profileId,
      meta: { role: roleName, organization_id: actorProfile.organization_id },
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

    const { supabase, portal, actorProfile } = await requireOrgAdminContext();

    const { data: member, error: memberError } = await portal
      .from('profiles')
      .select('id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (memberError || !member) {
      throw memberError ?? new Error('Member not found.');
    }

    if (member.organization_id !== actorProfile.organization_id) {
      throw new Error('You can only remove members from your organization.');
    }

    const now = new Date().toISOString();

    for (const roleName of ['org_admin', 'org_rep'] as const) {
      try {
        await upsertRoleAssignment(
          portal,
          { profileId, roleName, enable: false },
          actorProfile.id,
        );
      } catch (roleError) {
        console.warn(`Failed to revoke ${roleName} role when removing member`, roleError);
      }
    }

    const clearOrg = await portal
      .from('profiles')
      .update({ organization_id: null, role: 'user', updated_at: now })
      .eq('id', profileId);
    if (clearOrg.error) throw clearOrg.error;

    await supabase.rpc('portal_refresh_profile_claims', { p_profile_id: profileId }).catch(() => undefined);

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'org_member_removed',
      entityType: 'profile',
      entityId: profileId,
      meta: { organization_id: actorProfile.organization_id },
    });

    await revalidatePath(MEMBERS_PATH);

    return { success: true };
  } catch (error) {
    console.error('removeMemberAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to remove member.';
    return { success: false, error: message };
  }
}
