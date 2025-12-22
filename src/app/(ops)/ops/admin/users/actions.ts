'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import type { Database } from '@/types/supabase';
import {
  loadProfileEnums,
  normalizeOrganizationId,
  parseAffiliationStatus,
  parseAffiliationType,
  parseGovernmentRole,
} from '@/lib/admin-users';

const LIST_ROOT = '/ops/admin/users';
const SEGMENT_PATHS = ['/ops/admin/users/all', '/ops/admin/users/clients', '/ops/admin/users/partners', '/ops/admin/users/staff'] as const;

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };
type OrgRoleLookup = Pick<Database['core']['Tables']['org_roles']['Row'], 'id' | 'organization_id' | 'name'>;

const SAFE_ERROR_MESSAGES = new Set([
  'Sign in to continue.',
  'Admin access is required.',
  'Elevated admin access is required.',
  'Profile approval required.',
  'Profile context is missing.',
  'Profile context is required.',
  'Invalid role request.',
  'Unsupported role change request.',
  'Select an organization to continue.',
  'Provide a valid email.',
  'Profile not found.',
  'At least one IHARC admin is required.',
  'At least one org admin is required.',
]);

function getErrorMessage(error: unknown): string {
  const candidate = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  if (candidate && SAFE_ERROR_MESSAGES.has(candidate)) {
    return candidate;
  }
  return 'Unable to complete that request right now. Please try again or contact support.';
}

async function revalidateUserPaths(profileId?: string) {
  const targets = new Set<string>([LIST_ROOT, ...SEGMENT_PATHS]);
  if (profileId) {
    targets.add(`${LIST_ROOT}/profile/${profileId}`);
  }
  await Promise.all(Array.from(targets).map((path) => revalidatePath(path)));
}

function hasElevatedAdmin(access: Awaited<ReturnType<typeof loadPortalAccess>>): boolean {
  if (!access) return false;
  return access.isGlobalAdmin;
}

function hasOrgAdmin(access: Awaited<ReturnType<typeof loadPortalAccess>>): boolean {
  if (!access) return false;
  return access.canManageOrgUsers;
}

async function requireAdminContext({ requireElevated = false, allowOrgAdmin = false }: { requireElevated?: boolean; allowOrgAdmin?: boolean } = {}) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.isProfileApproved) {
    throw new Error('Profile approval required.');
  }

  if (!access.canAccessOpsAdmin) {
    throw new Error('Admin access is required.');
  }

  if (requireElevated && !hasElevatedAdmin(access)) {
    throw new Error('Elevated admin access is required.');
  }

  if (!requireElevated && allowOrgAdmin && !(hasElevatedAdmin(access) || hasOrgAdmin(access))) {
    throw new Error('Admin access is required.');
  }

  if (!hasElevatedAdmin(access) && allowOrgAdmin && !access.organizationId) {
    throw new Error('Select an organization to continue.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, actorProfile, access };
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    if (typeof profileId !== 'string' || !profileId) {
      throw new Error('Profile context is missing.');
    }

    const { supabase, actorProfile, access } = await requireAdminContext({ allowOrgAdmin: true });
    const profileEnums = await loadProfileEnums(supabase);

    const displayName = formData.get('display_name');
    const positionTitle = formData.get('position_title');
    const affiliationType = parseAffiliationType(formData.get('affiliation_type') as string | null, profileEnums);
    const affiliationStatus = parseAffiliationStatus(formData.get('affiliation_status') as string | null, profileEnums);
    const organizationId = normalizeOrganizationId(formData.get('organization_id'));
    const governmentRole = parseGovernmentRole(formData.get('government_role_type') as string | null, profileEnums);
    const portal = supabase.schema('portal');

    const updates: Record<string, unknown> = {};
    if (typeof displayName === 'string') updates.display_name = displayName.trim();
    if (typeof positionTitle === 'string') updates.position_title = positionTitle.trim() || null;
    if (affiliationType) updates.affiliation_type = affiliationType;
    if (affiliationStatus) updates.affiliation_status = affiliationStatus;
    updates.organization_id = organizationId;
    updates.government_role_type = governmentRole;

    const { data: existing, error: fetchError } = await portal
      .from('profiles')
      .select('user_id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    const isElevated = hasElevatedAdmin(access);
    const isOrgAdmin = hasOrgAdmin(access);
    if (!isElevated) {
      if (!isOrgAdmin || !access.organizationId) {
        throw new Error('Elevated admin access is required.');
      }
      if (!existing?.organization_id || existing.organization_id !== access.organizationId) {
        throw new Error('Elevated admin access is required.');
      }
      if (organizationId !== access.organizationId) {
        throw new Error('Elevated admin access is required.');
      }
    }

    const { error: updateError } = await portal.from('profiles').update(updates).eq('id', profileId);
    if (updateError) {
      throw updateError;
    }

    if (existing?.user_id && existing.organization_id && existing.organization_id !== organizationId) {
      const { error: roleError } = await supabase
        .schema('core')
        .from('user_org_roles')
        .delete()
        .match({ user_id: existing.user_id, organization_id: existing.organization_id });
      if (roleError) {
        console.warn('Failed to clear org roles after org change', roleError);
      }
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_user_updated',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
      meta: updates,
    });

    await revalidateUserPaths(profileId);

    return { success: true };
  } catch (error) {
    console.error('updateProfileAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function toggleGlobalRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    const roleName = formData.get('role_name');
    const enableValue = formData.get('enable');

    if (typeof profileId !== 'string' || typeof roleName !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid role request.');
    }

    const enable = enableValue === 'true';

    const { supabase, actorProfile, access } = await requireAdminContext({ requireElevated: true });
    const portal = supabase.schema('portal');

    const { data: profileRow, error: profileError } = await portal
      .from('profiles')
      .select('user_id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error('Profile not found.');
    }

    const { data: globalRole, error: roleError } = await supabase
      .schema('core')
      .from('global_roles')
      .select('id, name')
      .eq('name', roleName)
      .maybeSingle();

    if (roleError || !globalRole) {
      throw roleError ?? new Error('Unsupported role change request.');
    }

    if (!profileRow.user_id) {
      throw new Error('Profile not found.');
    }

    const globalRoles = supabase.schema('core').from('user_global_roles');
    if (!enable && globalRole.name === 'iharc_admin') {
      const { count, error: countError } = await globalRoles
        .select('id', { count: 'exact', head: true })
        .eq('role_id', globalRole.id);
      if (countError) {
        throw countError;
      }
      if ((count ?? 0) <= 1) {
        throw new Error('At least one IHARC admin is required.');
      }
    }
    const { error } = enable
      ? await globalRoles.insert({ user_id: profileRow.user_id, role_id: globalRole.id, granted_by: access.userId }, { onConflict: 'user_id,role_id' })
      : await globalRoles.delete().match({ user_id: profileRow.user_id, role_id: globalRole.id });

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'admin_role_granted' : 'admin_role_revoked',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
      meta: { role: roleName },
    });

    await revalidateUserPaths(profileId);

    return { success: true };
  } catch (error) {
    console.error('toggleGlobalRoleAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function toggleOrgRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    const roleId = formData.get('org_role_id');
    const roleName = formData.get('role_name');
    const organizationIdValue = formData.get('organization_id');
    const enableValue = formData.get('enable');

    if (typeof profileId !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid role request.');
    }

    const enable = enableValue === 'true';
    const organizationId =
      typeof organizationIdValue === 'string' && organizationIdValue
        ? Number.parseInt(organizationIdValue, 10)
        : null;

    if (!organizationId || Number.isNaN(organizationId)) {
      throw new Error('Select an organization to continue.');
    }

    const { supabase, actorProfile, access } = await requireAdminContext({ allowOrgAdmin: true });
    const portal = supabase.schema('portal');

    const { data: profileRow, error: profileError } = await portal
      .from('profiles')
      .select('user_id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error('Profile not found.');
    }

    if (!profileRow.user_id) {
      throw new Error('Profile not found.');
    }

    const isElevated = hasElevatedAdmin(access);
    if (!isElevated) {
      if (!access.organizationId || access.organizationId !== organizationId) {
        throw new Error('Elevated admin access is required.');
      }
      if (profileRow.organization_id !== organizationId) {
        throw new Error('Elevated admin access is required.');
      }
    }

    const orgRoles = supabase.schema('core').from('org_roles');
    let orgRole: OrgRoleLookup | null = null;

    if (typeof roleId === 'string' && roleId) {
      const { data, error } = await orgRoles
        .select('id, organization_id, name')
        .eq('id', roleId)
        .maybeSingle();
      if (error) throw error;
      orgRole = (data as OrgRoleLookup | null) ?? null;
    } else if (typeof roleName === 'string' && roleName) {
      const { data, error } = await orgRoles
        .select('id, organization_id, name')
        .eq('name', roleName)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      orgRole = (data as OrgRoleLookup | null) ?? null;
    }

    if (!orgRole || orgRole.organization_id !== organizationId) {
      throw new Error('Unsupported role change request.');
    }

    const userOrgRoles = supabase.schema('core').from('user_org_roles');
    if (!enable && orgRole.name === 'org_admin') {
      const { count, error: countError } = await userOrgRoles
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('org_role_id', orgRole.id);
      if (countError) {
        throw countError;
      }
      if ((count ?? 0) <= 1) {
        throw new Error('At least one org admin is required.');
      }
    }
    const { error } = enable
      ? await userOrgRoles.insert({ user_id: profileRow.user_id, organization_id: organizationId, org_role_id: orgRole.id, granted_by: access.userId }, { onConflict: 'user_id,organization_id,org_role_id' })
      : await userOrgRoles.delete().match({ user_id: profileRow.user_id, organization_id: organizationId, org_role_id: orgRole.id });

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'admin_role_granted' : 'admin_role_revoked',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
      meta: { role: orgRole.name, organizationId },
    });

    await revalidateUserPaths(profileId);

    return { success: true };
  } catch (error) {
    console.error('toggleOrgRoleAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function archiveUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    if (typeof profileId !== 'string' || !profileId) {
      throw new Error('Profile context is required.');
    }

    const { supabase, actorProfile, access } = await requireAdminContext({ allowOrgAdmin: true });
    const portal = supabase.schema('portal');

    const { data: profileRow, error: profileError } = await portal
      .from('profiles')
      .select('user_id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error('Profile not found.');
    }

    const isElevated = hasElevatedAdmin(access);
    const isOrgAdmin = hasOrgAdmin(access);
    if (!isElevated) {
      if (!isOrgAdmin || !access.organizationId || access.organizationId !== profileRow.organization_id) {
        throw new Error('Elevated admin access is required.');
      }
      if (profileRow.user_id) {
        const { data: globalRoleRows, error: rolesError } = await supabase
          .schema('core')
          .from('user_global_roles')
          .select('global_roles:global_roles!inner(name)')
          .eq('user_id', profileRow.user_id);
        if (rolesError) throw rolesError;
        const targetRoles = new Set((globalRoleRows ?? []).map((r: { global_roles: { name: string } | null }) => r.global_roles?.name));
        if (targetRoles.has('iharc_admin')) {
          throw new Error('Elevated admin access is required.');
        }
      }
    }

    const now = new Date().toISOString();

    const { error: updateError } = await portal
      .from('profiles')
      .update({
        affiliation_status: 'revoked',
        organization_id: null,
        government_role_type: null,
        updated_at: now,
      })
      .eq('id', profileId);

    if (updateError) {
      throw updateError;
    }

    if (profileRow.user_id) {
      const userOrgRoles = supabase.schema('core').from('user_org_roles');
      if (isElevated) {
        await userOrgRoles.delete().match({ user_id: profileRow.user_id });
        await supabase.schema('core').from('user_global_roles').delete().match({ user_id: profileRow.user_id });
      } else if (profileRow.organization_id) {
        await userOrgRoles.delete().match({ user_id: profileRow.user_id, organization_id: profileRow.organization_id });
      }
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_user_archived',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
    });

    await revalidateUserPaths(profileId);

    return { success: true };
  } catch (error) {
    console.error('archiveUserAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendInviteAction(formData: FormData): Promise<ActionResult> {
  try {
    const email = formData.get('invite_email');
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Provide a valid email.');
    }

    const { supabase, actorProfile, access } = await requireAdminContext({ allowOrgAdmin: true });
    const profileEnums = await loadProfileEnums(supabase);

    const displayName = (formData.get('invite_display_name') as string | null) ?? null;
    const positionTitle = (formData.get('invite_position_title') as string | null) ?? null;
    const affiliationType =
      parseAffiliationType(formData.get('invite_affiliation_type') as string | null, profileEnums) ?? 'client';
    const organizationId = normalizeOrganizationId(formData.get('invite_organization_id'));
    const message = (formData.get('invite_message') as string | null) ?? null;

    const isElevated = hasElevatedAdmin(access);
    const isOrgAdmin = hasOrgAdmin(access);
    if (!isElevated) {
      if (!isOrgAdmin || !access.organizationId || access.organizationId !== organizationId) {
        throw new Error('Elevated admin access is required.');
      }
    }

    const response = await supabase.functions.invoke('portal-admin-invite', {
      body: {
        email,
        displayName,
        positionTitle,
        affiliationType,
        organizationId,
        message,
        actorProfileId: actorProfile.id,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to send invite.');
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'admin_invite_sent',
      entityType: 'profile_invite',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profile_invites', id: email }),
      meta: { email, affiliationType, organizationId },
    });

    await revalidateUserPaths();

    return { success: true };
  } catch (error) {
    console.error('sendInviteAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
