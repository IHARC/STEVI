'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent } from '@/lib/audit';
import { normalizeOrganizationId, parseAffiliationStatus, parseAffiliationType, parseGovernmentRole } from '@/lib/admin-users';
import type { SupabaseServerClient } from '@/lib/supabase/types';

const LIST_ROOT = '/admin/users';
const SEGMENT_PATHS = ['/admin/users/all', '/admin/users/clients', '/admin/users/partners', '/admin/users/staff'] as const;

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
    targets.add(`${LIST_ROOT}/${profileId}`);
  }
  await Promise.all(Array.from(targets).map((path) => revalidatePath(path)));
}

const ALLOWED_ROLE_NAMES = [
  'portal_admin',
  'portal_moderator',
  'portal_org_admin',
  'portal_org_rep',
  'portal_user',
  'iharc_admin',
  'iharc_supervisor',
  'iharc_staff',
  'iharc_volunteer',
] as const;

function hasElevatedAdmin(access: Awaited<ReturnType<typeof loadPortalAccess>>): boolean {
  if (!access) return false;
  return access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin');
}

async function requireAdminContext({ requireElevated = false }: { requireElevated?: boolean } = {}) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.isProfileApproved) {
    throw new Error('Profile approval required.');
  }

  if (!access.canAccessAdminWorkspace) {
    throw new Error('Admin access is required.');
  }

  if (requireElevated && !hasElevatedAdmin(access)) {
    throw new Error('Elevated admin access is required.');
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

    const displayName = formData.get('display_name');
    const positionTitle = formData.get('position_title');
    const affiliationType = parseAffiliationType(formData.get('affiliation_type') as string | null);
    const affiliationStatus = parseAffiliationStatus(formData.get('affiliation_status') as string | null);
    const organizationId = normalizeOrganizationId(formData.get('organization_id'));
    const governmentRole = parseGovernmentRole(formData.get('government_role_type') as string | null);

    const { supabase, actorProfile } = await requireAdminContext({ requireElevated: true });
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
      .select('user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
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
      entityId: profileId,
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

    const { supabase, actorProfile } = await requireAdminContext({ requireElevated: true });
    const portal = supabase.schema('portal');

    const { data: profileRow, error: profileError } = await portal
      .from('profiles')
      .select('user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error('Profile not found.');
    }

    if (!ALLOWED_ROLE_NAMES.includes(roleName as (typeof ALLOWED_ROLE_NAMES)[number])) {
      throw new Error('Unsupported role change request.');
    }

    const { error } = await supabase.rpc('set_profile_role', {
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
      entityId: profileId,
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

    const { supabase, actorProfile } = await requireAdminContext({ requireElevated: true });
    const portal = supabase.schema('portal');

    const { data: profileRow, error: profileError } = await portal
      .from('profiles')
      .select('user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profileRow) {
      throw profileError ?? new Error('Profile not found.');
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
        await supabase.rpc('set_profile_role', {
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
      entityId: profileId,
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

    const displayName = (formData.get('invite_display_name') as string | null) ?? null;
    const positionTitle = (formData.get('invite_position_title') as string | null) ?? null;
    const affiliationType =
      parseAffiliationType(formData.get('invite_affiliation_type') as string | null) ?? 'community_member';
    const organizationId = normalizeOrganizationId(formData.get('invite_organization_id'));
    const message = (formData.get('invite_message') as string | null) ?? null;

    const { supabase, actorProfile } = await requireAdminContext({ requireElevated: true });

    const {
      data: session,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session.session?.access_token) {
      throw sessionError ?? new Error('Missing session token. Refresh and try again.');
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
      entityId: null,
      meta: { email, affiliationType, organizationId },
    });

    await revalidateUserPaths();

    return { success: true };
  } catch (error) {
    console.error('sendInviteAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
