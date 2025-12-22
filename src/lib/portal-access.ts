import type { AppIconName } from '@/lib/app-icons';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import { buildPortalNav, flattenNavItemsForCommands, type NavSection } from '@/lib/portal-navigation';

export type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: AppIconName;
  match?: string[];
};

export type PortalAccess = {
  userId: string;
  email: string | null;
  profile: PortalProfile;
  isProfileApproved: boolean;
  isGlobalAdmin: boolean;
  iharcOrganizationId: number | null;
  isIharcMember: boolean;
  orgRoles: Array<{ id: string; name: string; displayName: string | null }>;
  orgPermissions: string[];
  organizationId: number | null;
  organizationName: string | null;
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
  canManageWebsiteContent: boolean;
  canManageSiteFooter: boolean;
  canManageConsents: boolean;
  canManageOrgUsers: boolean;
  canManageOrgInvites: boolean;
  actingOrgChoices: Array<{ id: number; name: string | null }>;
  actingOrgChoicesCount: number | null;
  actingOrgAutoSelected: boolean;
};

export function assertOrganizationSelected(access: PortalAccess | null, message = 'Select an organization to continue.'): asserts access is PortalAccess & { organizationId: number } {
  if (!access || !access.organizationId) {
    throw new Error(message);
  }
}

export async function loadPortalAccess(
  supabase: SupabaseAnyServerClient,
): Promise<PortalAccess | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  let profile = await ensurePortalProfile(supabase, user.id);
  const globalRoles = await fetchGlobalRoles(supabase, user.id);
  const isGlobalAdmin = globalRoles.includes('iharc_admin');

  let organizationId = profile.organization_id ?? null;
  let organizationName = organizationId ? await fetchOrganizationName(supabase, organizationId) : null;
  const isProfileApproved = profile.affiliation_status === 'approved';

  let actingOrgChoicesCount: number | null = null;
  let actingOrgAutoSelected = false;
  let actingOrgChoices: Array<{ id: number; name: string | null }> = [];
  let isIharcMember = false;
  const iharcOrganization = await fetchIharcOrganization(supabase);
  const iharcOrganizationId = iharcOrganization?.id ?? null;
  const permissionSummary = await fetchPermissionSummary(supabase, user.id);
  const iharcPermissions = iharcOrganizationId ? await fetchOrgPermissions(supabase, iharcOrganizationId) : [];

  const hasOpsRole = isProfileApproved && (permissionSummary.length > 0 || isGlobalAdmin);

  if (hasOpsRole) {
    const accessibleOrganizations = await fetchAccessibleOrganizations(supabase, user.id, isGlobalAdmin);
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

    if (isGlobalAdmin && !organizationId && iharcOrganization) {
      const { error } = await supabase
        .schema('portal')
        .from('profiles')
        .update({ organization_id: iharcOrganization.id, requested_organization_name: null })
        .eq('id', profile.id);

      if (!error) {
        organizationId = iharcOrganization.id;
        organizationName = iharcOrganization.name ?? organizationName;
        actingOrgAutoSelected = true;
        profile = { ...profile, organization_id: iharcOrganization.id };
        actingOrgChoices = [{ id: iharcOrganization.id, name: iharcOrganization.name ?? null }];
        actingOrgChoicesCount = actingOrgChoices.length;
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to auto-select IHARC acting org for admin', error);
      }
    }

    if (!organizationId && accessibleOrgSet.size === 1) {
      const [soleOrgId, soleOrgName] = accessibleOrgSet.entries().next().value as [number, string | null];
      const { error } = await supabase
        .schema('portal')
        .from('profiles')
        .update({ organization_id: soleOrgId, requested_organization_name: null })
        .eq('id', profile.id);

      if (!error) {
        organizationId = soleOrgId;
        organizationName = soleOrgName ?? organizationName;
        actingOrgAutoSelected = true;
        profile = { ...profile, organization_id: soleOrgId };
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to auto-select acting org', error);
      }
    } else if (organizationId && !organizationName) {
      organizationName = await fetchOrganizationName(supabase, organizationId);
      profile = { ...profile, organization_id: organizationId };
    }
  }

  const orgRoles = organizationId ? await fetchOrgRoles(supabase, organizationId) : [];
  const orgPermissions = organizationId ? await fetchOrgPermissions(supabase, organizationId) : [];
  const effectivePermissions = organizationId ? orgPermissions : permissionSummary;
  const hasPermission = (permissionName: string) => effectivePermissions.includes(permissionName);

  const canAccessOpsSteviAdmin = isProfileApproved && isGlobalAdmin;
  const canAccessOpsAdmin = isProfileApproved && (isGlobalAdmin || hasPermission('portal.manage_org_users') || hasPermission('portal.admin'));
  const canAccessOpsOrg = isProfileApproved && (isGlobalAdmin || hasPermission('portal.access_org') || hasPermission('portal.manage_org_users') || hasPermission('portal.manage_org_invites'));
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
  const canManageOrgUsers = isProfileApproved && hasPermission('portal.manage_org_users');
  const canManageOrgInvites = isProfileApproved && (hasPermission('portal.manage_org_invites') || hasPermission('portal.manage_org_users'));

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    isProfileApproved,
    isGlobalAdmin,
    iharcOrganizationId,
    isIharcMember,
    orgRoles,
    orgPermissions,
    organizationId,
    organizationName,
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
    canManageSiteFooter,
    canManageConsents,
    canManageOrgUsers,
    canManageOrgInvites,
    actingOrgChoices,
    actingOrgChoicesCount,
    actingOrgAutoSelected,
  };
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
): Promise<Array<{ id: string; name: string; displayName: string | null }>> {
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
        };
      }
      return null;
    })
    .filter((entry): entry is { id: string; name: string; displayName: string | null } => Boolean(entry));
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

async function fetchOrganizationName(supabase: SupabaseAnyServerClient, organizationId: number): Promise<string | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) {
    console.warn('Unable to load organization name', error);
    return null;
  }

  return data?.name ?? null;
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

type MenuLinkBlueprint = PortalLink & { requires?: (access: PortalAccess) => boolean };

const OPS_PROFILE_PATH = '/ops/profile';

function userMenuBlueprint(access: PortalAccess): MenuLinkBlueprint[] {
  const profileHref = access.canAccessOpsAdmin || access.canAccessOpsFrontline || access.canAccessOpsOrg ? OPS_PROFILE_PATH : '/profile';

  return [
    { href: profileHref, label: 'Profile' },
    { href: '/support', label: 'Support' },
    {
      href: '/ops/today',
      label: 'Operations',
      requires: (a) => a.canAccessOpsFrontline,
    },
    {
      href: '/app-admin',
      label: 'STEVI Admin',
      requires: (a) => a.canAccessOpsSteviAdmin,
    },
    {
      href: '/home?preview=1',
      label: 'Preview client portal',
      requires: (a) => a.canAccessOpsFrontline || a.canAccessOpsAdmin || a.canAccessOpsOrg,
    },
  ];
}

function dedupeLinks<T extends { href: string }>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) {
      return false;
    }
    seen.add(link.href);
    return true;
  });
}

function linkIsAllowed(entry: { requires?: (access: PortalAccess) => boolean }, access: PortalAccess): boolean {
  if (entry.requires && !entry.requires(access)) {
    return false;
  }
  return true;
}

const HUB_TAB_COMMANDS: { href: string; label: string; group: string; requires: (access: PortalAccess) => boolean }[] = [
  { href: '/ops/clients?view=directory', label: 'Client directory', group: 'Clients', requires: (access) => access.canAccessOpsFrontline || access.canManageConsents },
  { href: '/ops/clients?view=caseload', label: 'My caseload', group: 'Clients', requires: (access) => access.canAccessOpsFrontline },
  { href: '/ops/programs?view=overview', label: 'Programs', group: 'Programs', requires: (access) => access.canAccessOpsFrontline || access.canAccessOpsAdmin },
  { href: '/ops/inventory?view=dashboard', label: 'Inventory', group: 'Inventory', requires: (access) => access.canAccessInventoryOps },
  { href: '/ops/organizations', label: 'Organizations', group: 'Organizations', requires: (access) => access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canAccessOpsSteviAdmin },
];

export function buildUserMenuLinks(access: PortalAccess): PortalLink[] {
  const links = userMenuBlueprint(access).filter((entry) => linkIsAllowed(entry, access)).map(
    ({ href, label }) => ({ href, label }),
  );

  return dedupeLinks(links);
}

export type CommandPaletteItem = PortalLink & { group: string };

export function buildCommandPaletteItems(
  access: PortalAccess | null,
  navSections: NavSection[] | null,
  extraItems: CommandPaletteItem[] = [],
): CommandPaletteItem[] {
  if (!access) return [];
  const sections = navSections ?? buildPortalNav(access);
  const navCommands = flattenNavItemsForCommands(sections).map((item) => ({ ...item }));
  const hubCommands = HUB_TAB_COMMANDS.filter((entry) => entry.requires(access)).map(({ href, label, group }) => ({
    href,
    label,
    group,
  }));

  const ordered = [...extraItems, ...hubCommands, ...navCommands];
  const unique = dedupeLinks<CommandPaletteItem>(ordered);
  return unique;
}
