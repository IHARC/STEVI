'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import {
  loadProfileEnums,
  normalizeOrganizationId,
  parseAffiliationStatus,
  parseAffiliationType,
  parseGovernmentRole,
} from '@/lib/admin-users';
import { getIharcRoles, getPortalRoles } from '@/lib/enum-values';
import type { SupabaseServerClient } from '@/lib/supabase/types';

const LIST_ROOT = '/ops/hq/users';
const SEGMENT_PATHS = ['/ops/hq/users/all', '/ops/hq/users/clients', '/ops/hq/users/partners', '/ops/hq/users/staff'] as const;

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

const SAFE_ERROR_MESSAGES = new Set([
  'Sign in to continue.',
  'Admin access is required.',
  'Elevated admin access is required.',
  'Profile approval required.',
  'Profile context is missing.',
  'Profile context is required.',
  'Invalid role request.',
  'Unsupported role change request.',
  'Provide a valid email.',
  'Profile not found.',
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

async function loadAssignableRoles(supabase: SupabaseServerClient): Promise<Set<string>> {
  const [portalRoles, iharcRoles] = await Promise.all([
    getPortalRoles(supabase),
    getIharcRoles(supabase),
  ]);
  return new Set([...portalRoles, ...iharcRoles]);
}

function hasElevatedAdmin(access: Awaited<ReturnType<typeof loadPortalAccess>>): boolean {
  if (!access) return false;
  return access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin');
}

function hasOrgAdmin(access: Awaited<ReturnType<typeof loadPortalAccess>>): boolean {
  if (!access) return false;
  return access.portalRoles.includes('portal_org_admin');
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

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, actorProfile, access };
}

async function refreshUserClaims(supabase: SupabaseServerClient, userId: string | null) {
  if (!userId) return;
  try {
    await supabase.rpc('refresh_user_permissions', { user_uuid: userId });
  } catch (error) {
    console.warn('refresh_user_permissions failed', error);
  }
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
    if (isOrgAdmin && !isElevated) {
      if (!actorProfile.organization_id || existing?.organization_id !== actorProfile.organization_id) {
        throw new Error('Elevated admin access is required.');
      }
    } else if (!isElevated) {
      throw new Error('Elevated admin access is required.');
    }

    const { error: updateError } = await portal.from('profiles').update(updates).eq('id', profileId);
    if (updateError) {
      throw updateError;
    }

    await refreshUserClaims(supabase, existing?.user_id ?? null);

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

export async function toggleRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = formData.get('profile_id');
    const roleName = formData.get('role_name');
    const enableValue = formData.get('enable');

    if (typeof profileId !== 'string' || typeof roleName !== 'string' || typeof enableValue !== 'string') {
      throw new Error('Invalid role request.');
    }

    const enable = enableValue === 'true';

    const { supabase, actorProfile, access } = await requireAdminContext({ allowOrgAdmin: true });
    const assignableRoles = await loadAssignableRoles(supabase);
    const portal = supabase.schema('portal');

    const { data: profileRow, error: profileError } = await portal
      .from('profiles')
      .select('user_id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error('Profile not found.');
    }

    if (!assignableRoles.has(roleName)) {
      throw new Error('Unsupported role change request.');
    }

    const isElevated = hasElevatedAdmin(access);
    const isOrgAdmin = hasOrgAdmin(access);
    if (!isElevated) {
      if (!isOrgAdmin || !actorProfile.organization_id || actorProfile.organization_id !== profileRow.organization_id) {
        throw new Error('Elevated admin access is required.');
      }
      const orgRoles = new Set(['portal_org_admin', 'portal_org_rep', 'portal_user']);
      if (!orgRoles.has(roleName)) {
        throw new Error('Elevated admin access is required.');
      }
      if (profileRow.user_id) {
        const { data: rolesData, error: rolesError } = await supabase
          .schema('core')
          .from('user_roles')
          .select('roles:roles!inner(name)')
          .eq('user_id', profileRow.user_id);
        if (rolesError) throw rolesError;
        const targetRoles = new Set((rolesData ?? []).map((r: { roles: { name: string } | null }) => r.roles?.name));
        if (targetRoles.has('portal_admin') || targetRoles.has('iharc_admin')) {
          throw new Error('Elevated admin access is required.');
        }
      }
    }

    const { error } = await portal.rpc('set_profile_role', {
      p_profile_id: profileId,
      p_role_name: roleName,
      p_enable: enable,
    });

    if (error) {
      throw error;
    }

    await refreshUserClaims(supabase, profileRow.user_id);

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
    console.error('toggleRoleAction error', error);
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
      if (!isOrgAdmin || !actorProfile.organization_id || actorProfile.organization_id !== profileRow.organization_id) {
        throw new Error('Elevated admin access is required.');
      }
      if (profileRow.user_id) {
        const { data: rolesData, error: rolesError } = await supabase
          .schema('core')
          .from('user_roles')
          .select('roles:roles!inner(name)')
          .eq('user_id', profileRow.user_id);
        if (rolesError) throw rolesError;
        const targetRoles = new Set((rolesData ?? []).map((r: { roles: { name: string } | null }) => r.roles?.name));
        if (targetRoles.has('portal_admin') || targetRoles.has('iharc_admin')) {
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

    for (const roleName of ['portal_org_admin', 'portal_org_rep'] as const) {
      try {
        await portal.rpc('set_profile_role', {
          p_profile_id: profileId,
          p_role_name: roleName,
          p_enable: false,
        });
      } catch (error) {
        console.warn(`Failed to revoke ${roleName} during archive`, error);
      }
    }

    await refreshUserClaims(supabase, profileRow.user_id);

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
      parseAffiliationType(formData.get('invite_affiliation_type') as string | null, profileEnums) ?? 'community_member';
    const organizationId = normalizeOrganizationId(formData.get('invite_organization_id'));
    const message = (formData.get('invite_message') as string | null) ?? null;

    const {
      data: session,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session.session?.access_token) {
      throw sessionError ?? new Error('Missing session token. Refresh and try again.');
    }

    const isElevated = hasElevatedAdmin(access);
    const isOrgAdmin = hasOrgAdmin(access);
    if (!isElevated) {
      if (!isOrgAdmin || !actorProfile.organization_id || actorProfile.organization_id !== organizationId) {
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
      headers: { Authorization: `Bearer ${session.session.access_token}` },
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
