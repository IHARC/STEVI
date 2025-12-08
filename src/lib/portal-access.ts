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
      href: '/admin/operations',
      label: 'Admin & operations',
      requires: (a) => a.canAccessAdminWorkspace,
    },
    {
      href: '/staff/overview',
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
  { href: '/admin/content?tab=website', label: 'Website settings', group: 'Content & website', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/content?tab=resources', label: 'Resource library', group: 'Content & website', requires: (access) => access.canManageResources },
  { href: '/admin/content?tab=policies', label: 'Policies', group: 'Content & website', requires: (access) => access.canManagePolicies },
  { href: '/admin/content?tab=notifications', label: 'Notifications', group: 'Content & website', requires: (access) => access.canManageNotifications },
  { href: '/admin/website?tab=branding', label: 'Website · Branding', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/website?tab=navigation', label: 'Website · Navigation', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/website?tab=home', label: 'Website · Home & context', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/website?tab=supports', label: 'Website · Supports', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/website?tab=programs', label: 'Website · Programs', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/website?tab=footer', label: 'Website · Footer', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/website?tab=inventory', label: 'Website · Content inventory', group: 'Website settings', requires: (access) => access.canManageWebsiteContent },
  { href: '/admin/people?tab=clients', label: 'People · Client directory', group: 'People & access', requires: (access) => access.canManageConsents },
  { href: '/admin/people?tab=consents', label: 'People · Consent overrides', group: 'People & access', requires: (access) => access.canManageConsents },
  { href: '/admin/people?tab=users', label: 'People · Users', group: 'People & access', requires: (access) => access.isProfileApproved && (access.portalRoles.includes('portal_org_admin') || access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin')) },
  { href: '/admin/people?tab=profiles', label: 'People · Profiles & invites', group: 'People & access', requires: (access) => access.isProfileApproved && (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin')) },
  { href: '/admin/people?tab=permissions', label: 'People · Permissions', group: 'People & access', requires: (access) => access.isProfileApproved && (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin')) },
  { href: '/admin/people?tab=organizations', label: 'People · Organizations', group: 'People & access', requires: (access) => access.isProfileApproved && (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin')) },
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

  const MAX_ITEMS = 20;
  const sections = navSections ?? buildPortalNav(access);
  const navCommands = flattenNavItemsForCommands(sections).map((item) => ({ ...item }));
  const hubCommands = HUB_TAB_COMMANDS.filter((entry) => entry.requires(access)).map(({ href, label, group }) => ({
    href,
    label,
    group,
  }));

  const ordered = [...extraItems, ...hubCommands, ...navCommands];
  const unique = dedupeLinks<CommandPaletteItem>(ordered);
  return unique.slice(0, MAX_ITEMS);
}
