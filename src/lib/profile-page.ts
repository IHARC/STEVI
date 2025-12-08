import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { normalizeLivedExperience, buildLivedExperienceOptions, type LivedExperienceStatus } from '@/lib/lived-experience';
import { formatEnumLabel, getLivedExperienceStatuses } from '@/lib/enum-values';
import { loadProfileEnums } from '@/lib/admin-users';
import type { Database } from '@/types/supabase';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export type OrganizationOption = { id: string; name: string };

export type ProfilePageData = {
  profile: PortalProfile;
  organizations: OrganizationOption[];
  allowedAffiliations: Database['portal']['Enums']['affiliation_type'][];
  livedExperienceValues: LivedExperienceStatus[];
  livedExperienceOptions: { value: LivedExperienceStatus; label: string; description: string }[];
};

export async function loadProfilePageData(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<ProfilePageData> {
  const profile = await ensurePortalProfile(supabase, userId);

  const { data: organizationRowsRaw } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const organizations: OrganizationOption[] = (organizationRowsRaw ?? []).map((org: { id: number; name: string | null }) => ({
    id: String(org.id),
    name: org.name ?? 'Organization',
  }));

  const profileEnums = await loadProfileEnums(supabase);
  const allowedAffiliations = profileEnums.affiliationTypes;
  const livedExperienceValues = await getLivedExperienceStatuses(supabase);
  const livedExperienceOptions = buildLivedExperienceOptions(livedExperienceValues);

  return {
    profile,
    organizations,
    allowedAffiliations,
    livedExperienceValues: livedExperienceValues as LivedExperienceStatus[],
    livedExperienceOptions: livedExperienceOptions as {
      value: LivedExperienceStatus;
      label: string;
      description: string;
    }[],
  };
}

export function resolveInitialProfileValues(
  profile: PortalProfile,
  organizations: OrganizationOption[],
  allowedAffiliations: Database['portal']['Enums']['affiliation_type'][],
  livedExperienceValues: LivedExperienceStatus[],
) {
  type AffiliationType = Database['portal']['Enums']['affiliation_type'];

  const currentAffiliation = allowedAffiliations.includes(profile.affiliation_type as AffiliationType)
    ? (profile.affiliation_type as AffiliationType)
    : allowedAffiliations[0] ?? 'community_member';

  const initialOrganizationId = organizations.some((org) => Number(org.id) === Number(profile.organization_id))
    ? String(profile.organization_id)
    : null;

  const initialValues = {
    displayName: profile.display_name ?? 'Community member',
    organizationId: initialOrganizationId,
    positionTitle: profile.position_title,
    affiliationType: currentAffiliation,
    homelessnessExperience: normalizeLivedExperience(profile.homelessness_experience ?? null, livedExperienceValues),
    substanceUseExperience: normalizeLivedExperience(profile.substance_use_experience ?? null, livedExperienceValues),
    affiliationStatus: profile.affiliation_status,
    requestedOrganizationName: profile.requested_organization_name,
  };

  return { currentAffiliation, initialValues };
}

export function affiliationOptionsFromValues(values: Database['portal']['Enums']['affiliation_type'][]): { value: Database['portal']['Enums']['affiliation_type']; label: string }[] {
  return values.map((value) => ({ value, label: formatEnumLabel(value) }));
}
