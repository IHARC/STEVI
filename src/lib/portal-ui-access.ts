import type { AppIconName } from '@/lib/app-icons';
import type { PortalAccess } from '@/lib/portal-access';
import { buildPortalNav, flattenNavItemsForCommands, type NavSection } from '@/lib/portal-navigation';

type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: AppIconName;
  match?: string[];
};

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
  { href: '/ops/time', label: 'Time tracking', group: 'Time', requires: (access) => access.organizationFeatures.includes('time_tracking') && (access.canTrackTime || access.canViewAllTime || access.canManageTime) },
  { href: '/ops/inventory?view=dashboard', label: 'Inventory', group: 'Inventory', requires: (access) => access.canAccessInventoryOps },
  { href: '/ops/organizations', label: 'Organizations', group: 'Organizations', requires: (access) => access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canAccessOpsSteviAdmin },
];

export function buildUserMenuLinks(access: PortalAccess): Array<{ href: string; label: string }> {
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
