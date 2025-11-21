import type { Database } from '@/types/supabase';
import { PUBLIC_MEMBER_ROLE_LABEL } from '@/lib/constants';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export type PortalProfile = Database['portal']['Tables']['profiles']['Row'];

type PostgrestErrorLike = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

function isPostgrestErrorLike(error: unknown): error is PostgrestErrorLike {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as Record<string, unknown>).message === 'string',
  );
}

function isUniqueViolation(error: PostgrestErrorLike): boolean {
  return error.code === '23505';
}

function makeProfileError(step: string, error: PostgrestErrorLike): Error {
  if (process.env.NODE_ENV !== 'production') {
    // Surface the original Supabase error in development for easier debugging.
    console.error(`Supabase error while attempting to ${step}`, error);
  }

  if (error.code === '42501') {
    return new Error('You do not have permission to modify this profile. Contact a moderator for support.');
  }

  return new Error('We could not load your profile right now. Please try again.');
}

export async function ensurePortalProfile(
  supabase: SupabaseAnyServerClient,
  userId: string,
  defaults?: Partial<PortalProfile>,
) {
  const portal = supabase.schema('portal');
  const fetchProfileByUserId = async (): Promise<PortalProfile | null> => {
    const { data, error } = await portal
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isPostgrestErrorLike(error)) {
        throw makeProfileError('fetch your profile', error);
      }
      throw error;
    }

    return data ?? null;
  };

  const refreshUserClaims = async (userIdToRefresh: string) => {
    try {
      await supabase.rpc('refresh_user_permissions', { user_uuid: userIdToRefresh });
    } catch (claimError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to refresh user claims', claimError);
      }
    }
  };

  const ensureCommunityMemberTitle = async (profile: PortalProfile): Promise<PortalProfile> => {
    if (profile.position_title || profile.affiliation_type !== 'community_member') {
      return profile;
    }

    const { data, error } = await portal
      .from('profiles')
      .update({ position_title: PUBLIC_MEMBER_ROLE_LABEL })
      .eq('id', profile.id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (process.env.NODE_ENV !== 'production' && isPostgrestErrorLike(error)) {
        console.warn('Failed to backfill community member position title', error);
      }
      return profile;
    }

    return data ?? profile;
  };

  const existingProfile = await fetchProfileByUserId();

  if (existingProfile) {
    await refreshUserClaims(existingProfile.user_id);
    return ensureCommunityMemberTitle(existingProfile);
  }

  const affiliationType = defaults?.affiliation_type ?? 'community_member';
  const isCommunityMember = affiliationType === 'community_member';
  const affiliationStatus = defaults?.affiliation_status ?? (isCommunityMember ? 'approved' : 'pending');
  const affiliationRequestedAt =
    defaults?.affiliation_requested_at ?? (affiliationStatus === 'pending' ? new Date().toISOString() : null);
  const positionTitle = defaults?.position_title ?? (isCommunityMember ? PUBLIC_MEMBER_ROLE_LABEL : null);
  const homelessnessExperience = defaults?.homelessness_experience ?? 'none';
  const substanceUseExperience = defaults?.substance_use_experience ?? 'none';

  const insertPayload = {
    user_id: userId,
    display_name: defaults?.display_name ?? 'Community Member',
    organization_id: defaults?.organization_id ?? null,
    rules_acknowledged_at: defaults?.rules_acknowledged_at ?? null,
    position_title: positionTitle,
    affiliation_type: affiliationType,
    affiliation_status: affiliationStatus,
    affiliation_requested_at: affiliationRequestedAt,
    affiliation_reviewed_at: defaults?.affiliation_reviewed_at ?? null,
    affiliation_reviewed_by: defaults?.affiliation_reviewed_by ?? null,
    bio: defaults?.bio ?? null,
    avatar_url: defaults?.avatar_url ?? null,
    homelessness_experience: homelessnessExperience,
    substance_use_experience: substanceUseExperience,
    government_role_type: defaults?.government_role_type ?? null,
    requested_organization_name: defaults?.requested_organization_name ?? null,
    requested_government_name: defaults?.requested_government_name ?? null,
    requested_government_level: defaults?.requested_government_level ?? null,
    requested_government_role: defaults?.requested_government_role ?? null,
  } satisfies Partial<PortalProfile> & { user_id: string };

  const { data: inserted, error: insertError } = await portal
    .from('profiles')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    if (isPostgrestErrorLike(insertError) && isUniqueViolation(insertError)) {
      const profile = await fetchProfileByUserId();
      if (profile) {
        return ensureCommunityMemberTitle(profile);
      }
    }

    if (isPostgrestErrorLike(insertError)) {
      throw makeProfileError('create your profile', insertError);
    }

    throw insertError;
  }

  await refreshUserClaims(userId);

  return ensureCommunityMemberTitle(inserted);
}

export async function getUserEmailForProfile(supabase: SupabaseAnyServerClient, profileId: string) {
  const { data, error } = await supabase.rpc('portal_get_user_email', {
    p_profile_id: profileId,
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}
