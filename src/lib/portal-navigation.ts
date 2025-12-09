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
const canSeeReports = (access: PortalAccess) => access.canViewMetrics || access.canAccessAdminWorkspace;
const canManageOrgAccess = (access: PortalAccess) => access.canManageOrgUsers || access.canManageOrgInvites || access.canAccessAdminWorkspace;
const canManageBrand = (access: PortalAccess) =>
  access.canManageWebsiteContent || access.canManageSiteFooter || access.canManageResources || access.canManagePolicies || access.canManageNotifications || access.canAccessAdminWorkspace;

const NAV_SECTIONS: NavSectionDefinition[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Today, clients, programs, and operations',
    area: 'workspace',
    requires: hasWorkspaceAccess,
    groups: [
      {
        id: 'today',
        label: 'Today',
        icon: 'dashboard',
        items: [
          { id: 'today-home', href: '/workspace/today', label: 'Today', icon: 'dashboard', match: ['/workspace/today'], exact: true },
          { id: 'today-new-visit', href: '/workspace/visits/new', label: 'New Visit', icon: 'file', match: ['/workspace/visits'] },
          { id: 'today-tasks', href: '/staff/tasks', label: 'Tasks', icon: 'list', match: ['/staff/tasks'], requires: (access) => access.canAccessStaffWorkspace },
          { id: 'today-appointments', href: '/staff/appointments', label: 'Appointments', icon: 'calendar', match: ['/staff/appointments'], requires: (access) => access.canAccessStaffWorkspace },
          { id: 'today-intake', href: '/staff/intake', label: 'Intake queue', icon: 'inbox', match: ['/staff/intake'], requires: (access) => access.canAccessStaffWorkspace },
        ],
      },
      {
        id: 'clients',
        label: 'Clients',
        icon: 'users',
        requires: canSeeClients,
        items: [
          { id: 'clients-directory', href: '/admin/clients', label: 'Client directory', icon: 'users', match: ['/admin/clients'], requires: (access) => access.canManageConsents || access.canAccessAdminWorkspace },
          { id: 'clients-journey', href: '/staff/cases', label: 'Client Journey', icon: 'briefcase', match: ['/staff/cases'], requires: (access) => access.canAccessStaffWorkspace },
          { id: 'clients-caseload', href: '/staff/caseload', label: 'Caseload', icon: 'briefcase', match: ['/staff/caseload'], requires: (access) => access.canAccessStaffWorkspace },
        ],
      },
      {
        id: 'programs',
        label: 'Programs',
        icon: 'calendarRange',
        requires: canSeePrograms,
        items: [
          { id: 'programs-rosters', href: '/staff/schedule', label: 'Schedules & rosters', icon: 'calendarRange', match: ['/staff/schedule'], requires: (access) => access.canAccessStaffWorkspace },
          { id: 'programs-outreach', href: '/staff/outreach', label: 'Outreach', icon: 'route', match: ['/staff/outreach'], requires: (access) => access.canAccessStaffWorkspace },
          { id: 'programs-shifts', href: '/staff/shifts/logs', label: 'Shift logs', icon: 'clock', match: ['/staff/shifts/logs'], requires: (access) => access.canAccessStaffWorkspace },
          { id: 'programs-appointments', href: '/admin/appointments', label: 'Program appointments', icon: 'calendar', match: ['/admin/appointments'], requires: (access) => access.canAccessAdminWorkspace },
          { id: 'programs-warming', href: '/admin/warming-room', label: 'Warming room', icon: 'flame', match: ['/admin/warming-room'], requires: (access) => access.canAccessAdminWorkspace },
          { id: 'programs-service-rules', href: '/admin/service-rules', label: 'Service rules', icon: 'workflow', match: ['/admin/service-rules'], requires: (access) => access.canAccessAdminWorkspace },
          { id: 'programs-templates', href: '/admin/templates', label: 'Templates', icon: 'file', match: ['/admin/templates'], requires: (access) => access.canAccessAdminWorkspace },
        ],
      },
      {
        id: 'supplies',
        label: 'Supplies',
        icon: 'boxes',
        requires: canSeeSupplies,
        items: [
          { id: 'supplies-overview', href: '/admin/inventory/overview', label: 'Stock overview', icon: 'boxes', match: ['/admin/inventory/overview', '/admin/inventory'] },
          { id: 'supplies-items', href: '/admin/inventory/items', label: 'Items & locations', icon: 'box', match: ['/admin/inventory/items'] },
          { id: 'supplies-donations', href: '/admin/donations', label: 'Donations', icon: 'inbox', match: ['/admin/donations'] },
          { id: 'supplies-reconciliation', href: '/admin/inventory/donations-mapping', label: 'Reconciliation', icon: 'approval', match: ['/admin/inventory/donations-mapping'] },
        ],
      },
      {
        id: 'partners',
        label: 'Partners',
        icon: 'building',
        requires: canSeePartners,
        items: [
          { id: 'partners-directory', href: '/admin/organizations', label: 'Directory', icon: 'building', match: ['/admin/organizations'] },
          { id: 'partners-approvals', href: '/admin/approvals', label: 'Agreements & approvals', icon: 'approval', match: ['/admin/approvals'] },
          { id: 'partners-help', href: '/admin/help', label: 'Help', icon: 'lifebuoy', match: ['/admin/help'] },
        ],
      },
      {
        id: 'organization',
        label: 'Organization',
        icon: 'settings',
        requires: canSeeOrganization,
        items: [
          { id: 'org-overview', href: '/org', label: 'Overview', icon: 'dashboard', match: ['/org'], exact: true },
          { id: 'org-access', href: '/org/members', label: 'Access & roles', icon: 'shield', match: ['/org/members'], requires: canManageOrgAccess },
          { id: 'org-invites', href: '/org/invites', label: 'Invites', icon: 'inbox', match: ['/org/invites'], requires: canManageOrgAccess },
          { id: 'org-settings', href: '/org/settings', label: 'Settings', icon: 'settings', match: ['/org/settings'], requires: (access) => access.canAccessOrgWorkspace || access.canAccessAdminWorkspace },
          { id: 'org-content', href: '/admin/content', label: 'Content hub', icon: 'notebook', match: ['/admin/content'], requires: canManageBrand },
          { id: 'org-website', href: '/admin/website', label: 'Website & Brand', icon: 'globe', match: ['/admin/website'], requires: canManageBrand },
          { id: 'org-policies', href: '/admin/policies', label: 'Policies', icon: 'book', match: ['/admin/policies'], requires: (access) => access.canManagePolicies || access.canAccessAdminWorkspace },
          { id: 'org-notifications', href: '/admin/notifications', label: 'Notifications', icon: 'megaphone', match: ['/admin/notifications'], requires: (access) => access.canManageNotifications || access.canAccessAdminWorkspace },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'chart',
        requires: canSeeReports,
        items: [
          { id: 'reports-operations', href: '/admin/operations', label: 'Operations overview', icon: 'chart', match: ['/admin/operations'] },
          { id: 'reports-content', href: '/admin/content-inventory', label: 'Content inventory', icon: 'notebook', match: ['/admin/content-inventory'] },
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
      const personHref = access.canManageConsents || access.canAccessAdminWorkspace ? '/admin/clients' : '/staff/intake';
      actions.push({
        id: 'workspace-find-person',
        label: 'Find or create person',
        href: personHref,
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

    if (access.canManageNotifications || access.canAccessAdminWorkspace) {
      actions.push({
        id: 'workspace-notification',
        label: 'Send notification',
        href: '/admin/notifications',
        description: 'Queue SMS or email',
        icon: 'file',
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
