import type { AppIconName } from '@/lib/app-icons';
import type { PortalAccess } from '@/lib/portal-access';

export type PortalArea = 'client' | 'staff' | 'admin' | 'org';

type NavRule = (access: PortalAccess) => boolean;

type NavItemDefinition = {
  id: string;
  href: string;
  label: string;
  icon?: AppIconName;
  match?: string[];
  exact?: boolean;
  requires?: NavRule;
};

type NavGroupDefinition = {
  id: string;
  label: string;
  description?: string;
  icon?: AppIconName;
  items: NavItemDefinition[];
  requires?: NavRule;
};

type NavSectionDefinition = {
  id: string;
  label: string;
  description?: string;
  area: PortalArea;
  groups: NavGroupDefinition[];
  requires?: NavRule;
};

export type NavItem = Omit<NavItemDefinition, 'requires'>;
export type NavGroup = Omit<NavGroupDefinition, 'requires' | 'items'> & { items: NavItem[] };
export type NavSection = Omit<NavSectionDefinition, 'requires' | 'groups'> & { groups: NavGroup[] };

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: 'calendar' | 'chat' | 'file';
  disabled?: boolean;
};

const isApproved = (access: PortalAccess) => access.isProfileApproved;
const hasElevatedAdminAccess = (access: PortalAccess) =>
  isApproved(access) && (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin'));
const canManageUsers = (access: PortalAccess) =>
  isApproved(access) &&
  (access.portalRoles.includes('portal_admin') ||
    access.iharcRoles.includes('iharc_admin') ||
    access.portalRoles.includes('portal_org_admin'));
const canManageOrgs = (access: PortalAccess) =>
  isApproved(access) && (access.portalRoles.includes('portal_org_admin') || access.portalRoles.includes('portal_org_rep'));
const canAccessContentHub = (access: PortalAccess) =>
  isApproved(access) &&
  (access.canManageWebsiteContent || access.canManageResources || access.canManagePolicies || access.canManageNotifications);
const canAccessPeopleHub = (access: PortalAccess) =>
  isApproved(access) &&
  (access.canManageConsents || canManageUsers(access) || hasElevatedAdminAccess(access) || access.canManageOrgUsers);
const canAccessInventoryHub = (access: PortalAccess) =>
  access.canAccessInventoryWorkspace || access.iharcRoles.includes('iharc_admin');

const NAV_SECTIONS: NavSectionDefinition[] = [
  {
    id: 'client-portal',
    label: 'Client portal',
    description: 'Home, support, records, and profile',
    area: 'client',
    groups: [
      {
        id: 'client-home',
        label: 'Overview',
        items: [
          { id: 'client-home', href: '/home', label: 'Today', icon: 'home', match: ['/home'] },
          { id: 'client-appointments', href: '/appointments', label: 'Appointments', icon: 'calendar', match: ['/appointments'] },
        ],
      },
      {
        id: 'client-support',
        label: 'Care & support',
        items: [
          { id: 'client-cases', href: '/cases', label: 'My cases', icon: 'briefcase', match: ['/cases'] },
          { id: 'client-support-requests', href: '/support', label: 'Support requests', icon: 'lifebuoy', match: ['/support'] },
          { id: 'client-messages', href: '/messages', label: 'Messages', icon: 'message', match: ['/messages'] },
        ],
      },
      {
        id: 'client-records',
        label: 'Records',
        items: [
          { id: 'client-documents', href: '/documents', label: 'Documents', icon: 'file', match: ['/documents'] },
          { id: 'client-resources', href: '/resources', label: 'Resources', icon: 'book', match: ['/resources'] },
        ],
      },
      {
        id: 'client-profile',
        label: 'Profile & consents',
        items: [
          { id: 'client-profile', href: '/profile', label: 'Profile', icon: 'settings', exact: true },
          { id: 'client-consents', href: '/profile/consents', label: 'Consents', icon: 'shield', match: ['/profile/consents'] },
        ],
      },
    ],
  },
  {
    id: 'staff-tools',
    label: 'Staff tools',
    description: 'Caseload, tasks, outreach, and schedules',
    area: 'staff',
    requires: (access) => access.canAccessStaffWorkspace || access.canAccessAdminWorkspace,
    groups: [
      {
        id: 'staff-caseload',
        label: 'Caseload',
        items: [
          { id: 'staff-overview', href: '/staff/overview', label: 'Overview', icon: 'dashboard', match: ['/staff/overview'] },
          { id: 'staff-caseload-active', href: '/staff/caseload', label: 'Active caseload', icon: 'users', match: ['/staff/caseload'] },
          { id: 'staff-cases-all', href: '/staff/cases', label: 'All cases', icon: 'briefcase', match: ['/staff/cases'] },
          { id: 'staff-intake', href: '/staff/intake', label: 'Intake queue', icon: 'inbox', match: ['/staff/intake'] },
        ],
      },
      {
        id: 'staff-tasks',
        label: 'Tasks & workflows',
        items: [
          { id: 'staff-my-tasks', href: '/staff/tasks', label: 'My tasks', icon: 'list', match: ['/staff/tasks'] },
          { id: 'staff-team-tasks', href: '/staff/tasks/team', label: 'Team tasks', icon: 'users', match: ['/staff/tasks/team'] },
        ],
      },
      {
        id: 'staff-field',
        label: 'Field operations',
        items: [
          { id: 'staff-outreach', href: '/staff/outreach', label: 'Outreach', icon: 'notebook', match: ['/staff/outreach'] },
          { id: 'staff-appointments', href: '/staff/appointments', label: 'Appointments', icon: 'calendar', match: ['/staff/appointments'] },
          { id: 'staff-schedule', href: '/staff/schedule', label: 'Schedule', icon: 'calendarRange', match: ['/staff/schedule'] },
        ],
      },
      {
        id: 'staff-shifts',
        label: 'Shifts & logs',
        items: [
          { id: 'staff-shift-logs', href: '/staff/shifts/logs', label: 'Shift logs', icon: 'clock', match: ['/staff/shifts/logs'] },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Operations, access, content, and inventory',
    area: 'admin',
    requires: (access) => access.canAccessAdminWorkspace,
    groups: [
      {
        id: 'admin-operations',
        label: 'Operations',
        items: [
          {
            id: 'admin-operations-overview',
            href: '/admin/operations',
            label: 'Operations hub',
            icon: 'dashboard',
            match: ['/admin/operations', '/admin/approvals', '/admin/appointments', '/admin/warming-room', '/admin/service-rules', '/admin/templates'],
          },
        ],
      },
      {
        id: 'admin-people',
        label: 'People & access',
        items: [
          {
            id: 'admin-people-hub',
            href: '/admin/people',
            label: 'People & access',
            icon: 'users',
            match: ['/admin/people', '/admin/clients', '/admin/consents', '/admin/users', '/admin/profiles', '/admin/organizations', '/admin/permissions'],
            requires: canAccessPeopleHub,
          },
        ],
      },
      {
        id: 'admin-content',
        label: 'Content & site',
        items: [
          {
            id: 'admin-content-hub',
            href: '/admin/content',
            label: 'Content & website',
            icon: 'notebook',
            match: ['/admin/content', '/admin/website', '/admin/resources', '/admin/policies', '/admin/notifications'],
            requires: canAccessContentHub,
          },
        ],
      },
      {
        id: 'admin-inventory',
        label: 'Inventory & donations',
        items: [
          {
            id: 'admin-inventory-hub',
            href: '/admin/inventory/overview',
            label: 'Inventory & donations',
            icon: 'boxes',
            match: ['/admin/inventory/overview', '/admin/inventory/items', '/admin/inventory/donations-mapping', '/admin/donations', '/admin/inventory'],
            requires: canAccessInventoryHub,
          },
        ],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    description: 'Org overview, members, and settings',
    area: 'org',
    requires: (access) => access.canAccessOrgWorkspace,
    groups: [
      {
        id: 'org-overview',
        label: 'Overview',
        items: [
          { id: 'org-home', href: '/org', label: 'Overview', icon: 'dashboard', exact: true },
        ],
      },
      {
        id: 'org-people',
        label: 'People',
        items: [
          { id: 'org-members', href: '/org/members', label: 'Members', icon: 'users', match: ['/org/members'], requires: (access) => access.canManageOrgUsers },
        ],
      },
      {
        id: 'org-settings',
        label: 'Settings',
        items: [
          { id: 'org-settings-general', href: '/org/settings', label: 'Settings', icon: 'settings', match: ['/org/settings'], requires: canManageOrgs },
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

export function inferPortalAreaFromPath(pathname: string): PortalArea {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/org')) return 'org';
  return 'client';
}

export function resolveLandingPath(access: PortalAccess | null): string {
  if (!access) return '/home';
  if (access.canAccessAdminWorkspace) return '/admin/operations';
  if (access.canAccessStaffWorkspace) return '/staff/overview';
  if (access.canAccessOrgWorkspace) return '/org';
  return '/home';
}

export function isClientPreview(access: PortalAccess | null, pathname: string): boolean {
  if (!access) return false;
  const area = inferPortalAreaFromPath(pathname);
  if (area !== 'client') return false;
  const hasOtherAccess =
    access.canAccessAdminWorkspace || access.canAccessOrgWorkspace || access.canAccessStaffWorkspace;
  return hasOtherAccess;
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

  if (area === 'staff') {
    return [
      {
        id: 'staff-add-outreach',
        label: 'Log outreach note',
        href: '/staff/outreach',
        description: 'Capture quick outreach details',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'staff-new-case-note',
        label: 'Add case note',
        href: '/staff/cases',
        description: 'Open cases and add updates',
        icon: 'file',
        disabled: previewDisabled,
      },
    ];
  }

  if (area === 'org') {
    return [
      {
        id: 'org-new-invite',
        label: 'Invite member',
        href: '/org/invites',
        description: 'Send an organization invite',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'org-add-profile',
        label: 'Update org profile',
        href: '/org/settings',
        description: 'Edit details and contacts',
        icon: 'file',
        disabled: previewDisabled,
      },
    ];
  }

  if (area === 'admin') {
    return [
      {
        id: 'admin-invite-user',
        label: 'Invite user',
        href: '/admin/profiles',
        description: 'Send portal invite',
        icon: 'chat',
        disabled: previewDisabled,
      },
      {
        id: 'admin-new-notification',
        label: 'Send notification',
        href: '/admin/notifications',
        description: 'Queue SMS or email',
        icon: 'file',
        disabled: previewDisabled,
      },
    ];
  }

  return [];
}

export function navAreaLabel(area: PortalArea): string {
  switch (area) {
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
