import type { LucideIcon } from 'lucide-react';
import { Boxes, Megaphone, Notebook, Users2 } from 'lucide-react';
import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { getIharcRoles, type IharcRole } from '@/lib/ihar-auth';
import { INVENTORY_ALLOWED_ROLES } from '@/lib/inventory/constants';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: LucideIcon;
};

type LinkRequirement = {
  requiresProfileRoles?: PortalProfile['role'][];
  requiresIharcRoles?: IharcRole[];
  requiresGuard?: (access: PortalAccess) => boolean;
};

type PortalLinkBlueprint = PortalLink & LinkRequirement;

type NavGroupBlueprint = {
  id: string;
  label: string;
  icon: LucideIcon;
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
  icon: LucideIcon;
  links: PortalLink[];
};

export type WorkspaceNav = {
  id: string;
  label: string;
  groups: NavGroup[];
};

const CLIENT_NAV_BLUEPRINT: PortalLinkBlueprint[] = [
  { href: '/home', label: 'Home', exact: true },
  { href: '/appointments', label: 'Appointments' },
  { href: '/documents', label: 'Documents' },
  { href: '/support', label: 'Support' },
  { href: '/profile', label: 'Profile' },
  {
    href: '/admin',
    label: 'Admin workspace',
    exact: false,
    requiresGuard: (access) => access.canAccessAdminWorkspace,
  },
];

const ADMIN_NAV_BLUEPRINT: WorkspaceNavBlueprint = {
  id: 'admin',
  label: 'Admin workspace',
  groups: [
    {
      id: 'people',
      label: 'People',
      icon: Users2,
      links: [
        {
          href: '/admin/profiles',
          label: 'Profile verification',
          requiresProfileRoles: ['moderator', 'admin'],
        },
      ],
    },
    {
      id: 'content',
      label: 'Content',
      icon: Notebook,
      links: [
        {
          href: '/admin/resources',
          label: 'Resource library',
          requiresProfileRoles: ['admin'],
        },
        {
          href: '/admin/policies',
          label: 'Policies',
          requiresProfileRoles: ['admin'],
        },
        {
          href: '/admin/marketing/footer',
          label: 'Marketing footer',
          requiresProfileRoles: ['admin'],
        },
      ],
    },
    {
      id: 'outreach',
      label: 'Outreach',
      icon: Megaphone,
      links: [
        {
          href: '/admin/notifications',
          label: 'Notifications',
          requiresProfileRoles: ['admin'],
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Boxes,
      links: [
        {
          href: '/admin/inventory',
          label: 'Inventory workspace',
          requiresIharcRoles: INVENTORY_ALLOWED_ROLES,
        },
      ],
    },
  ],
};

const WORKSPACE_NAV_BLUEPRINTS: WorkspaceNavBlueprint[] = [ADMIN_NAV_BLUEPRINT];

export type PortalAccess = {
  userId: string;
  email: string | null;
  profile: PortalProfile;
  iharcRoles: IharcRole[];
  canAccessAdminWorkspace: boolean;
  canManageResources: boolean;
  canManagePolicies: boolean;
  canAccessInventoryWorkspace: boolean;
  canManageNotifications: boolean;
  canReviewProfiles: boolean;
  canViewMetrics: boolean;
  canManageSiteFooter: boolean;
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
  const iharcRoles = getIharcRoles(user);

  const canAccessAdminWorkspace = profile.role === 'moderator' || profile.role === 'admin';
  const canManageResources = profile.role === 'admin';
  const canManagePolicies = profile.role === 'admin';
  const canAccessInventoryWorkspace = iharcRoles.some((role) =>
    INVENTORY_ALLOWED_ROLES.includes(role),
  );

  const canManageNotifications = profile.role === 'admin';
  const canManageSiteFooter = profile.role === 'admin';
  const canReviewProfiles = canAccessAdminWorkspace;
  const canViewMetrics = profile.role === 'admin';

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    iharcRoles,
    canAccessAdminWorkspace,
    canManageResources,
    canManagePolicies,
    canAccessInventoryWorkspace,
    canManageNotifications,
    canReviewProfiles,
    canViewMetrics,
    canManageSiteFooter,
  };
}

function linkIsAllowed(blueprint: PortalLinkBlueprint, access: PortalAccess): boolean {
  const { profile, iharcRoles } = access;

  if (blueprint.requiresGuard && !blueprint.requiresGuard(access)) {
    return false;
  }

  if (
    blueprint.requiresProfileRoles &&
    !blueprint.requiresProfileRoles.includes(profile.role)
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

const PUBLIC_CLIENT_LINKS: PortalLink[] = CLIENT_NAV_BLUEPRINT.filter(
  (entry) => !entry.requiresGuard && !entry.requiresProfileRoles && !entry.requiresIharcRoles,
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

export function buildCommandPaletteItems(access: PortalAccess | null): CommandPaletteItem[] {
  if (!access) return [];

  const clientCommands = CLIENT_NAV_BLUEPRINT.filter((entry) => linkIsAllowed(entry, access)).map(
    ({ href, label, icon }) => ({ href, label, icon, group: 'Client' }),
  );

  const adminNav = resolveAdminWorkspaceNav(access);
  const adminCommands: CommandPaletteItem[] = adminNav
    ? adminNav.groups.flatMap((group) =>
        group.links.map((link) => ({ ...link, group: group.label || 'Admin' })),
      )
    : [];

  return dedupeLinks<CommandPaletteItem>([...clientCommands, ...adminCommands]);
}
