import type { AppIconName } from '@/lib/app-icons';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { type IharcRole, type PortalRole } from '@/lib/ihar-auth';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import { getInventoryRoles } from '@/lib/enum-values';
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
  iharcRoles: IharcRole[];
  portalRoles: PortalRole[];
  organizationId: number | null;
  organizationName: string | null;
  canAccessAdminWorkspace: boolean;
  canAccessOrgWorkspace: boolean;
  canManageResources: boolean;
  canManagePolicies: boolean;
  canAccessInventoryWorkspace: boolean;
  canManageNotifications: boolean;
  canReviewProfiles: boolean;
  canViewMetrics: boolean;
  canManageWebsiteContent: boolean;
  canManageSiteFooter: boolean;
  canManageConsents: boolean;
  canManageOrgUsers: boolean;
  canManageOrgInvites: boolean;
  canAccessStaffWorkspace: boolean;
  inventoryAllowedRoles: IharcRole[];
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
  const roles = await fetchUserRoles(supabase, user.id);

  const iharcRoles = roles.filter((role): role is IharcRole => role.startsWith('iharc_'));
  const portalRoles = roles.filter((role): role is PortalRole => role.startsWith('portal_'));
  const inventoryAllowedRoles = (await getInventoryRoles(supabase)).filter((role): role is IharcRole =>
    role.startsWith('iharc_'),
  );

  let organizationId = profile.organization_id ?? null;
  let organizationName = organizationId ? await fetchOrganizationName(supabase, organizationId) : null;
  const isProfileApproved = profile.affiliation_status === 'approved';

  let actingOrgChoicesCount: number | null = null;
  let actingOrgAutoSelected = false;

  const hasWorkspaceRole = isProfileApproved && (portalRoles.length > 0 || iharcRoles.length > 0);

  if (hasWorkspaceRole) {
    const accessibleOrganizations = await fetchAccessibleOrganizations(supabase, user.id);
    const accessibleOrgSet = new Map<number, string | null>();
    accessibleOrganizations.forEach((org) => accessibleOrgSet.set(org.id, org.name ?? null));
    if (organizationId !== null && !accessibleOrgSet.has(organizationId)) {
      accessibleOrgSet.set(organizationId, organizationName ?? null);
    }

    actingOrgChoicesCount = accessibleOrgSet.size;

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
        await refreshUserPermissions(supabase, user.id);
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to auto-select acting org', error);
      }
    } else if (organizationId && !organizationName) {
      organizationName = await fetchOrganizationName(supabase, organizationId);
      profile = { ...profile, organization_id: organizationId };
    }
  }

  const isPortalAdmin = portalRoles.includes('portal_admin');
  const isIharcAdmin = iharcRoles.includes('iharc_admin');
  const isOrgAdmin = portalRoles.includes('portal_org_admin');
  const isOrgRep = portalRoles.includes('portal_org_rep');

  const canAccessAdminWorkspace = isProfileApproved && (isPortalAdmin || isIharcAdmin || isOrgAdmin);
  const canAccessOrgWorkspace = isProfileApproved && (isOrgAdmin || isOrgRep) && organizationId !== null;
  const canManageResources = isProfileApproved && isPortalAdmin;
  const canManagePolicies = isProfileApproved && isPortalAdmin;
  const canAccessInventoryWorkspace = isProfileApproved && iharcRoles.some((role) =>
    inventoryAllowedRoles.includes(role),
  );

  const canManageNotifications = isProfileApproved && isPortalAdmin;
  const canManageWebsiteContent = isProfileApproved && isPortalAdmin;
  const canManageSiteFooter = isProfileApproved && isPortalAdmin;
  const canManageConsents = isProfileApproved && (isPortalAdmin || isIharcAdmin);
  const canReviewProfiles = isProfileApproved && (isPortalAdmin || isIharcAdmin);
  const canViewMetrics = isProfileApproved && isPortalAdmin;
  const canManageOrgUsers = isProfileApproved && isOrgAdmin && organizationId !== null;
  const canManageOrgInvites = isProfileApproved && isOrgAdmin && organizationId !== null;
  const canAccessStaffWorkspace = isProfileApproved && iharcRoles.some((role) =>
    ['iharc_admin', 'iharc_supervisor', 'iharc_staff', 'iharc_volunteer'].includes(role),
  );

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    isProfileApproved,
    iharcRoles,
    portalRoles,
    organizationId,
    organizationName,
    canAccessAdminWorkspace,
    canAccessOrgWorkspace,
    canManageResources,
    canManagePolicies,
    canAccessInventoryWorkspace,
    canManageNotifications,
    canManageWebsiteContent,
    canReviewProfiles,
    canViewMetrics,
    canManageSiteFooter,
    canManageConsents,
    canManageOrgUsers,
    canManageOrgInvites,
    canAccessStaffWorkspace,
    inventoryAllowedRoles,
    actingOrgChoicesCount,
    actingOrgAutoSelected,
  };
}

async function fetchUserRoles(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_roles', { user_uuid: userId });

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

async function fetchAccessibleOrganizations(
  supabase: SupabaseAnyServerClient,
  userId: string,
  limit = 10,
): Promise<Array<{ id: number; name: string | null }>> {
  try {
    const core = supabase.schema('core');

    const { data: userPeopleRows, error: userPeopleError } = await core
      .from('user_people')
      .select('person_id')
      .eq('user_id', userId);

    if (userPeopleError || !userPeopleRows?.length) {
      return [];
    }

    const personIds = Array.from(
      new Set(
        userPeopleRows
          .map((row: { person_id: number }) => row.person_id)
          .filter((id: number): id is number => Number.isFinite(id)),
      ),
    );
    if (personIds.length === 0) return [];

    const { data: orgPeopleRows, error: orgPeopleError } = await core
      .from('organization_people')
      .select('organization_id, end_date')
      .in('person_id', personIds)
      .is('end_date', null);

    if (orgPeopleError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to load organization memberships', orgPeopleError);
      }
      return [];
    }

    const orgIds = Array.from(
      new Set(
        (orgPeopleRows ?? [])
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

async function refreshUserPermissions(supabase: SupabaseAnyServerClient, userId: string) {
  try {
    await supabase.rpc('refresh_user_permissions', { user_uuid: userId });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to refresh user permissions after org selection', error);
    }
  }
}

type MenuLinkBlueprint = PortalLink & { requires?: (access: PortalAccess) => boolean };

const WORKSPACE_PROFILE_PATH = '/workspace/profile';

function userMenuBlueprint(access: PortalAccess): MenuLinkBlueprint[] {
  const profileHref = access.canAccessAdminWorkspace || access.canAccessStaffWorkspace || access.canAccessOrgWorkspace
    ? WORKSPACE_PROFILE_PATH
    : '/profile';

  return [
    { href: profileHref, label: 'Profile' },
    { href: '/support', label: 'Support' },
    {
      href: '/workspace/today',
      label: 'Staff tools',
      requires: (a) => a.canAccessStaffWorkspace,
    },
    {
      href: '/org',
      label: 'Organization settings',
      requires: (a) => a.canAccessOrgWorkspace,
    },
    {
      href: '/home?preview=1',
      label: 'Preview client portal',
      requires: (a) => a.canAccessStaffWorkspace || a.canAccessAdminWorkspace || a.canAccessOrgWorkspace,
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
  { href: '/workspace/clients?view=directory', label: 'Client directory', group: 'Clients', requires: (access) => access.canAccessStaffWorkspace || access.canManageConsents },
  { href: '/workspace/clients?view=caseload', label: 'My caseload', group: 'Clients', requires: (access) => access.canAccessStaffWorkspace },
  { href: '/workspace/programs', label: 'Programs', group: 'Programs', requires: (access) => access.canAccessStaffWorkspace || access.canAccessAdminWorkspace },
  { href: '/workspace/supplies', label: 'Supplies', group: 'Supplies', requires: (access) => access.canAccessInventoryWorkspace || access.canAccessAdminWorkspace },
  { href: '/workspace/partners', label: 'Partner directory', group: 'Partners', requires: (access) => access.canAccessAdminWorkspace },
  { href: '/org', label: 'Organization hub', group: 'Organization', requires: (access) => access.canAccessOrgWorkspace || access.canAccessAdminWorkspace },
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
