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
const canSeeInventory = (access: PortalAccess) => access.canAccessInventoryOps;
const canSeeFundraising = (access: PortalAccess) => access.canAccessOpsSteviAdmin;
const canSeeReports = (access: PortalAccess) =>
  access.canReportCosts ||
  access.canViewMetrics ||
  (access.organizationFeatures.includes('calls_for_service') && access.canAccessCfs);
const canSeeTimeTracking = (access: PortalAccess) =>
  access.organizationFeatures.includes('time_tracking') &&
  (access.canTrackTime || access.canViewAllTime || access.canManageTime);
const canSeeCfs = (access: PortalAccess) =>
  access.organizationFeatures.includes('calls_for_service') && access.canAccessCfs;
const canSeeOrganizations = (access: PortalAccess) =>
  access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canAccessOpsSteviAdmin;
const canSeeOrgScopedOrganizations = (access: PortalAccess) =>
  access.canAccessOpsOrg && access.profile.affiliation_type === 'agency_partner' && !access.isIharcMember && !access.isGlobalAdmin;
const NAV_SECTIONS: NavSectionDefinition[] = [
  {
    id: 'ops_frontline',
    label: 'Operations',
    description: 'Frontline tools for staff, volunteers, and admins',
    area: 'ops_frontline',
    requires: canSeeFrontline,
    groups: [
      {
        id: 'today',
        label: 'Today',
        icon: 'dashboard',
        isHub: true,
        items: [
          { id: 'today', href: '/ops/today', label: 'Today', icon: 'dashboard', match: ['/ops/today'], exact: true },
        ],
      },
      {
        id: 'cfs',
        label: 'Calls for service',
        icon: 'workflow',
        requires: canSeeCfs,
        isHub: true,
        items: [
          {
            id: 'cfs-queue',
            href: '/ops/cfs',
            label: 'Queue',
            icon: 'workflow',
            match: ['/ops/cfs'],
          },
          {
            id: 'cfs-incidents',
            href: '/ops/incidents',
            label: 'Incidents',
            match: ['/ops/incidents'],
          },
          {
            id: 'cfs-new',
            href: '/ops/cfs/new',
            label: 'New call',
            match: ['/ops/cfs/new'],
          },
        ],
      },
      {
        id: 'clients',
        label: 'Clients',
        icon: 'users',
        requires: canSeeClients,
        isHub: true,
        items: [
          {
            id: 'clients-directory',
            href: '/ops/clients?view=directory',
            label: 'Directory',
            match: ['/ops/clients'],
            query: { view: 'directory' },
          },
          {
            id: 'clients-caseload',
            href: '/ops/clients?view=caseload',
            label: 'Caseload',
            match: ['/ops/clients'],
            query: { view: 'caseload' },
          },
          {
            id: 'clients-activity',
            href: '/ops/clients?view=activity',
            label: 'Activity',
            match: ['/ops/clients'],
            query: { view: 'activity' },
          },
          {
            id: 'clients-consents',
            href: '/ops/consents',
            label: 'Consent requests',
            match: ['/ops/consents'],
          },
          {
            id: 'clients-consents-record',
            href: '/ops/consents/record',
            label: 'Record consent',
            match: ['/ops/consents/record'],
            requires: (access) => access.canManageConsents,
          },
          {
            id: 'clients-portal-preview',
            href: '/home?preview=1',
            label: 'Preview client portal',
            match: ['/home'],
            requires: (access) => access.canAccessOpsFrontline || access.canAccessOpsAdmin || access.canAccessOpsOrg,
          },
        ],
      },
      {
        id: 'programs',
        label: 'Programs',
        icon: 'calendarRange',
        requires: canSeePrograms,
        isHub: true,
        items: [
          {
            id: 'programs-overview',
            href: '/ops/programs?view=overview',
            label: 'Overview',
            match: ['/ops/programs'],
            query: { view: 'overview' },
          },
          {
            id: 'programs-schedule',
            href: '/ops/programs?view=schedule',
            label: 'Schedule',
            match: ['/ops/programs'],
            query: { view: 'schedule' },
          },
        ],
      },
      {
        id: 'time',
        label: 'Time tracking',
        icon: 'clock',
        requires: canSeeTimeTracking,
        isHub: true,
        items: [
          {
            id: 'timecards',
            href: '/ops/time',
            label: 'Timecards',
            icon: 'clock',
            match: ['/ops/time'],
          },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'chart',
        requires: canSeeReports,
        isHub: true,
        items: [
          {
            id: 'reports-costs',
            href: '/ops/reports/costs',
            label: 'Costs',
            icon: 'chart',
            match: ['/ops/reports/costs'],
            requires: (access) => access.canReportCosts,
          },
          {
            id: 'reports-cfs',
            href: '/ops/reports/cfs',
            label: 'CFS',
            icon: 'chart',
            match: ['/ops/reports/cfs'],
            requires: (access) => access.canAccessCfs,
          },
        ],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'boxes',
        requires: canSeeInventory,
        isHub: true,
        items: [
          {
            id: 'inventory-dashboard',
            href: '/ops/inventory?view=dashboard',
            label: 'Dashboard',
            match: ['/ops/inventory'],
            query: { view: 'dashboard' },
          },
          {
            id: 'inventory-items',
            href: '/ops/inventory?view=items',
            label: 'Items',
            match: ['/ops/inventory'],
            query: { view: 'items' },
          },
          {
            id: 'inventory-locations',
            href: '/ops/inventory?view=locations',
            label: 'Locations',
            match: ['/ops/inventory'],
            query: { view: 'locations' },
          },
          {
            id: 'inventory-receipts',
            href: '/ops/inventory?view=receipts',
            label: 'Receipts',
            match: ['/ops/inventory'],
            query: { view: 'receipts' },
          },
        ],
      },
      {
        id: 'fundraising',
        label: 'Fundraising',
        icon: 'handHeart',
        requires: canSeeFundraising,
        isHub: true,
        items: [
          { id: 'fundraising', href: '/ops/fundraising', label: 'Fundraising', icon: 'handHeart', match: ['/ops/fundraising'] },
        ],
      },
      {
        id: 'organizations',
        label: 'Organizations',
        icon: 'building',
        requires: canSeeOrganizations,
        isHub: true,
        items: [
          { id: 'organizations', href: '/ops/organizations', label: 'Organizations', icon: 'building', match: ['/ops/organizations'] },
        ],
      },
    ],
  },
  {
    id: 'ops_org_scoped',
    label: 'Organizations',
    description: 'Organization settings and membership for partner teams',
    area: 'ops_frontline',
    requires: canSeeOrgScopedOrganizations,
    groups: [
      {
        id: 'organizations',
        label: 'Organizations',
        icon: 'building',
        isHub: true,
        items: [
          {
            id: 'organizations',
            href: '/ops/organizations',
            label: 'Organizations',
            icon: 'building',
            match: ['/ops/organizations'],
          },
        ],
      },
      {
        id: 'consents',
        label: 'Consents',
        icon: 'shield',
        isHub: true,
        items: [
          {
            id: 'consent-requests',
            href: '/ops/consents',
            label: 'Consent requests',
            match: ['/ops/consents'],
          },
          {
            id: 'consent-record',
            href: '/ops/consents/record',
            label: 'Record consent',
            match: ['/ops/consents/record'],
            requires: (access) => access.canManageConsents,
          },
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
      isHub: group.isHub,
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

  if (area === 'ops_frontline') {
    const actions: QuickAction[] = [];

    if (access.canAccessOpsFrontline || access.canAccessOpsAdmin) {
      actions.push({
        id: 'ops-new-encounter',
        label: 'New Encounter',
        href: '/ops/encounters/new',
        description: orgMissing ? 'Select an acting org to start an encounter' : 'Start an encounter from your current context',
        icon: 'calendar',
        disabled: previewDisabled,
        disabledReason: previewDisabled
          ? 'Not available in preview'
          : requiresOrgSelection
            ? 'Select an acting org to start an encounter'
            : 'Set an acting org to start an encounter',
      });
    }

    if (access.organizationFeatures.includes('calls_for_service') && access.canAccessCfs) {
      actions.push({
        id: 'ops-new-cfs',
        label: 'New call for service',
        href: '/ops/cfs/new',
        description: orgMissing ? 'Select an acting org to log a call' : 'Log a new call or public request',
        icon: 'file',
        disabled: previewDisabled,
        disabledReason: previewDisabled ? 'Not available in preview' : undefined,
      });
    }

    if (access.canAccessOpsFrontline || access.canManageConsents || access.canAccessOpsAdmin) {
      actions.push({
        id: 'ops-find-person',
        label: 'Find or create person',
        href: '/ops/clients?view=directory',
        description: 'Search existing records or start intake',
        icon: 'file',
        disabled: previewDisabled,
        disabledReason: previewDisabled ? 'Not available in preview' : undefined,
      });
    }

    if (access.canManageOrgInvites) {
      const inviteHref = access.organizationId ? `/ops/organizations/${access.organizationId}?tab=invites` : '/ops/organizations';
      actions.push({
        id: 'ops-invite-member',
        label: 'Invite member',
        href: inviteHref,
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
    case 'app_admin':
      return 'STEVI Admin';
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
