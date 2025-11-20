'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { NO_ORGANIZATION_VALUE } from '@/lib/constants';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

const ADMIN_ROOT_PATH = '/admin';
const ADMIN_PROFILES_PATH = '/admin/profiles';
const ADMIN_PATHS = [ADMIN_ROOT_PATH, ADMIN_PROFILES_PATH] as const;

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

type GovernmentRoleType = Database['portal']['Enums']['government_role_type'];

async function revalidateAdminPaths() {
  await Promise.all(ADMIN_PATHS.map((path) => revalidatePath(path)));
}

function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function requireString(formData: FormData, key: string, message: string): string {
  const value = readString(formData, key);
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function normalizeOrganizationId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === NO_ORGANIZATION_VALUE) {
    return null;
  }
  return trimmed;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Something went wrong. Try again in a moment.';
}

async function loadModeratorContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to continue.');
  }

  const actorProfile = await ensurePortalProfile(supabase, user.id);

  if (!['moderator', 'admin'].includes(actorProfile.role)) {
    throw new Error('Moderator access is required.');
  }

  const portal = supabase.schema('portal');

  return { supabase, portal, user, actorProfile };
}

function requireGovernmentRole(value: string | null): GovernmentRoleType {
  const allowed: GovernmentRoleType[] = ['staff', 'politician'];
  if (!value) {
    throw new Error('Select a government role type.');
  }
  if (!allowed.includes(value as GovernmentRoleType)) {
    throw new Error('Invalid government role selection.');
  }
  return value as GovernmentRoleType;
}

export async function sendPartnerInviteAction(formData: FormData): Promise<ActionResult> {
  try {
    const email = requireString(formData, 'invite_email', 'Enter the contact email.');
    const displayName = readString(formData, 'invite_display_name');
    const positionTitle = readString(formData, 'invite_position_title');
    const affiliationInput = readString(formData, 'invite_affiliation_type') ?? 'agency_partner';
    const message = readString(formData, 'invite_message');
    const organizationId = normalizeOrganizationId(formData.get('invite_organization_id'));

    const allowedAffiliations: PortalProfile['affiliation_type'][] = [
      'community_member',
      'agency_partner',
      'government_partner',
    ];
    const affiliationType = allowedAffiliations.includes(affiliationInput as PortalProfile['affiliation_type'])
      ? (affiliationInput as PortalProfile['affiliation_type'])
      : 'agency_partner';

    if (!email.includes('@')) {
      throw new Error('Provide a valid email address.');
    }

    const context = await loadModeratorContext();

    const {
      data: sessionData,
      error: sessionError,
    } = await context.supabase.auth.getSession();

    if (sessionError || !sessionData.session?.access_token) {
      throw sessionError ?? new Error('Current session missing. Refresh and try again.');
    }

    const response = await context.supabase.functions.invoke('portal-admin-invite', {
      body: {
        email,
        displayName,
        positionTitle,
        affiliationType,
        organizationId,
        message,
        actorProfileId: context.actorProfile.id,
      },
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to send the invitation.');
    }

    await revalidateAdminPaths();

    return { success: true };
  } catch (error) {
    console.error('sendPartnerInviteAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function approveAffiliationAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = requireString(formData, 'profile_id', 'Profile context is required.');
    const approvedOrganizationId = normalizeOrganizationId(formData.get('approved_organization_id'));
    const approvedGovernmentRole = readString(formData, 'approved_government_role');

    const { supabase, portal, actorProfile } = await loadModeratorContext();

    const { data: pendingProfile, error: profileError } = await portal
      .from('profiles')
      .select(
        'user_id, affiliation_type, organization_id, requested_organization_name, requested_government_name, requested_government_level, requested_government_role, government_role_type',
      )
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !pendingProfile) {
      throw profileError ?? new Error('Profile not found.');
    }

    const reviewedAt = new Date().toISOString();

    let organizationId: string | null = null;
    let governmentRole: GovernmentRoleType | null = null;

    if (pendingProfile.affiliation_type === 'agency_partner') {
      if (!approvedOrganizationId) {
        throw new Error('Select an organization before approving.');
      }
      organizationId = approvedOrganizationId;
    } else if (pendingProfile.affiliation_type === 'government_partner') {
      if (!approvedOrganizationId) {
        throw new Error('Select a government partner before approving.');
      }
      organizationId = approvedOrganizationId;
      governmentRole = requireGovernmentRole(approvedGovernmentRole);
    }

    const elevateRole = pendingProfile.affiliation_type !== 'community_member';

    const profileUpdate: Partial<PortalProfile> = {
      affiliation_status: 'approved',
      affiliation_reviewed_at: reviewedAt,
      affiliation_reviewed_by: actorProfile.id,
      organization_id: organizationId,
      government_role_type: governmentRole,
      requested_organization_name: null,
      requested_government_name: null,
      requested_government_level: null,
      requested_government_role: null,
    };

    const { error: updateError } = await portal.from('profiles').update(profileUpdate).eq('id', profileId);
    if (updateError) {
      throw updateError;
    }

    await syncOrgRepRole(portal, actorProfile.id, profileId, reviewedAt, elevateRole);

    await supabase.rpc('portal_refresh_profile_claims', { p_profile_id: profileId }).catch((rpcError: unknown) => {
      console.warn('Failed to refresh profile claims', rpcError);
    });

    if (pendingProfile.user_id) {
      await ensurePortalProfile(supabase, pendingProfile.user_id).catch((refreshError) => {
        console.warn('Failed to refresh portal profile cache', refreshError);
      });
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'profile_affiliation_approved',
      entityType: 'profile',
      entityId: profileId,
      meta: {
        affiliation_type: pendingProfile.affiliation_type,
        organization_id: organizationId,
        government_role: governmentRole,
      },
    });

    await revalidateAdminPaths();

    return { success: true };
  } catch (error) {
    console.error('approveAffiliationAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function declineAffiliationAction(formData: FormData): Promise<ActionResult> {
  try {
    const profileId = requireString(formData, 'profile_id', 'Profile context is required.');

    const { supabase, portal, actorProfile } = await loadModeratorContext();

    const { data: pendingProfile, error: profileError } = await portal
      .from('profiles')
      .select('user_id, affiliation_type')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !pendingProfile) {
      throw profileError ?? new Error('Profile not found.');
    }

    const reviewedAt = new Date().toISOString();

    const declineUpdate: Partial<PortalProfile> = {
      affiliation_status: 'revoked',
      affiliation_reviewed_at: reviewedAt,
      affiliation_reviewed_by: actorProfile.id,
      requested_organization_name: null,
      requested_government_name: null,
      requested_government_level: null,
      requested_government_role: null,
    };

    if (pendingProfile.affiliation_type !== 'community_member') {
      declineUpdate.organization_id = null;
      declineUpdate.government_role_type = null;
    }

    const { error: declineError } = await portal.from('profiles').update(declineUpdate).eq('id', profileId);
    if (declineError) {
      throw declineError;
    }

    await syncOrgRepRole(portal, actorProfile.id, profileId, reviewedAt, false);

    await supabase.rpc('portal_refresh_profile_claims', { p_profile_id: profileId }).catch((rpcError: unknown) => {
      console.warn('Failed to refresh profile claims', rpcError);
    });

    if (pendingProfile.user_id) {
      await ensurePortalProfile(supabase, pendingProfile.user_id).catch((refreshError) => {
        console.warn('Failed to refresh portal profile cache', refreshError);
      });
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'profile_affiliation_declined',
      entityType: 'profile',
      entityId: profileId,
    });

    await revalidateAdminPaths();

    return { success: true };
  } catch (error) {
    console.error('declineAffiliationAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

async function syncOrgRepRole(
  portal: ReturnType<SupabaseServerClient['schema']>,
  actorProfileId: string,
  profileId: string,
  reviewedAt: string,
  elevate: boolean,
) {
  const { data: roleRow, error: roleError } = await portal.from('roles').select('id').eq('name', 'org_rep').maybeSingle();

  if (roleError) {
    throw roleError;
  }

  if (!roleRow) {
    throw new Error('Org representative role is not configured.');
  }

  if (elevate) {
    const { data: existingRole, error: existingRoleError } = await portal
      .from('profile_roles')
      .select('id, revoked_at')
      .eq('profile_id', profileId)
      .eq('role_id', roleRow.id)
      .maybeSingle();

    if (existingRoleError) {
      throw existingRoleError;
    }

    if (!existingRole) {
      const { error: insertError } = await portal.from('profile_roles').insert({
        profile_id: profileId,
        role_id: roleRow.id,
        granted_at: reviewedAt,
        granted_by_profile_id: actorProfileId,
      });
      if (insertError) {
        throw insertError;
      }
    } else if (existingRole.revoked_at) {
      const { error: restoreError } = await portal
        .from('profile_roles')
        .update({
          revoked_at: null,
          revoked_by_profile_id: null,
          reason: null,
          updated_at: reviewedAt,
          granted_at: reviewedAt,
          granted_by_profile_id: actorProfileId,
        })
        .eq('id', existingRole.id);
      if (restoreError) {
        throw restoreError;
      }
    }
  } else {
    const { error: revokeError } = await portal
      .from('profile_roles')
      .update({
        revoked_at: reviewedAt,
        revoked_by_profile_id: actorProfileId,
        updated_at: reviewedAt,
      })
      .eq('profile_id', profileId)
      .eq('role_id', roleRow.id)
      .is('revoked_at', null);

    if (revokeError) {
      throw revokeError;
    }
  }
}
