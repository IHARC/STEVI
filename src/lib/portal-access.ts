import type { AppIconName } from '@/lib/app-icons';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { type IharcRole, type PortalRole } from '@/lib/ihar-auth';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import { getInventoryRoles } from '@/lib/enum-values';
import { getWorkspaceNavBlueprint } from '@/lib/workspace-nav-blueprints';
import type { WorkspaceId } from '@/lib/workspace-types';

export type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: AppIconName;
  match?: string[];
};

export type NavGroup = {
  id: string;
  label: string;
  icon?: AppIconName;
  items: PortalLink[];
};

export type WorkspaceNav = {
  id: WorkspaceId;
  label: string;
  defaultRoute: string;
  groups: NavGroup[];
};

const WORKSPACE_NAV_ORDER: WorkspaceId[] = ['client', 'admin', 'staff', 'org'];

export type PortalAccess = {
  userId: string;
  email: string | null;
  profile: PortalProfile;
  isProfileApproved: boolean;
  iharcRoles: IharcRole[];
  portalRoles: PortalRole[];
  organizationId: number | null;
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
};

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

  const profile = await ensurePortalProfile(supabase, user.id);
  const roles = await fetchUserRoles(supabase, user.id);

  const iharcRoles = roles.filter((role): role is IharcRole => role.startsWith('iharc_'));
  const portalRoles = roles.filter((role): role is PortalRole => role.startsWith('portal_'));
  const inventoryAllowedRoles = (await getInventoryRoles(supabase)).filter((role): role is IharcRole =>
    role.startsWith('iharc_'),
  );
  const organizationId = profile.organization_id ?? null;
  const isProfileApproved = profile.affiliation_status === 'approved';

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

function workspaceIsAllowed(access: PortalAccess, workspaceId: WorkspaceId): boolean {
  if (workspaceId === 'client') return true;
  if (workspaceId === 'admin') return access.canAccessAdminWorkspace;
  if (workspaceId === 'org') return access.canAccessOrgWorkspace;
  if (workspaceId === 'staff') return access.canAccessStaffWorkspace;
  return false;
}

type GuardedLink = { requires?: (access: PortalAccess) => boolean };

function linkIsAllowed(blueprint: GuardedLink, access: PortalAccess): boolean {
  if (blueprint.requires && !blueprint.requires(access)) {
    return false;
  }
  return true;
}

function resolveWorkspace(access: PortalAccess | null, workspaceId: WorkspaceId): WorkspaceNav | null {
  if (!access) return null;
  if (!workspaceIsAllowed(access, workspaceId)) return null;

  const blueprint = getWorkspaceNavBlueprint(workspaceId);
  if (!blueprint) return null;

  const groups = blueprint.groups
    .map<NavGroup | null>((group) => {
      const items = group.items
        .filter((item) => linkIsAllowed(item, access))
        .map(({ href, label, exact, icon, match }) => ({ href, label, exact, icon, match }));

      if (items.length === 0) {
        return null;
      }

      return { id: group.id, label: group.label, icon: group.icon, items };
    })
    .filter(Boolean) as NavGroup[];

  if (groups.length === 0) {
    return null;
  }

  return {
    id: blueprint.id,
    label: blueprint.label,
    defaultRoute: blueprint.defaultRoute,
    groups,
  };
}

export function resolveClientNavLinks(access: PortalAccess | null): PortalLink[] {
  const nav = resolveWorkspace(access, 'client');
  if (!nav) return [];
  return nav.groups.flatMap((group) => group.items);
}

export function resolveAdminWorkspaceNav(access: PortalAccess | null): WorkspaceNav | null {
  return resolveWorkspace(access, 'admin');
}

export function resolveOrgWorkspaceNav(access: PortalAccess | null): WorkspaceNav | null {
  return resolveWorkspace(access, 'org');
}

export function resolveStaffWorkspaceNav(access: PortalAccess | null): WorkspaceNav | null {
  return resolveWorkspace(access, 'staff');
}

export function resolveWorkspaceNavForShell(
  access: PortalAccess | null,
  workspaceId: WorkspaceId,
): WorkspaceNav | null {
  return resolveWorkspace(access, workspaceId);
}

const PUBLIC_CLIENT_LINKS: PortalLink[] = (() => {
  const blueprint = getWorkspaceNavBlueprint('client');
  if (!blueprint) return [];

  return blueprint.groups.flatMap((group) =>
    group.items
      .filter((item) => !item.requires)
      .map(({ href, label, exact, icon, match }) => ({ href, label, exact, icon, match })),
  );
})();

export function getPublicPortalLinks(): PortalLink[] {
  return PUBLIC_CLIENT_LINKS.map((link) => ({ ...link }));
}

type MenuLinkBlueprint = PortalLink & { requires?: (access: PortalAccess) => boolean };

const USER_MENU_BLUEPRINT: MenuLinkBlueprint[] = [
  { href: '/profile', label: 'Profile' },
  { href: '/support', label: 'Support' },
  {
    href: '/home',
    label: 'Client portal preview',
    requires: (access) => access.canAccessStaffWorkspace || access.canAccessAdminWorkspace,
  },
  {
    href: '/admin',
    label: 'Admin workspace',
    requires: (access) => access.canAccessAdminWorkspace,
  },
  {
    href: '/org',
    label: 'Organization workspace',
    requires: (access) => access.canAccessOrgWorkspace,
  },
  {
    href: '/staff',
    label: 'Staff workspace',
    requires: (access) => access.canAccessStaffWorkspace,
  },
];

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

export function buildUserMenuLinks(access: PortalAccess): PortalLink[] {
  const links = USER_MENU_BLUEPRINT.filter((entry) => linkIsAllowed(entry, access)).map(
    ({ href, label }) => ({ href, label }),
  );

  return dedupeLinks(links);
}

export type CommandPaletteItem = PortalLink & { group: string };

export function buildCommandPaletteItems(
  access: PortalAccess | null,
  extraItems: CommandPaletteItem[] = [],
): CommandPaletteItem[] {
  if (!access) return [];

  const MAX_ITEMS = 20;

  const workspaceCommands = WORKSPACE_NAV_ORDER
    .map((workspaceId) => resolveWorkspace(access, workspaceId))
    .filter((nav): nav is WorkspaceNav => Boolean(nav))
    .flatMap((nav) =>
      nav.groups.flatMap((group) =>
        group.items.map((item) => ({ ...item, group: group.label || nav.label })),
      ),
    );

  // Prioritise contextual actions/entities first, then workspace navigation links; cap to keep palette fast.
  const ordered = [...extraItems, ...workspaceCommands];

  const unique = dedupeLinks<CommandPaletteItem>(ordered);
  return unique.slice(0, MAX_ITEMS);
}
