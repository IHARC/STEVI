import { ensurePortalProfile, type PortalProfile } from '@/lib/profile';
import { getIharcRoles, type IharcRole } from '@/lib/ihar-auth';
import { INVENTORY_ALLOWED_ROLES } from '@/lib/inventory/constants';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

export type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
};

type PortalLinkBlueprint = PortalLink & {
  requiresProfileRoles?: PortalProfile['role'][];
  requiresIharcRoles?: IharcRole[];
};

const PORTAL_NAV_BLUEPRINT: PortalLinkBlueprint[] = [
  { href: '/home', label: 'Home', exact: true },
  { href: '/appointments', label: 'Appointments' },
  { href: '/documents', label: 'Documents' },
  { href: '/profile', label: 'Profile' },
  { href: '/support', label: 'Support' },
  {
    href: '/admin',
    label: 'Admin workspace',
    requiresProfileRoles: ['moderator', 'admin'],
  },
  {
    href: '/admin/profiles',
    label: 'Profile verification',
    requiresProfileRoles: ['moderator', 'admin'],
  },
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
  {
    href: '/admin/inventory',
    label: 'Inventory workspace',
    requiresIharcRoles: INVENTORY_ALLOWED_ROLES,
  },
  {
    href: '/admin/notifications',
    label: 'Notifications',
    requiresProfileRoles: ['admin'],
  },
];

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

function meetsRoleRequirement(blueprint: PortalLinkBlueprint, access: PortalAccess): boolean {
  const { profile, iharcRoles } = access;

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

export function resolvePortalNavLinks(access: PortalAccess | null): PortalLink[] {
  if (!access) {
    return [];
  }

  return PORTAL_NAV_BLUEPRINT.filter((entry) => meetsRoleRequirement(entry, access)).map(
    ({ href, label, exact }) => ({ href, label, exact }),
  );
}

const BASE_PORTAL_LINKS = PORTAL_NAV_BLUEPRINT.filter(
  (entry) => !entry.requiresProfileRoles && !entry.requiresIharcRoles,
).map(({ href, label, exact }) => ({ href, label, exact } satisfies PortalLink));

export function getPublicPortalLinks(): PortalLink[] {
  return BASE_PORTAL_LINKS.map((link) => ({ ...link }));
}

function dedupeLinks(links: PortalLink[]): PortalLink[] {
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
  const links: PortalLink[] = [...BASE_PORTAL_LINKS];

  if (access.canAccessAdminWorkspace) {
    links.push({ href: '/admin', label: 'Admin workspace' });
  }

  if (access.canReviewProfiles) {
    links.push({ href: '/admin/profiles', label: 'Profile verification' });
  }

  if (access.canManageResources) {
    links.push({ href: '/admin/resources', label: 'Resource library' });
  }
  if (access.canManagePolicies) {
    links.push({ href: '/admin/policies', label: 'Policies' });
  }

  if (access.canManageSiteFooter) {
    links.push({ href: '/admin/marketing/footer', label: 'Marketing footer' });
  }

  if (access.canAccessInventoryWorkspace) {
    links.push({ href: '/admin/inventory', label: 'Inventory workspace' });
  }

  if (access.canManageNotifications) {
    links.push({ href: '/admin/notifications', label: 'Notifications' });
  }

  return dedupeLinks(links);
}
