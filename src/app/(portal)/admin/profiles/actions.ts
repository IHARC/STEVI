'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { NO_ORGANIZATION_VALUE } from '@/lib/constants';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
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

function normalizeOrganizationId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === NO_ORGANIZATION_VALUE) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
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
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.canReviewProfiles) {
    throw new Error('Moderator access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);
  const portal = supabase.schema('portal');

  return { supabase, portal, userId: access.userId, actorProfile };
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

    let organizationId: number | null = null;
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

    await syncOrgRepRole(supabase, profileId, elevateRole);

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'profile_affiliation_approved',
    entityType: 'profile',
    entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
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

    await syncOrgRepRole(supabase, profileId, false);

    if (pendingProfile.user_id) {
      await ensurePortalProfile(supabase, pendingProfile.user_id).catch((refreshError) => {
        console.warn('Failed to refresh portal profile cache', refreshError);
      });
    }

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'profile_affiliation_declined',
    entityType: 'profile',
    entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
  });

    await revalidateAdminPaths();

    return { success: true };
  } catch (error) {
    console.error('declineAffiliationAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

async function syncOrgRepRole(
  supabase: SupabaseServerClient,
  profileId: string,
  elevate: boolean,
) {
  const { error } = await supabase.rpc('set_profile_role', {
    p_profile_id: profileId,
    p_role_name: 'portal_org_rep',
    p_enable: elevate,
  });

  if (error) {
    throw error;
  }
}
