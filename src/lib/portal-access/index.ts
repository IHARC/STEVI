import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import { extractOrgFeatureFlags, type OrgFeatureKey } from '@/lib/organizations';
import type { Json } from '@/types/supabase';

export type PortalAccess = {
  userId: string;
  email: string | null;
  profile: PortalProfile;
  isProfileApproved: boolean;
  isGlobalAdmin: boolean;
  iharcOrganizationId: number | null;
  isIharcMember: boolean;
  orgRoles: Array<{ id: string; name: string; displayName: string | null; roleKind: 'staff' | 'volunteer' }>;
  orgPermissions: string[];
  organizationId: number | null;
  organizationName: string | null;
  organizationFeatures: OrgFeatureKey[];
  canAccessOpsAdmin: boolean;
  canAccessOpsSteviAdmin: boolean;
  canAccessOpsOrg: boolean;
  canAccessOpsFrontline: boolean;
  canManageResources: boolean;
  canManagePolicies: boolean;
  canAccessInventoryOps: boolean;
  canManageInventoryLocations: boolean;
  canManageNotifications: boolean;
  canReviewProfiles: boolean;
  canViewMetrics: boolean;
  canViewCosts: boolean;
  canManageCosts: boolean;
  canReportCosts: boolean;
  canAdminCosts: boolean;
  canReadSensitiveObservations: boolean;
  canReadRestrictedObservations: boolean;
  canPromoteObservations: boolean;
  canTrackTime: boolean;
  canViewOwnTime: boolean;
  canViewAllTime: boolean;
  canManageTime: boolean;
  canReadCfs: boolean;
  canCreateCfs: boolean;
  canUpdateCfs: boolean;
  canTriageCfs: boolean;
  canDispatchCfs: boolean;
  canShareCfs: boolean;
  canPublicTrackCfs: boolean;
  canDeleteCfs: boolean;
  canAccessCfs: boolean;
  canManageWebsiteContent: boolean;
  canManageSiteFooter: boolean;
  canManageConsents: boolean;
  canManageOrgUsers: boolean;
  canManageOrgInvites: boolean;
  actingOrgChoices: Array<{ id: number; name: string | null }>;
  actingOrgChoicesCount: number | null;
  actingOrgAutoSelected: boolean;
};

type PortalAccessOptions = {
  allowSideEffects?: boolean;
};

type AccessUserProfile = {
  user: { id: string; email: string | null };
  profile: PortalProfile;
  isGlobalAdmin: boolean;
  isProfileApproved: boolean;
};

type OrganizationContext = {
  profile: PortalProfile;
  organizationId: number | null;
  organizationName: string | null;
  organizationFeatures: OrgFeatureKey[];
  actingOrgChoices: Array<{ id: number; name: string | null }>;
  actingOrgChoicesCount: number | null;
  actingOrgAutoSelected: boolean;
  isIharcMember: boolean;
  iharcOrganizationId: number | null;
};

type AccessSummaryInput = {
  user: { id: string; email: string | null };
  profile: PortalProfile;
  isProfileApproved: boolean;
  isGlobalAdmin: boolean;
  permissionSummary: string[];
  orgRoles: PortalAccess['orgRoles'];
  orgPermissions: string[];
  iharcPermissions: string[];
  organizationContext: OrganizationContext;
};

export function assertOrganizationSelected(
  access: PortalAccess | null,
  message = 'Select an organization to continue.',
): asserts access is PortalAccess & { organizationId: number } {
  if (!access || !access.organizationId) {
    throw new Error(message);
  }
}

export async function loadPortalAccess(
  supabase: SupabaseAnyServerClient,
  options: PortalAccessOptions = {},
): Promise<PortalAccess | null> {
  const userContext = await resolveUserProfile(supabase);
  if (!userContext) {
    return null;
  }

  const { user, profile: baseProfile, isGlobalAdmin, isProfileApproved } = userContext;
  const { permissionSummary } = await resolvePermissions(supabase, user.id, null);
  const iharcOrganization = await fetchIharcOrganization(supabase);
  const iharcOrganizationId = iharcOrganization?.id ?? null;
  const iharcPermissions = iharcOrganizationId ? await fetchOrgPermissions(supabase, iharcOrganizationId) : [];

  const organizationContext = await resolveOrganizationContext({
    supabase,
    profile: baseProfile,
    userId: user.id,
    isGlobalAdmin,
    isProfileApproved,
    permissionSummary,
    iharcOrganization,
    allowSideEffects: options.allowSideEffects ?? false,
  });

  const orgRoles = organizationContext.organizationId
    ? await fetchOrgRoles(supabase, organizationContext.organizationId)
    : [];
  const { orgPermissions } = await resolvePermissions(
    supabase,
    user.id,
    organizationContext.organizationId,
    permissionSummary,
  );

  return buildAccessSummary({
    user,
    profile: organizationContext.profile,
    isProfileApproved,
    isGlobalAdmin,
    permissionSummary,
    orgRoles,
    orgPermissions,
    iharcPermissions,
    organizationContext,
  });
}

async function resolvePermissions(
  supabase: SupabaseAnyServerClient,
  userId: string,
  organizationId: number | null,
  permissionSummary?: string[],
): Promise<{ permissionSummary: string[]; orgPermissions: string[] }> {
  const resolvedSummary = permissionSummary ?? (await fetchPermissionSummary(supabase, userId));
  const orgPermissions = organizationId ? await fetchOrgPermissions(supabase, organizationId) : [];
  return { permissionSummary: resolvedSummary, orgPermissions };
}

function buildAccessSummary({
  user,
  profile,
  isProfileApproved,
  isGlobalAdmin,
  permissionSummary,
  orgRoles,
  orgPermissions,
  iharcPermissions,
  organizationContext,
}: AccessSummaryInput): PortalAccess {
  const effectivePermissions = organizationContext.organizationId ? orgPermissions : permissionSummary;
  const hasPermission = (permissionName: string) => effectivePermissions.includes(permissionName);

  const canAccessOpsSteviAdmin = isProfileApproved && isGlobalAdmin;
  const canAccessOpsAdmin =
    isProfileApproved && (isGlobalAdmin || hasPermission('portal.manage_org_users') || hasPermission('portal.admin'));
  const canAccessOpsOrg =
    isProfileApproved &&
    (isGlobalAdmin ||
      hasPermission('portal.access_org') ||
      hasPermission('portal.manage_org_users') ||
      hasPermission('portal.manage_org_invites'));
  const canAccessOpsFrontline = isProfileApproved && (isGlobalAdmin || hasPermission('portal.access_frontline'));

  const canManageResources = isProfileApproved && (isGlobalAdmin || iharcPermissions.includes('portal.manage_resources'));
  const canManagePolicies = isProfileApproved && (isGlobalAdmin || iharcPermissions.includes('portal.manage_policies'));
  const canAccessInventoryOps = isProfileApproved && (hasPermission('inventory.read') || hasPermission('inventory.admin'));
  const canManageInventoryLocations = isProfileApproved && hasPermission('inventory.admin');

  const canManageNotifications = isProfileApproved && (isGlobalAdmin || iharcPermissions.includes('portal.manage_notifications'));
  const canManageWebsiteContent = isProfileApproved && (isGlobalAdmin || iharcPermissions.includes('portal.manage_website'));
  const canManageSiteFooter = isProfileApproved && (isGlobalAdmin || iharcPermissions.includes('portal.manage_footer'));
  const canManageConsents = isProfileApproved && hasPermission('portal.manage_consents');
  const canReviewProfiles = isProfileApproved && hasPermission('portal.review_profiles');
  const canViewMetrics = isProfileApproved && hasPermission('portal.view_metrics');
  const canViewCosts =
    isProfileApproved &&
    (isGlobalAdmin ||
      hasPermission('cost.view') ||
      hasPermission('cost.report') ||
      hasPermission('cost.manage') ||
      hasPermission('cost.admin'));
  const canManageCosts = isProfileApproved && (isGlobalAdmin || hasPermission('cost.manage') || hasPermission('cost.admin'));
  const canReportCosts = isProfileApproved && (isGlobalAdmin || hasPermission('cost.report') || hasPermission('cost.admin'));
  const canAdminCosts = isProfileApproved && (isGlobalAdmin || hasPermission('cost.admin'));
  const canReadSensitiveObservations =
    isProfileApproved &&
    (isGlobalAdmin || hasPermission('observations.read_sensitive') || hasPermission('observations.read_restricted'));
  const canReadRestrictedObservations = isProfileApproved && (isGlobalAdmin || hasPermission('observations.read_restricted'));
  const canPromoteObservations = isProfileApproved && (isGlobalAdmin || hasPermission('observations.promote'));
  const canTrackTime = isProfileApproved && hasPermission('staff_time.track');
  const canViewOwnTime = isProfileApproved && (hasPermission('staff_time.view_self') || canTrackTime);
  const canViewAllTime = isProfileApproved && (hasPermission('staff_time.view_all') || hasPermission('staff_time.manage'));
  const canManageTime = isProfileApproved && hasPermission('staff_time.manage');
  const canReadCfs = isProfileApproved && hasPermission('cfs.read');
  const canCreateCfs = isProfileApproved && hasPermission('cfs.create');
  const canUpdateCfs = isProfileApproved && hasPermission('cfs.update');
  const canTriageCfs = isProfileApproved && hasPermission('cfs.triage');
  const canDispatchCfs = isProfileApproved && hasPermission('cfs.dispatch');
  const canShareCfs = isProfileApproved && hasPermission('cfs.share');
  const canPublicTrackCfs = isProfileApproved && hasPermission('cfs.public_track');
  const canDeleteCfs = isProfileApproved && hasPermission('cfs.delete');
  const canAccessCfs =
    isProfileApproved && (canReadCfs || canCreateCfs || canUpdateCfs || canTriageCfs || canDispatchCfs);
  const canManageOrgUsers = isProfileApproved && hasPermission('portal.manage_org_users');
  const canManageOrgInvites =
    isProfileApproved && (hasPermission('portal.manage_org_invites') || hasPermission('portal.manage_org_users'));

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    isProfileApproved,
    isGlobalAdmin,
    iharcOrganizationId: organizationContext.iharcOrganizationId,
    isIharcMember: organizationContext.isIharcMember,
    orgRoles,
    orgPermissions,
    organizationId: organizationContext.organizationId,
    organizationName: organizationContext.organizationName,
    organizationFeatures: organizationContext.organizationFeatures,
    canAccessOpsAdmin,
    canAccessOpsSteviAdmin,
    canAccessOpsOrg,
    canAccessOpsFrontline,
    canManageResources,
    canManagePolicies,
    canAccessInventoryOps,
    canManageInventoryLocations,
    canManageNotifications,
    canManageWebsiteContent,
    canReviewProfiles,
    canViewMetrics,
    canViewCosts,
    canManageCosts,
    canReportCosts,
    canAdminCosts,
    canReadSensitiveObservations,
    canReadRestrictedObservations,
    canPromoteObservations,
    canTrackTime,
    canViewOwnTime,
    canViewAllTime,
    canManageTime,
    canReadCfs,
    canCreateCfs,
    canUpdateCfs,
    canTriageCfs,
    canDispatchCfs,
    canShareCfs,
    canPublicTrackCfs,
    canDeleteCfs,
    canAccessCfs,
    canManageSiteFooter,
    canManageConsents,
    canManageOrgUsers,
    canManageOrgInvites,
    actingOrgChoices: organizationContext.actingOrgChoices,
    actingOrgChoicesCount: organizationContext.actingOrgChoicesCount,
    actingOrgAutoSelected: organizationContext.actingOrgAutoSelected,
  };
}

async function resolveUserProfile(supabase: SupabaseAnyServerClient): Promise<AccessUserProfile | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await ensurePortalProfile(supabase, user.id);
  const globalRoles = await fetchGlobalRoles(supabase, user.id);
  const isGlobalAdmin = globalRoles.includes('iharc_admin');
  const isProfileApproved = profile.affiliation_status === 'approved';

  return {
    user: { id: user.id, email: user.email ?? null },
    profile,
    isGlobalAdmin,
    isProfileApproved,
  };
}

async function resolveOrganizationContext({
  supabase,
  profile,
  userId,
  isGlobalAdmin,
  isProfileApproved,
  permissionSummary,
  iharcOrganization,
  allowSideEffects,
}: {
  supabase: SupabaseAnyServerClient;
  profile: PortalProfile;
  userId: string;
  isGlobalAdmin: boolean;
  isProfileApproved: boolean;
  permissionSummary: string[];
  iharcOrganization: { id: number; name: string | null } | null;
  allowSideEffects: boolean;
}): Promise<OrganizationContext> {
  let updatedProfile = profile;
  let organizationId = profile.organization_id ?? null;
  let organizationName: string | null = null;
  let organizationFeatures: OrgFeatureKey[] = [];

  let actingOrgChoicesCount: number | null = null;
  let actingOrgAutoSelected = false;
  let actingOrgChoices: Array<{ id: number; name: string | null }> = [];
  let isIharcMember = false;
  const iharcOrganizationId = iharcOrganization?.id ?? null;

  const hasOpsRole = isProfileApproved && (permissionSummary.length > 0 || isGlobalAdmin);

  if (hasOpsRole) {
    const accessibleOrganizations = await fetchAccessibleOrganizations(supabase, userId, isGlobalAdmin);
    const accessibleOrgSet = new Map<number, string | null>();
    accessibleOrganizations.forEach((org) => accessibleOrgSet.set(org.id, org.name ?? null));

    if (iharcOrganization) {
      accessibleOrgSet.set(iharcOrganization.id, iharcOrganization.name ?? null);
    }

    if (organizationId !== null && !accessibleOrgSet.has(organizationId)) {
      accessibleOrgSet.set(organizationId, organizationName ?? null);
    }

    actingOrgChoicesCount = accessibleOrgSet.size;
    actingOrgChoices = Array.from(accessibleOrgSet.entries()).map(([id, name]) => ({ id, name }));
    if (iharcOrganizationId) {
      isIharcMember = accessibleOrgSet.has(iharcOrganizationId);
    }

    if (allowSideEffects && isGlobalAdmin && !organizationId && iharcOrganization) {
      const applied = await applyActingOrgSelection(supabase, updatedProfile.id, iharcOrganization.id);
      if (applied) {
        organizationId = iharcOrganization.id;
        organizationName = iharcOrganization.name ?? organizationName;
        actingOrgAutoSelected = true;
        updatedProfile = { ...updatedProfile, organization_id: iharcOrganization.id };
        actingOrgChoices = [{ id: iharcOrganization.id, name: iharcOrganization.name ?? null }];
        actingOrgChoicesCount = actingOrgChoices.length;
      }
    }

    if (allowSideEffects && !organizationId && accessibleOrgSet.size === 1) {
      const [soleOrgId, soleOrgName] = accessibleOrgSet.entries().next().value as [number, string | null];
      const applied = await applyActingOrgSelection(supabase, updatedProfile.id, soleOrgId);
      if (applied) {
        organizationId = soleOrgId;
        organizationName = soleOrgName ?? organizationName;
        actingOrgAutoSelected = true;
        updatedProfile = { ...updatedProfile, organization_id: soleOrgId };
      }
    }
  }

  if (organizationId) {
    const summary = await fetchOrganizationSummary(supabase, organizationId);
    organizationName = summary.name ?? organizationName;
    organizationFeatures = summary.features;
    updatedProfile = { ...updatedProfile, organization_id: organizationId };
  }

  return {
    profile: updatedProfile,
    organizationId,
    organizationName,
    organizationFeatures,
    actingOrgChoices,
    actingOrgChoicesCount,
    actingOrgAutoSelected,
    isIharcMember,
    iharcOrganizationId,
  };
}

async function applyActingOrgSelection(
  supabase: SupabaseAnyServerClient,
  profileId: string,
  organizationId: number,
): Promise<boolean> {
  const { error } = await supabase
    .schema('portal')
    .from('profiles')
    .update({ organization_id: organizationId, requested_organization_name: null })
    .eq('id', profileId);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unable to auto-select acting org', error);
    }
    return false;
  }

  return true;
}

async function fetchGlobalRoles(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase.schema('core').rpc('get_actor_global_roles', { p_user: userId });

  if (error) {
    throw new Error('Unable to load your roles right now. Please try again or contact support.');
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'role_name' in entry && typeof entry.role_name === 'string') {
        return entry.role_name;
      }
      return null;
    })
    .filter((role): role is string => Boolean(role));
}

async function fetchOrgRoles(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<Array<{ id: string; name: string; displayName: string | null; roleKind: 'staff' | 'volunteer' }>> {
  const { data, error } = await supabase.schema('core').rpc('get_actor_org_roles', { p_org_id: organizationId });

  if (error) {
    throw new Error('Unable to load your roles right now. Please try again or contact support.');
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      if ('role_id' in entry && 'role_name' in entry) {
        return {
          id: String(entry.role_id),
          name: String(entry.role_name),
          displayName: typeof entry.role_display_name === 'string' ? entry.role_display_name : null,
          roleKind: entry.role_kind === 'volunteer' ? 'volunteer' : 'staff',
        };
      }
      return null;
    })
    .filter((entry): entry is { id: string; name: string; displayName: string | null; roleKind: 'staff' | 'volunteer' } => Boolean(entry));
}

async function fetchOrgPermissions(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<string[]> {
  const { data, error } = await supabase.schema('core').rpc('get_actor_org_permissions', { p_org_id: organizationId });

  if (error) {
    throw new Error('Unable to load your permissions right now. Please try again or contact support.');
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'permission_name' in entry && typeof entry.permission_name === 'string') {
        return entry.permission_name;
      }
      return null;
    })
    .filter((permission): permission is string => Boolean(permission));
}

async function fetchPermissionSummary(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase.schema('core').rpc('get_actor_permissions_summary', { p_user: userId });

  if (error) {
    throw new Error('Unable to load your permissions right now. Please try again or contact support.');
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'permission_name' in entry && typeof entry.permission_name === 'string') {
        return entry.permission_name;
      }
      return null;
    })
    .filter((permission): permission is string => Boolean(permission));
}

async function fetchOrganizationSummary(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<{ name: string | null; features: OrgFeatureKey[] }> {
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('name, services_tags')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) {
    console.warn('Unable to load organization summary', error);
    return { name: null, features: [] };
  }

  const name = data?.name ?? null;
  const features = extractOrgFeatureFlags((data as { services_tags?: Json | null } | null)?.services_tags ?? null);
  return { name, features };
}

async function fetchIharcOrganization(
  supabase: SupabaseAnyServerClient,
): Promise<{ id: number; name: string | null } | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, is_active')
    .ilike('name', 'iharc')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unable to load IHARC organization', error);
    }
    return null;
  }

  if (!data || typeof data.id !== 'number') {
    return null;
  }

  return { id: data.id, name: typeof data.name === 'string' ? data.name : null };
}

async function fetchAccessibleOrganizations(
  supabase: SupabaseAnyServerClient,
  userId: string,
  isGlobalAdmin: boolean,
  limit = 50,
): Promise<Array<{ id: number; name: string | null }>> {
  try {
    const core = supabase.schema('core');

    if (isGlobalAdmin) {
      const { data: organizations, error: orgError } = await core
        .from('organizations')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name')
        .limit(limit);
      if (orgError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Unable to load organizations for admin', orgError);
        }
        return [];
      }
      return (organizations ?? []).map((org: { id: number; name: string | null }) => ({ id: org.id, name: org.name ?? null }));
    }

    const { data: roleRows, error: roleError } = await core
      .from('user_org_roles')
      .select('organization_id')
      .eq('user_id', userId);

    if (roleError || !roleRows?.length) {
      return [];
    }

    const orgIds = Array.from(
      new Set(
        (roleRows ?? [])
          .map((row: { organization_id: number | null }) => (row.organization_id ? Number(row.organization_id) : null))
          .filter((id: number | null): id is number => typeof id === 'number' && Number.isFinite(id)),
      ),
    ).slice(0, limit);

    if (orgIds.length === 0) return [];

    const { data: organizations, error: orgError } = await core
      .from('organizations')
      .select('id, name, is_active')
      .in('id', orgIds)
      .eq('is_active', true)
      .order('name')
      .limit(limit);

    if (orgError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to load accessible organizations', orgError);
      }
      return [];
    }

    return (organizations ?? []).map((org: { id: number; name: string | null }) => ({ id: org.id, name: org.name ?? null }));
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unexpected error while loading accessible organizations', error);
    }
    return [];
  }
}
