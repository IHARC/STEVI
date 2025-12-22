'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { loadPortalAccess } from '@/lib/portal-access';
import { mergeFeatureFlagsIntoTags, ORG_FEATURE_KEYS, type OrgFeatureKey } from '@/lib/organizations';
import { getBoolean, getString, parseEnum } from '@/lib/server-actions/form';
import type { Database } from '@/types/supabase';

const LIST_PATH = '/ops/organizations';
const detailPath = (organizationId: number | string) => `${LIST_PATH}/${organizationId}`;

export type CreateOrganizationState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

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

function parseNumericId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function requireField(form: FormData, key: string, message: string): string {
  const value = getString(form, key, { required: true });
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function readFeatureSelection(form: FormData): OrgFeatureKey[] {
  const entries = form.getAll('features');
  return entries
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((value): value is OrgFeatureKey => (value ? ORG_FEATURE_KEYS.includes(value as OrgFeatureKey) : false));
}

async function requireIharcAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.isGlobalAdmin) {
    throw new Error('IHARC admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return {
    supabase,
    core: supabase.schema('core'),
    portal: supabase.schema('portal'),
    actorProfile,
  };
}

export async function createOrganizationAction(
  _prevState: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  try {
    const name = requireField(formData, 'name', 'Organization name is required.');
    const website = getString(formData, 'website');
    const status = parseEnum(getString(formData, 'status'), ORGANIZATION_STATUS_OPTIONS) ?? 'active';
    const organizationType = parseEnum(getString(formData, 'organization_type'), ORGANIZATION_TYPE_OPTIONS);
    const partnershipType = parseEnum(getString(formData, 'partnership_type'), PARTNERSHIP_TYPE_OPTIONS);
    const isActive = getBoolean(formData, 'is_active', false);
    const notes = getString(formData, 'notes');
    const features = readFeatureSelection(formData);

    const { supabase, core, actorProfile } = await requireIharcAdminContext();

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
        notes,
        created_by: actorProfile.id,
        updated_by: actorProfile.id,
        created_at: now,
        updated_at: now,
        services_tags: servicesTags,
      })
      .select('id')
      .single();

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'organization_created',
      entityType: 'organization',
      entityRef: buildEntityRef({ schema: 'core', table: 'organizations', id: insert.data.id }),
      meta: { pk_int: insert.data.id, name, status, features },
    });

    await revalidatePath(LIST_PATH);

    return { status: 'success', message: 'Organization created.' };
  } catch (error) {
    console.error('createOrganizationAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to create organization.';
    return { status: 'error', message };
  }
}

export async function updateOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = parseNumericId(formData.get('organization_id'));
  if (!organizationId) {
    throw new Error('Organization context is missing.');
  }

  const name = requireField(formData, 'name', 'Organization name is required.');
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

  const { supabase, core, actorProfile } = await requireIharcAdminContext();

  const { data: existing, error: fetchError } = await core
    .from('organizations')
    .select('services_tags')
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
}

export async function deleteOrganizationAction(formData: FormData): Promise<void> {
  const organizationId = parseNumericId(formData.get('organization_id'));
  if (!organizationId) {
    throw new Error('Organization context is missing.');
  }

  const confirmName = getString(formData, 'confirm_name');

  const { supabase, core, portal, actorProfile } = await requireIharcAdminContext();

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
}

export async function attachOrgMemberAction(formData: FormData): Promise<void> {
  const organizationId = parseNumericId(formData.get('organization_id'));
  const profileId = getString(formData, 'profile_id');
  const roleIds = formData
    .getAll('role_ids')
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((value): value is string => Boolean(value));

  if (!organizationId || !profileId) {
    throw new Error('Profile and organization are required.');
  }

  if (roleIds.length === 0) {
    throw new Error('Select at least one role for the member.');
  }

  const { supabase, portal, core, actorProfile } = await requireIharcAdminContext();

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

  const { data: validRoles, error: roleError } = await core
    .from('org_roles')
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', roleIds);
  if (roleError) throw roleError;
  const validRoleIds = new Set((validRoles ?? []).map((role: { id: string }) => role.id));
  if (validRoleIds.size === 0) {
    throw new Error('No valid roles selected for this organization.');
  }

  await core
    .from('user_org_roles')
    .delete()
    .match({ user_id: profile.user_id, organization_id: organizationId });

  const insertRoles = Array.from(validRoleIds).map((roleId) => ({
    user_id: profile.user_id,
    organization_id: organizationId,
    org_role_id: roleId,
    granted_by: actorProfile.user_id ?? null,
  }));

  const { error: insertError } = await core
    .from('user_org_roles')
    .insert(insertRoles, { onConflict: 'user_id,organization_id,org_role_id' });
  if (insertError) throw insertError;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'org_member_attached',
    entityType: 'profile',
    entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: profileId }),
    meta: { organization_id: organizationId, role_ids: Array.from(validRoleIds) },
  });

  await Promise.all([revalidatePath(LIST_PATH), revalidatePath(detailPath(organizationId))]);
}
