import type { AppIconName } from '@/lib/app-icons';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { type IharcRole, type PortalRole } from '@/lib/ihar-auth';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import { getInventoryRoles } from '@/lib/enum-values';

export type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: AppIconName;
};

type LinkRequirement = {
  requiresPortalRoles?: PortalRole[];
  requiresIharcRoles?: IharcRole[];
  requiresGuard?: (access: PortalAccess) => boolean;
};

type PortalLinkBlueprint = PortalLink & LinkRequirement;

type NavGroupBlueprint = {
  id: string;
  label: string;
  icon: AppIconName;
  links: PortalLinkBlueprint[];
};

type WorkspaceNavBlueprint = {
  id: string;
  label: string;
  groups: NavGroupBlueprint[];
};

export type NavGroup = {
  id: string;
  label: string;
  icon: AppIconName;
  links: PortalLink[];
};

export type WorkspaceNav = {
  id: string;
  label: string;
  groups: NavGroup[];
};

type WorkspaceId = 'client' | 'admin' | 'org' | 'staff';

const hasElevatedAdminAccess = (access: PortalAccess) =>
  access.isProfileApproved && (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin'));

const canManageUsers = (access: PortalAccess) =>
  access.isProfileApproved && (
    access.portalRoles.includes('portal_admin') ||
    access.iharcRoles.includes('iharc_admin') ||
    access.portalRoles.includes('portal_org_admin')
  );

const CLIENT_NAV_BLUEPRINT: PortalLinkBlueprint[] = [
  { href: '/home', label: 'Home', exact: true },
  { href: '/appointments', label: 'Appointments' },
  { href: '/documents', label: 'Documents' },
  { href: '/cases', label: 'My cases' },
  { href: '/support', label: 'Support' },
  { href: '/profile', label: 'Profile' },
  { href: '/profile/consents', label: 'My consents' },
];

const ADMIN_NAV_BLUEPRINT: WorkspaceNavBlueprint = {
  id: 'admin',
  label: 'Admin workspace',
  groups: [
    {
      id: 'clients',
      label: 'Clients & consents',
      icon: 'users',
      links: [
        {
          href: '/admin/clients',
          label: 'Client directory',
          requiresGuard: (access) => access.canManageConsents,
        },
        {
          href: '/admin/consents',
          label: 'Consent overrides',
          requiresGuard: (access) => access.canManageConsents,
        },
      ],
    },
    {
      id: 'access',
      label: 'Access & people',
      icon: 'users',
      links: [
        {
          href: '/admin/users',
          label: 'Users',
          requiresGuard: canManageUsers,
        },
        {
          href: '/admin/permissions',
          label: 'Permissions',
          requiresGuard: hasElevatedAdminAccess,
        },
        {
          href: '/admin/profiles',
          label: 'Profiles & invites',
          requiresGuard: hasElevatedAdminAccess,
        },
        {
          href: '/admin/organizations',
          label: 'Organizations',
          requiresGuard: hasElevatedAdminAccess,
        },
      ],
    },
    {
      id: 'content',
      label: 'Content & comms',
      icon: 'notebook',
      links: [
        {
          href: '/admin/resources',
          label: 'Resource library',
          requiresGuard: hasElevatedAdminAccess,
        },
        {
          href: '/admin/policies',
          label: 'Policies',
          requiresGuard: hasElevatedAdminAccess,
        },
        {
          href: '/admin/notifications',
          label: 'Notifications',
          requiresGuard: hasElevatedAdminAccess,
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: 'boxes',
      links: [
        {
          href: '/admin/appointments',
          label: 'Appointments',
          requiresGuard: hasElevatedAdminAccess,
        },
        {
          href: '/admin/inventory',
          label: 'Inventory workspace',
          requiresGuard: (access) => access.canAccessInventoryWorkspace,
        },
        {
          href: '/admin/donations',
          label: 'Donations catalogue',
          requiresIharcRoles: ['iharc_admin'],
        },
      ],
    },
    {
      id: 'website',
      label: 'Website',
      icon: 'globe',
      links: [
        {
          href: '/admin/marketing/navigation',
          label: 'Navigation',
          requiresGuard: (access) => access.canManageWebsiteContent,
        },
        {
          href: '/admin/marketing/branding',
          label: 'Branding',
          requiresGuard: (access) => access.canManageWebsiteContent,
        },
        {
          href: '/admin/marketing/home',
          label: 'Home & context',
          requiresGuard: (access) => access.canManageWebsiteContent,
        },
        {
          href: '/admin/marketing/supports',
          label: 'Supports',
          requiresGuard: (access) => access.canManageWebsiteContent,
        },
        {
          href: '/admin/marketing/programs',
          label: 'Programs',
          requiresGuard: (access) => access.canManageWebsiteContent,
        },
        {
          href: '/admin/marketing/footer',
          label: 'Footer',
          requiresGuard: (access) => access.canManageWebsiteContent,
        },
      ],
    },
  ],
};

const ORG_NAV_BLUEPRINT: WorkspaceNavBlueprint = {
  id: 'org',
  label: 'Organization workspace',
  groups: [
    {
      id: 'people',
      label: 'People',
      icon: 'users',
      links: [
        { href: '/org', label: 'Overview', requiresGuard: (access) => access.canAccessOrgWorkspace },
        { href: '/org/members', label: 'Members', requiresGuard: (access) => access.canManageOrgUsers },
        { href: '/org/invites', label: 'Invitations', requiresGuard: (access) => access.canManageOrgInvites },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'boxes',
      links: [
        {
          href: '/org/settings',
          label: 'Settings',
          requiresGuard: (access) => access.canManageOrgUsers,
        },
        {
          href: '/org/appointments',
          label: 'Appointments',
          requiresGuard: (access) => access.canAccessOrgWorkspace,
        },
      ],
    },
  ],
};

const STAFF_NAV_BLUEPRINT: WorkspaceNavBlueprint = {
  id: 'staff',
  label: 'Staff workspace',
  groups: [
    {
      id: 'caseload',
      label: 'Caseload',
      icon: 'users',
      links: [
        {
          href: '/staff',
          label: 'Overview',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
        {
          href: '/staff/caseload',
          label: 'Active cases',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
        {
          href: '/staff/cases',
          label: 'All cases',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
        {
          href: '/staff/intake',
          label: 'Intake queue',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: 'boxes',
      links: [
        {
          href: '/staff/appointments',
          label: 'Appointments',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
        {
          href: '/staff/schedule',
          label: 'Schedule',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
        {
          href: '/staff/outreach',
          label: 'Outreach log',
          requiresGuard: (access) => access.canAccessStaffWorkspace,
        },
      ],
    },
  ],
};

const WORKSPACE_NAV_BLUEPRINTS: WorkspaceNavBlueprint[] = [
  ADMIN_NAV_BLUEPRINT,
  ORG_NAV_BLUEPRINT,
  STAFF_NAV_BLUEPRINT,
];

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

function linkIsAllowed(blueprint: PortalLinkBlueprint, access: PortalAccess): boolean {
  const { portalRoles, iharcRoles } = access;

  if (blueprint.requiresGuard && !blueprint.requiresGuard(access)) {
    return false;
  }

  if (
    blueprint.requiresPortalRoles &&
    !portalRoles.some((role) => blueprint.requiresPortalRoles?.includes(role))
  ) {
    return false;
  }

  if (
    blueprint.requiresIharcRoles &&
    !iharcRoles.some((role) => blueprint.requiresIharcRoles?.includes(role))
  ) {
    return false;
  }

  return true;
}

export function resolveClientNavLinks(access: PortalAccess | null): PortalLink[] {
  if (!access) return [];

  return CLIENT_NAV_BLUEPRINT.filter((entry) => linkIsAllowed(entry, access)).map(
    ({ href, label, exact }) => ({ href, label, exact }),
  );
}

function resolveWorkspace(access: PortalAccess | null, workspaceId: string): WorkspaceNav | null {
  if (!access) return null;

  const blueprint = WORKSPACE_NAV_BLUEPRINTS.find((nav) => nav.id === workspaceId);
  if (!blueprint) return null;

  const groups = blueprint.groups
    .map<NavGroup | null>((group) => {
      const links = group.links
        .filter((link) => linkIsAllowed(link, access))
        .map(({ href, label, exact, icon }) => ({ href, label, exact, icon }));

      if (links.length === 0) {
        return null;
      }

      return { ...group, links };
    })
    .filter(Boolean) as NavGroup[];

  if (groups.length === 0) {
    return null;
  }

  return {
    ...blueprint,
    groups,
  };
}

export function resolveAdminWorkspaceNav(access: PortalAccess | null): WorkspaceNav | null {
  if (!access || !access.canAccessAdminWorkspace) return null;
  return resolveWorkspace(access, 'admin');
}

export function resolveOrgWorkspaceNav(access: PortalAccess | null): WorkspaceNav | null {
  if (!access || !access.canAccessOrgWorkspace) return null;
  return resolveWorkspace(access, 'org');
}

export function resolveStaffWorkspaceNav(access: PortalAccess | null): WorkspaceNav | null {
  if (!access || !access.canAccessStaffWorkspace) return null;
  return resolveWorkspace(access, 'staff');
}

export function resolveWorkspaceNavForShell(
  access: PortalAccess | null,
  workspaceId: WorkspaceId,
): WorkspaceNav | null {
  if (!access) return null;
  if (workspaceId === 'client') return null;

  if (workspaceId === 'admin' && !access.canAccessAdminWorkspace) return null;
  if (workspaceId === 'org' && !access.canAccessOrgWorkspace) return null;
  if (workspaceId === 'staff' && !access.canAccessStaffWorkspace) return null;

  return resolveWorkspace(access, workspaceId);
}

const PUBLIC_CLIENT_LINKS: PortalLink[] = CLIENT_NAV_BLUEPRINT.filter(
  (entry) => !entry.requiresGuard && !entry.requiresPortalRoles && !entry.requiresIharcRoles,
).map(({ href, label, exact }) => ({ href, label, exact } satisfies PortalLink));

export function getPublicPortalLinks(): PortalLink[] {
  return PUBLIC_CLIENT_LINKS.map((link) => ({ ...link }));
}

const USER_MENU_BLUEPRINT: PortalLinkBlueprint[] = [
  { href: '/profile', label: 'Profile' },
  { href: '/support', label: 'Support' },
  {
    href: '/admin',
    label: 'Admin workspace',
    requiresGuard: (access) => access.canAccessAdminWorkspace,
  },
  {
    href: '/org',
    label: 'Organization workspace',
    requiresGuard: (access) => access.canAccessOrgWorkspace,
  },
  {
    href: '/staff',
    label: 'Staff workspace',
    requiresGuard: (access) => access.canAccessStaffWorkspace,
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

  const clientCommands = CLIENT_NAV_BLUEPRINT.filter((entry) => linkIsAllowed(entry, access)).map(
    ({ href, label, icon }) => ({ href, label, icon, group: 'Client' }),
  );

  const adminNav = resolveAdminWorkspaceNav(access);
  const adminCommands: CommandPaletteItem[] = adminNav
    ? adminNav.groups.flatMap((group) =>
        group.links.map((link) => ({ ...link, group: group.label || 'Admin' })),
      )
    : [];

  const staffNav = resolveStaffWorkspaceNav(access);
  const staffCommands: CommandPaletteItem[] = staffNav
    ? staffNav.groups.flatMap((group) =>
        group.links.map((link) => ({ ...link, group: group.label || 'Staff' })),
      )
    : [];

  const orgNav = resolveOrgWorkspaceNav(access);
  const orgCommands: CommandPaletteItem[] = orgNav
    ? orgNav.groups.flatMap((group) =>
        group.links.map((link) => ({ ...link, group: group.label || 'Organization' })),
      )
    : [];

  // Prioritise contextual actions/entities first, then workspace navigation links; cap to keep palette fast.
  const ordered = [
    ...extraItems,
    ...clientCommands,
    ...adminCommands,
    ...staffCommands,
    ...orgCommands,
  ];

  const unique = dedupeLinks<CommandPaletteItem>(ordered);
  return unique.slice(0, MAX_ITEMS);
}
