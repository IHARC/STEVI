'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';
import {
  mergeFeatureFlagsIntoTags,
  ORG_FEATURE_KEYS,
  type OrgFeatureKey,
} from '@/lib/organizations';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

const LIST_PATH = '/admin/organizations';
const detailPath = (organizationId: number | string) => `${LIST_PATH}/${organizationId}`;

type ActionResult = { success: true } | { success: false; error: string };

type OrganizationStatus = Database['core']['Enums']['organization_status_enum'];
type OrganizationType = Database['core']['Enums']['organization_type'];
type PartnershipType = Database['core']['Enums']['partnership_type'];

const ORGANIZATION_STATUS_OPTIONS: OrganizationStatus[] = ['active', 'inactive', 'pending', 'under_review'];
const ORGANIZATION_TYPE_OPTIONS: OrganizationType[] = [
  'addiction',
  'crisis_support',
  'food_services',
  'housing',
  'mental_health',
  'multi_service',
  'healthcare',
  'government',
  'non_profit',
  'faith_based',
  'community_center',
  'legal_services',
  'other',
];
const PARTNERSHIP_TYPE_OPTIONS: PartnershipType[] = [
  'referral_partner',
  'service_provider',
  'funding_partner',
  'collaborative_partner',
  'resource_partner',
  'other',
];

function getString(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function requireString(form: FormData, key: string, message: string): string {
  const value = getString(form, key);
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function getBoolean(form: FormData, key: string, fallback = false): boolean {
  const value = form.get(key);
  if (typeof value === 'string') {
    if (['true', '1', 'on', 'yes'].includes(value.toLowerCase())) return true;
    if (['false', '0', 'off', 'no'].includes(value.toLowerCase())) return false;
  }
  return fallback;
}

function parseNumericId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  if (!value) return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

function readFeatureSelection(form: FormData): OrgFeatureKey[] {
  const entries = form.getAll('features');
  return entries
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((value): value is OrgFeatureKey => (value ? ORG_FEATURE_KEYS.includes(value as OrgFeatureKey) : false));
}

async function requirePortalAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.portalRoles.includes('portal_admin')) {
    throw new Error('Administrator access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return {
    supabase,
    core: supabase.schema('core'),
    portal: supabase.schema('portal'),
    actorProfile,
  };
}

async function setRole(
  supabase: SupabaseServerClient,
  profileId: string,
  roleName: 'portal_org_admin' | 'portal_org_rep',
  enable: boolean,
) {
  const { error } = await supabase.rpc('set_profile_role', {
    p_profile_id: profileId,
    p_role_name: roleName,
    p_enable: enable,
  });

  if (error) {
    throw error;
  }
}

async function refreshUserClaims(supabase: SupabaseServerClient, userId: string | null) {
  if (!userId) return;
  try {
    await supabase.rpc('refresh_user_permissions', { user_uuid: userId });
  } catch (error) {
    console.warn('refresh_user_permissions failed', error);
  }
}

function failure(error: unknown, fallback: string): ActionResult {
  const message = error instanceof Error ? error.message : fallback;
  return { success: false, error: message };
}

export async function createOrganizationAction(formData: FormData): Promise<ActionResult> {
  try {
    const name = requireString(formData, 'name', 'Organization name is required.');
    const website = getString(formData, 'website');
    const status = parseEnum(getString(formData, 'status'), ORGANIZATION_STATUS_OPTIONS) ?? 'active';
    const organizationType = parseEnum(getString(formData, 'organization_type'), ORGANIZATION_TYPE_OPTIONS);
    const partnershipType = parseEnum(getString(formData, 'partnership_type'), PARTNERSHIP_TYPE_OPTIONS);
    const isActive = getBoolean(formData, 'is_active', false);
    const features = readFeatureSelection(formData);

    const { supabase, core, actorProfile } = await requirePortalAdminContext();

    const now = new Date().toISOString();
    const servicesTags = features.length ? mergeFeatureFlagsIntoTags(null, features) : null;

    const insert = await core
      .from('organizations')
      .insert({
        name,
        website,
        organization_type: organizationType,
        partnership_type: partnershipType,
        status,
        is_active: isActive,
        created_by: actorProfile.id,
        updated_by: actorProfile.id,
        created_at: now,
        updated_at: now,
        services_tags: servicesTags,
      })
      .select('id')
      .maybeSingle();

    if (insert.error) {
      throw insert.error;
    }

    if (insert.data) {
      await logAuditEvent(supabase, {
        actorProfileId: actorProfile.id,
        action: 'organization_created',
        entityType: 'organization',
        entityRef: buildEntityRef({ schema: 'core', table: 'organizations', id: insert.data.id }),
        meta: { pk_int: insert.data.id, name, status, features },
      });
    }

    await revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error('createOrganizationAction error', error);
    return failure(error, 'Unable to create organization.');
  }
}

export async function updateOrganizationAction(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = parseNumericId(formData.get('organization_id'));
    if (!organizationId) {
      throw new Error('Organization context is missing.');
    }

    const name = requireString(formData, 'name', 'Organization name is required.');
    const website = getString(formData, 'website');
    const email = getString(formData, 'email');
    const phone = getString(formData, 'phone');
    const organizationType = parseEnum(getString(formData, 'organization_type'), ORGANIZATION_TYPE_OPTIONS);
    const partnershipType = parseEnum(getString(formData, 'partnership_type'), PARTNERSHIP_TYPE_OPTIONS);
    const status = parseEnum(getString(formData, 'status'), ORGANIZATION_STATUS_OPTIONS) ?? 'active';
    const isActive = getBoolean(formData, 'is_active', false);
    const description = getString(formData, 'description');
    const servicesProvided = getString(formData, 'services_provided');
    const address = getString(formData, 'address');
    const city = getString(formData, 'city');
    const province = getString(formData, 'province');
    const postalCode = getString(formData, 'postal_code');
    const contactPerson = getString(formData, 'contact_person');
    const contactTitle = getString(formData, 'contact_title');
    const contactPhone = getString(formData, 'contact_phone');
    const contactEmail = getString(formData, 'contact_email');
    const operatingHours = getString(formData, 'operating_hours');
    const availabilityNotes = getString(formData, 'availability_notes');
    const referralProcess = getString(formData, 'referral_process');
    const specialRequirements = getString(formData, 'special_requirements');
    const notes = getString(formData, 'notes');
    const features = readFeatureSelection(formData);

    const { supabase, core, actorProfile } = await requirePortalAdminContext();

    const { data: existing, error: fetchError } = await core
      .from('organizations')
      .select('services_tags, name')
      .eq('id', organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw fetchError ?? new Error('Organization not found.');
    }

    const mergedServicesTags = mergeFeatureFlagsIntoTags(existing.services_tags, features);

    const now = new Date().toISOString();
    const updatePayload = {
      name,
      website,
      email,
      phone,
      organization_type: organizationType,
      partnership_type: partnershipType,
      status,
      is_active: isActive,
      description,
      services_provided: servicesProvided,
      address,
      city,
      province,
      postal_code: postalCode,
      contact_person: contactPerson,
      contact_title: contactTitle,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      operating_hours: operatingHours,
      availability_notes: availabilityNotes,
      referral_process: referralProcess,
      special_requirements: specialRequirements,
      notes,
      services_tags: mergedServicesTags,
      updated_at: now,
      updated_by: actorProfile.id,
    };

    const { error: updateError } = await core.from('organizations').update(updatePayload).eq('id', organizationId);
    if (updateError) {
      throw updateError;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'organization_updated',
      entityType: 'organization',
      entityRef: buildEntityRef({ schema: 'core', table: 'organizations', id: organizationId }),
      meta: { pk_int: organizationId, status, is_active: isActive, features },
    });

    await Promise.all([revalidatePath(LIST_PATH), revalidatePath(detailPath(organizationId))]);

    return { success: true };
  } catch (error) {
    console.error('updateOrganizationAction error', error);
    return failure(error, 'Unable to update organization.');
  }
}

export async function deleteOrganizationAction(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = parseNumericId(formData.get('organization_id'));
    if (!organizationId) {
      throw new Error('Organization context is missing.');
    }

    const confirmName = getString(formData, 'confirm_name');

    const { supabase, core, portal, actorProfile } = await requirePortalAdminContext();

    const { data: organization, error: fetchError } = await core
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();

    if (fetchError || !organization) {
      throw fetchError ?? new Error('Organization not found.');
    }

    if (!confirmName || confirmName.toLowerCase().trim() !== organization.name.toLowerCase()) {
      throw new Error('Type the organization name to confirm deletion.');
    }

    const [{ count: memberCount }, { count: inviteCount }, { count: relationCount }] = await Promise.all([
      portal.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      portal.from('profile_invites').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      core.from('organization_people').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    ]);

    if ((memberCount ?? 0) > 0 || (inviteCount ?? 0) > 0 || (relationCount ?? 0) > 0) {
      throw new Error('Remove or reassign members, invites, and linked people before deleting this organization.');
    }

    const { error: deleteError } = await core.from('organizations').delete().eq('id', organizationId);
    if (deleteError) {
      if (deleteError.code === '23503') {
        throw new Error('Cannot delete this organization because related records still exist.');
      }
      throw deleteError;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'organization_deleted',
      entityType: 'organization',
      entityRef: buildEntityRef({ schema: 'core', table: 'organizations', id: organizationId }),
      meta: { pk_int: organizationId },
    });

    await revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error) {
    console.error('deleteOrganizationAction error', error);
    return failure(error, 'Unable to delete organization.');
  }
}

export async function attachOrgMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = parseNumericId(formData.get('organization_id'));
    const profileId = getString(formData, 'profile_id');
    const makeAdmin = getBoolean(formData, 'make_admin', false);
    const makeRep = getBoolean(formData, 'make_rep', false);

    if (!organizationId || !profileId) {
      throw new Error('Profile and organization are required.');
    }

    if (!makeAdmin && !makeRep) {
      throw new Error('Select at least one role for the member.');
    }

    const { supabase, portal, actorProfile } = await requirePortalAdminContext();

    const { data: profile, error: profileError } = await portal
      .from('profiles')
      .select('id, user_id, organization_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profile) {
      throw profileError ?? new Error('Profile not found.');
    }

    const now = new Date().toISOString();
    const { error: updateError } = await portal
      .from('profiles')
      .update({
        organization_id: organizationId,
        affiliation_status: 'approved',
        affiliation_reviewed_at: now,
        affiliation_reviewed_by: actorProfile.id,
        updated_at: now,
      })
      .eq('id', profileId);

    if (updateError) {
      throw updateError;
    }

    await Promise.all([
      setRole(supabase, profileId, 'portal_org_admin', makeAdmin),
      setRole(supabase, profileId, 'portal_org_rep', makeRep || makeAdmin),
    ]);

    await refreshUserClaims(supabase, profile.user_id);

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'org_member_attached',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
      meta: { organization_id: organizationId, make_admin: makeAdmin, make_rep: makeRep },
    });

    await Promise.all([revalidatePath(LIST_PATH), revalidatePath(detailPath(organizationId))]);

    return { success: true };
  } catch (error) {
    console.error('attachOrgMemberAction error', error);
    return failure(error, 'Unable to add member.');
  }
}

export async function adminToggleOrgMemberRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = parseNumericId(formData.get('organization_id'));
    const profileId = getString(formData, 'profile_id');
    const roleName = getString(formData, 'role_name');
    const enable = getBoolean(formData, 'enable', false);

    if (!organizationId || !profileId || !roleName) {
      throw new Error('Missing role context.');
    }

    if (roleName !== 'portal_org_admin' && roleName !== 'portal_org_rep') {
      throw new Error('Unsupported role.');
    }

    const { supabase, portal, actorProfile } = await requirePortalAdminContext();

    const { data: member, error: memberError } = await portal
      .from('profiles')
      .select('id, organization_id, user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (memberError || !member) {
      throw memberError ?? new Error('Member not found.');
    }

    if (member.organization_id !== organizationId) {
      throw new Error('Member does not belong to this organization.');
    }

    await setRole(supabase, profileId, roleName as 'portal_org_admin' | 'portal_org_rep', enable);
    await refreshUserClaims(supabase, member.user_id ?? null);

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: enable ? 'org_role_granted' : 'org_role_revoked',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
      meta: { organization_id: organizationId, role: roleName },
    });

    await revalidatePath(detailPath(organizationId));

    return { success: true };
  } catch (error) {
    console.error('adminToggleOrgMemberRoleAction error', error);
    return failure(error, 'Unable to update member role.');
  }
}

export async function adminRemoveOrgMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = parseNumericId(formData.get('organization_id'));
    const profileId = getString(formData, 'profile_id');

    if (!organizationId || !profileId) {
      throw new Error('Member context is missing.');
    }

    const { supabase, portal, actorProfile } = await requirePortalAdminContext();

    const { data: member, error: memberError } = await portal
      .from('profiles')
      .select('id, organization_id, user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (memberError || !member) {
      throw memberError ?? new Error('Member not found.');
    }

    if (member.organization_id !== organizationId) {
      throw new Error('Member does not belong to this organization.');
    }

    const now = new Date().toISOString();

    for (const roleName of ['portal_org_admin', 'portal_org_rep'] as const) {
      try {
        await setRole(supabase, profileId, roleName, false);
      } catch (roleError) {
        console.warn(`Failed to revoke ${roleName} role when removing member`, roleError);
      }
    }

    const { error: clearError } = await portal
      .from('profiles')
      .update({ organization_id: null, updated_at: now })
      .eq('id', profileId);

    if (clearError) {
      throw clearError;
    }

    await refreshUserClaims(supabase, member.user_id ?? null);

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'org_member_removed',
      entityType: 'profile',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
      meta: { organization_id: organizationId },
    });

    await revalidatePath(detailPath(organizationId));
    return { success: true };
  } catch (error) {
    console.error('adminRemoveOrgMemberAction error', error);
    return failure(error, 'Unable to remove member.');
  }
}
