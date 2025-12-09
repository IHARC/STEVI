import type { AppIconName } from '@/lib/app-icons';
import type { PortalAccess } from '@/lib/portal-access';
import type { NavGroup, NavItem, NavSection } from '@/lib/nav-types';
import type { PortalArea } from '@/lib/portal-areas';
export type { PortalArea } from '@/lib/portal-areas';
export { resolveLandingPath, inferPortalAreaFromPath } from '@/lib/portal-areas';

type NavRule = (access: PortalAccess) => boolean;

type NavItemDefinition = NavItem & { requires?: NavRule };
type NavGroupDefinition = Omit<NavGroup, 'items'> & { items: NavItemDefinition[]; requires?: NavRule };
type NavSectionDefinition = Omit<NavSection, 'groups'> & { groups: NavGroupDefinition[]; requires?: NavRule };

export type { NavItem, NavGroup, NavSection } from '@/lib/nav-types';

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: 'calendar' | 'chat' | 'file';
  disabled?: boolean;
};

const hasWorkspaceAccess = (access: PortalAccess) =>
  access.canAccessAdminWorkspace || access.canAccessStaffWorkspace || access.canAccessOrgWorkspace;

const canSeeClients = (access: PortalAccess) => access.canAccessStaffWorkspace || access.canManageConsents;
const canSeePrograms = (access: PortalAccess) => access.canAccessStaffWorkspace || access.canAccessAdminWorkspace;
const canSeeSupplies = (access: PortalAccess) => access.canAccessInventoryWorkspace || access.canAccessAdminWorkspace;
const canSeePartners = (access: PortalAccess) => access.canAccessAdminWorkspace;
const canSeeOrganization = (access: PortalAccess) => access.canAccessOrgWorkspace || access.canAccessAdminWorkspace;

const NAV_SECTIONS: NavSectionDefinition[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Visit-first tools for staff, volunteers, and admins',
    area: 'workspace',
    requires: hasWorkspaceAccess,
    groups: [
      {
        id: 'today',
        label: 'Today',
        icon: 'dashboard',
        items: [
          { id: 'today', href: '/workspace/today', label: 'Today', icon: 'dashboard', match: ['/workspace/today'], exact: true },
        ],
      },
      {
        id: 'clients',
        label: 'Clients',
        icon: 'users',
        requires: canSeeClients,
        items: [
          { id: 'clients', href: '/workspace/clients', label: 'Clients', icon: 'users', match: ['/workspace/clients'] },
        ],
      },
      {
        id: 'programs',
        label: 'Programs',
        icon: 'calendarRange',
        requires: canSeePrograms,
        items: [
          { id: 'programs', href: '/workspace/programs', label: 'Programs', icon: 'calendarRange', match: ['/workspace/programs'] },
        ],
      },
      {
        id: 'supplies',
        label: 'Supplies',
        icon: 'boxes',
        requires: canSeeSupplies,
        items: [
          { id: 'supplies', href: '/workspace/supplies', label: 'Supplies', icon: 'boxes', match: ['/workspace/supplies'] },
        ],
      },
      {
        id: 'partners',
        label: 'Partners',
        icon: 'building',
        requires: canSeePartners,
        items: [
          { id: 'partners', href: '/workspace/partners', label: 'Partners', icon: 'building', match: ['/workspace/partners'] },
        ],
      },
      {
        id: 'organization',
        label: 'Organization',
        icon: 'settings',
        requires: canSeeOrganization,
        items: [
          { id: 'organization', href: '/org', label: 'Organization', icon: 'settings', match: ['/org'], exact: true },
        ],
      },
    ],
  },
];

function filterItems(items: NavItemDefinition[], access: PortalAccess): NavItem[] {
  return items
    .filter((item) => !item.requires || item.requires(access))
    .map(({ requires: _requires, ...item }) => item);
}

function filterGroups(groups: NavGroupDefinition[], access: PortalAccess): NavGroup[] {
  return groups
    .filter((group) => !group.requires || group.requires(access))
    .map((group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
      icon: group.icon,
      items: filterItems(group.items, access),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildPortalNav(access: PortalAccess | null): NavSection[] {
  if (!access) return [];

  return NAV_SECTIONS
    .filter((section) => !section.requires || section.requires(access))
    .map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      area: section.area,
      groups: filterGroups(section.groups, access),
    }))
    .filter((section) => section.groups.length > 0);
}

export function resolveQuickActions(
  access: PortalAccess | null,
  area: PortalArea,
  { isPreview }: { isPreview?: boolean } = {},
): QuickAction[] {
  if (!access) return [];

  const previewDisabled = Boolean(isPreview);

  if (area === 'client') {
    return [
      {
        id: 'client-request-appointment',
        label: 'Request appointment',
        href: '/appointments#request-form',
        description: 'Share availability with outreach staff',
        icon: 'calendar',
        disabled: previewDisabled,
      },
      {
        id: 'client-message-support',
        label: 'Message the team',
        href: '/support#message-tray',
        description: 'Ask for help or updates',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'client-view-documents',
        label: 'View secure documents',
        href: '/documents',
        description: 'Check shared files and expiry',
        icon: 'file',
        disabled: false,
      },
    ];
  }

  if (area === 'workspace' || area === 'staff' || area === 'admin' || area === 'org') {
    const actions: QuickAction[] = [];

    if (access.canAccessStaffWorkspace || access.canAccessAdminWorkspace) {
      actions.push({
        id: 'workspace-new-visit',
        label: 'New Visit',
        href: '/workspace/visits/new',
        description: 'Start a Visit from your current context',
        icon: 'calendar',
        disabled: previewDisabled,
      });
    }

    if (access.canAccessStaffWorkspace || access.canManageConsents || access.canAccessAdminWorkspace) {
      actions.push({
        id: 'workspace-find-person',
        label: 'Find or create person',
        href: '/workspace/clients',
        description: 'Search existing records or start intake',
        icon: 'file',
        disabled: previewDisabled,
      });
    }

    if (access.canManageOrgInvites) {
      actions.push({
        id: 'workspace-invite-member',
        label: 'Invite member',
        href: '/org/invites',
        description: 'Send an access invite',
        icon: 'chat',
        disabled: previewDisabled,
      });
    }

    return actions;
  }

  return [];
}

export function navAreaLabel(area: PortalArea): string {
  switch (area) {
    case 'workspace':
      return 'Workspace';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff tools';
    case 'org':
      return 'Organization';
    case 'client':
    default:
      return 'Client portal';
  }
}

export function flattenNavItemsForCommands(sections: NavSection[]): { href: string; label: string; icon?: AppIconName; group: string }[] {
  return sections.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.items.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        group: `${section.label} · ${group.label}`,
      })),
    ),
  );
}
