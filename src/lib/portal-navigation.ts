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
  disabledReason?: string;
};

const canSeeFrontline = (access: PortalAccess) => access.canAccessOpsFrontline;
const canSeeClients = (access: PortalAccess) => access.canAccessOpsFrontline || access.canManageConsents;
const canSeePrograms = (access: PortalAccess) => access.canAccessOpsFrontline || access.canAccessOpsAdmin;
const canSeeSupplies = (access: PortalAccess) => access.canAccessInventoryOps || access.canAccessOpsAdmin;
const canSeePartners = (access: PortalAccess) => access.canAccessOpsAdmin;
const canSeeOrganization = (access: PortalAccess) => access.canAccessOpsOrg || access.canAccessOpsAdmin;
const canSeeHq = (access: PortalAccess) => access.canAccessOpsHq;

const NAV_SECTIONS: NavSectionDefinition[] = [
  {
    id: 'ops_frontline',
    label: 'Operations',
    description: 'Frontline rails for staff, volunteers, and admins',
    area: 'ops_frontline',
    requires: canSeeFrontline,
    groups: [
      {
        id: 'today',
        label: 'Today',
        icon: 'dashboard',
        items: [
          { id: 'today', href: '/ops/today', label: 'Today', icon: 'dashboard', match: ['/ops/today'], exact: true },
        ],
      },
      {
        id: 'clients',
        label: 'Clients',
        icon: 'users',
        requires: canSeeClients,
        items: [
          { id: 'clients', href: '/ops/clients', label: 'Clients', icon: 'users', match: ['/ops/clients'] },
        ],
      },
      {
        id: 'programs',
        label: 'Programs',
        icon: 'calendarRange',
        requires: canSeePrograms,
        items: [
          { id: 'programs', href: '/ops/programs', label: 'Programs', icon: 'calendarRange', match: ['/ops/programs'] },
        ],
      },
      {
        id: 'visits',
        label: 'Visits',
        icon: 'workflow',
        requires: canSeeFrontline,
        items: [
          { id: 'visits', href: '/ops/visits/new', label: 'Visits', icon: 'workflow', match: ['/ops/visits'] },
        ],
      },
      {
        id: 'supplies',
        label: 'Supplies',
        icon: 'boxes',
        requires: canSeeSupplies,
        items: [
          { id: 'supplies', href: '/ops/supplies', label: 'Supplies', icon: 'boxes', match: ['/ops/supplies'] },
        ],
      },
      {
        id: 'partners',
        label: 'Partners',
        icon: 'building',
        requires: canSeePartners,
        items: [
          { id: 'partners', href: '/ops/partners', label: 'Partners', icon: 'building', match: ['/ops/partners'] },
        ],
      },
    ],
  },
  {
    id: 'ops_org',
    label: 'Org Hub',
    description: 'Tenant administration scoped to the acting organization',
    area: 'ops_org',
    requires: canSeeOrganization,
    groups: [
      {
        id: 'org',
        label: 'Organization',
        icon: 'settings',
        items: [
          { id: 'org-overview', href: '/ops/org', label: 'Overview', icon: 'dashboard', match: ['/ops/org'], exact: true },
          { id: 'org-members', href: '/ops/org/members', label: 'Members', icon: 'users', match: ['/ops/org/members'] },
          { id: 'org-invites', href: '/ops/org/invites', label: 'Invites', icon: 'message', match: ['/ops/org/invites'] },
          { id: 'org-appointments', href: '/ops/org/appointments', label: 'Appointments', icon: 'calendar', match: ['/ops/org/appointments'] },
          { id: 'org-settings', href: '/ops/org/settings', label: 'Settings', icon: 'settings', match: ['/ops/org/settings'] },
        ],
      },
    ],
  },
  {
    id: 'ops_hq',
    label: 'HQ',
    description: 'IHARC-wide controls and content',
    area: 'ops_hq',
    requires: canSeeHq,
    groups: [
      {
        id: 'hq-hub',
        label: 'HQ Hub',
        icon: 'building',
        items: [
          { id: 'hq-overview', href: '/ops/hq', label: 'Overview', icon: 'dashboard', match: ['/ops/hq'], exact: true },
          { id: 'hq-content', href: '/ops/hq#content', label: 'Content & Notifications', icon: 'megaphone', match: ['/ops/hq'] },
          { id: 'hq-organizations', href: '/ops/hq#organizations', label: 'Organizations', icon: 'globe', match: ['/ops/hq'] },
          { id: 'hq-inventory', href: '/ops/hq#inventory', label: 'Inventory & Donations', icon: 'boxes', match: ['/ops/hq'] },
          { id: 'hq-operations', href: '/ops/hq#operations', label: 'Operations', icon: 'workflow', match: ['/ops/hq'] },
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
  const orgMissing = (access.canAccessOpsFrontline || access.canAccessOpsAdmin || access.canAccessOpsOrg) && !access.organizationId;
  const requiresOrgSelection = orgMissing && (access.actingOrgChoicesCount ?? 0) > 1;

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

  if (area === 'ops_frontline' || area === 'ops_org' || area === 'ops_hq') {
    const actions: QuickAction[] = [];

    if (access.canAccessOpsFrontline || access.canAccessOpsAdmin) {
      actions.push({
        id: 'ops-new-visit',
        label: 'New Visit',
        href: orgMissing ? '/ops/org' : '/ops/visits/new',
        description: orgMissing ? 'Select an acting org to start a Visit' : 'Start a Visit from your current context',
        icon: 'calendar',
        disabled: previewDisabled || orgMissing,
        disabledReason: previewDisabled
          ? 'Not available in preview'
          : requiresOrgSelection
            ? 'Select an acting org to start a Visit'
            : 'Set an acting org to start a Visit',
      });
    }

    if (access.canAccessOpsFrontline || access.canManageConsents || access.canAccessOpsAdmin) {
      actions.push({
        id: 'ops-find-person',
        label: 'Find or create person',
        href: '/ops/clients',
        description: 'Search existing records or start intake',
        icon: 'file',
        disabled: previewDisabled,
        disabledReason: previewDisabled ? 'Not available in preview' : undefined,
      });
    }

    if (access.canManageOrgInvites) {
      actions.push({
        id: 'ops-invite-member',
        label: 'Invite member',
        href: '/ops/org/invites',
        description: 'Send an access invite',
        icon: 'chat',
        disabled: previewDisabled,
        disabledReason: previewDisabled ? 'Not available in preview' : undefined,
      });
    }

    return actions;
  }

  return [];
}

export function navAreaLabel(area: PortalArea): string {
  switch (area) {
    case 'ops_frontline':
      return 'Operations';
    case 'ops_hq':
      return 'HQ';
    case 'ops_org':
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
