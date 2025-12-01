import type { AppIconName } from '@/lib/app-icons';
import type { PortalAccess } from '@/lib/portal-access';
import type { WorkspaceId } from '@/lib/workspace-types';

export type WorkspaceNavItemBlueprint = {
  id: string;
  href: string;
  label: string;
  icon?: AppIconName;
  match?: string[];
  exact?: boolean;
  requires?: (access: PortalAccess) => boolean;
};

export type WorkspaceNavGroupBlueprint = {
  id: string;
  label: string;
  icon?: AppIconName;
  items: WorkspaceNavItemBlueprint[];
};

export type WorkspaceNavBlueprint = {
  id: WorkspaceId;
  label: string;
  defaultRoute: string;
  groups: WorkspaceNavGroupBlueprint[];
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

const WORKSPACE_NAV_BLUEPRINTS: WorkspaceNavBlueprint[] = [
  {
    id: 'client',
    label: 'Client workspace',
    defaultRoute: '/home',
    groups: [
      {
        id: 'client-today',
        label: 'Today',
        icon: 'home',
        items: [
          { id: 'client-home', href: '/home', label: 'Home', icon: 'home', match: ['/home'] },
          {
            id: 'client-appointments-upcoming',
            href: '/appointments',
            label: 'Upcoming appointments',
            icon: 'calendar',
            exact: true,
          },
          {
            id: 'client-appointments-past',
            href: '/appointments/past',
            label: 'Past appointments',
            icon: 'calendarRange',
            match: ['/appointments/past'],
          },
        ],
      },
      {
        id: 'client-support',
        label: 'Care & support',
        icon: 'lifebuoy',
        items: [
          { id: 'client-cases', href: '/cases', label: 'My cases', icon: 'briefcase', match: ['/cases'] },
          { id: 'client-support-requests', href: '/support', label: 'Support requests', icon: 'lifebuoy', match: ['/support'] },
          { id: 'client-messages', href: '/messages', label: 'Messages', icon: 'message', match: ['/messages'] },
        ],
      },
      {
        id: 'client-records',
        label: 'Records',
        icon: 'file',
        items: [
          { id: 'client-documents', href: '/documents', label: 'Documents', icon: 'file', match: ['/documents'] },
          { id: 'client-resources', href: '/resources', label: 'Resources', icon: 'book', match: ['/resources'] },
        ],
      },
      {
        id: 'client-profile',
        label: 'Profile & consents',
        icon: 'shield',
        items: [
          { id: 'client-profile', href: '/profile', label: 'Profile', icon: 'settings', exact: true },
          {
            id: 'client-consents',
            href: '/profile/consents',
            label: 'Consents',
            icon: 'shield',
            match: ['/profile/consents'],
          },
        ],
      },
    ],
  },
  {
    id: 'staff',
    label: 'Staff workspace',
    defaultRoute: '/staff/overview',
    groups: [
      {
        id: 'staff-caseload',
        label: 'Caseload',
        icon: 'dashboard',
        items: [
          {
            id: 'staff-overview',
            href: '/staff/overview',
            label: 'Overview',
            icon: 'dashboard',
            match: ['/staff/overview'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-caseload-active',
            href: '/staff/caseload',
            label: 'Active caseload',
            icon: 'users',
            match: ['/staff/caseload'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-cases-all',
            href: '/staff/cases',
            label: 'All cases',
            icon: 'briefcase',
            match: ['/staff/cases'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-intake',
            href: '/staff/intake',
            label: 'Intake queue',
            icon: 'inbox',
            match: ['/staff/intake'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
        ],
      },
      {
        id: 'staff-tasks',
        label: 'Tasks & workflows',
        icon: 'list',
        items: [
          {
            id: 'staff-my-tasks',
            href: '/staff/tasks',
            label: 'My tasks',
            icon: 'list',
            match: ['/staff/tasks'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-team-tasks',
            href: '/staff/tasks/team',
            label: 'Team tasks',
            icon: 'users',
            match: ['/staff/tasks/team'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
        ],
      },
      {
        id: 'staff-field',
        label: 'Field operations',
        icon: 'route',
        items: [
          {
            id: 'staff-appointments',
            href: '/staff/appointments',
            label: 'Appointments',
            icon: 'calendar',
            match: ['/staff/appointments'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-schedule',
            href: '/staff/schedule',
            label: 'Schedule',
            icon: 'calendarRange',
            match: ['/staff/schedule'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-outreach-log',
            href: '/staff/outreach',
            label: 'Outreach log',
            icon: 'notebook',
            exact: true,
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-outreach-schedule',
            href: '/staff/outreach/schedule',
            label: 'Outreach schedule',
            icon: 'calendarRange',
            match: ['/staff/outreach/schedule'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-encampments',
            href: '/staff/outreach/encampments',
            label: 'Encampment list',
            icon: 'tent',
            match: ['/staff/outreach/encampments'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
          {
            id: 'staff-outreach-map',
            href: '/staff/outreach/map',
            label: 'Outreach map',
            icon: 'map',
            match: ['/staff/outreach/map'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
        ],
      },
      {
        id: 'staff-shifts',
        label: 'Shifts & logs',
        icon: 'clock',
        items: [
          {
            id: 'staff-shift-logs',
            href: '/staff/shifts/logs',
            label: 'Shift logs',
            icon: 'clock',
            match: ['/staff/shifts/logs'],
            requires: (access) => access.canAccessStaffWorkspace,
          },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin workspace',
    defaultRoute: '/admin/operations',
    groups: [
      {
        id: 'admin-operations',
        label: 'Operations',
        icon: 'dashboard',
        items: [
          {
            id: 'admin-operations-overview',
            href: '/admin/operations',
            label: 'Operations overview',
            icon: 'dashboard',
            match: ['/admin/operations'],
            requires: (access) => access.canAccessAdminWorkspace,
          },
          {
            id: 'admin-approvals',
            href: '/admin/approvals',
            label: 'Approvals queue',
            icon: 'approval',
            match: ['/admin/approvals'],
            requires: hasElevatedAdminAccess,
          },
          {
            id: 'admin-appointments',
            href: '/admin/appointments',
            label: 'Scheduling & appointments',
            icon: 'calendar',
            match: ['/admin/appointments'],
            requires: (access) => access.canAccessAdminWorkspace,
          },
          {
            id: 'admin-warming-room',
            href: '/admin/warming-room',
            label: 'Warming room ops',
            icon: 'flame',
            match: ['/admin/warming-room'],
            requires: hasElevatedAdminAccess,
          },
          {
            id: 'admin-service-rules',
            href: '/admin/service-rules',
            label: 'Service rules & algorithms',
            icon: 'workflow',
            match: ['/admin/service-rules'],
            requires: hasElevatedAdminAccess,
          },
          {
            id: 'admin-templates',
            href: '/admin/templates',
            label: 'Templates & tests',
            icon: 'lab',
            match: ['/admin/templates'],
            requires: hasElevatedAdminAccess,
          },
        ],
      },
      {
        id: 'admin-clients',
        label: 'Clients & consents',
        icon: 'users',
        items: [
          {
            id: 'admin-clients-directory',
            href: '/admin/clients',
            label: 'Client directory',
            icon: 'users',
            match: ['/admin/clients'],
            requires: (access) => access.canManageConsents,
          },
          {
            id: 'admin-consents',
            href: '/admin/consents',
            label: 'Consent overrides',
            icon: 'shield',
            match: ['/admin/consents'],
            requires: (access) => access.canManageConsents,
          },
        ],
      },
      {
        id: 'admin-access',
        label: 'Access & people',
        icon: 'users',
        items: [
          {
            id: 'admin-users',
            href: '/admin/users',
            label: 'Users',
            icon: 'users',
            match: ['/admin/users'],
            requires: canManageUsers,
          },
          {
            id: 'admin-permissions',
            href: '/admin/permissions',
            label: 'Permissions',
            icon: 'shield',
            match: ['/admin/permissions'],
            requires: hasElevatedAdminAccess,
          },
          {
            id: 'admin-profiles',
            href: '/admin/profiles',
            label: 'Profiles & invites',
            icon: 'idCard',
            match: ['/admin/profiles'],
            requires: hasElevatedAdminAccess,
          },
          {
            id: 'admin-organizations',
            href: '/admin/organizations',
            label: 'Organizations',
            icon: 'building',
            match: ['/admin/organizations'],
            requires: hasElevatedAdminAccess,
          },
        ],
      },
      {
        id: 'admin-content',
        label: 'Content & comms',
        icon: 'megaphone',
        items: [
          {
            id: 'admin-resources',
            href: '/admin/resources',
            label: 'Resource library',
            icon: 'notebook',
            match: ['/admin/resources'],
            requires: (access) => access.canManageResources,
          },
          {
            id: 'admin-policies',
            href: '/admin/policies',
            label: 'Policies',
            icon: 'shield',
            match: ['/admin/policies'],
            requires: (access) => access.canManagePolicies,
          },
          {
            id: 'admin-notifications',
            href: '/admin/notifications',
            label: 'Notifications',
            icon: 'megaphone',
            match: ['/admin/notifications'],
            requires: (access) => access.canManageNotifications,
          },
        ],
      },
      {
        id: 'admin-website',
        label: 'Website & marketing',
        icon: 'globe',
        items: [
          {
            id: 'admin-website-navigation',
            href: '/admin/marketing/navigation',
            label: 'Navigation',
            icon: 'globe',
            match: ['/admin/marketing/navigation'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-website-branding',
            href: '/admin/marketing/branding',
            label: 'Branding',
            icon: 'megaphone',
            match: ['/admin/marketing/branding'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-website-home',
            href: '/admin/marketing/home',
            label: 'Home & context',
            icon: 'home',
            match: ['/admin/marketing/home'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-website-supports',
            href: '/admin/marketing/supports',
            label: 'Supports',
            icon: 'lifebuoy',
            match: ['/admin/marketing/supports'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-website-programs',
            href: '/admin/marketing/programs',
            label: 'Programs',
            icon: 'briefcase',
            match: ['/admin/marketing/programs'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-website-footer',
            href: '/admin/marketing/footer',
            label: 'Footer',
            icon: 'settings',
            match: ['/admin/marketing/footer'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-public-resources',
            href: '/admin/website',
            label: 'Public resources',
            icon: 'book',
            match: ['/admin/website'],
            requires: (access) => access.canManageWebsiteContent,
          },
          {
            id: 'admin-content-inventory',
            href: '/admin/content-inventory',
            label: 'Content inventory',
            icon: 'file',
            match: ['/admin/content-inventory'],
            requires: (access) => access.canManageWebsiteContent,
          },
        ],
      },
      {
        id: 'admin-inventory',
        label: 'Inventory & donations',
        icon: 'boxes',
        items: [
          {
            id: 'admin-inventory-overview',
            href: '/admin/inventory/overview',
            label: 'Inventory overview',
            icon: 'boxes',
            match: ['/admin/inventory/overview'],
            requires: (access) => access.canAccessInventoryWorkspace,
          },
          {
            id: 'admin-inventory-items',
            href: '/admin/inventory/items',
            label: 'Items & stock levels',
            icon: 'box',
            match: ['/admin/inventory/items'],
            requires: (access) => access.canAccessInventoryWorkspace,
          },
          {
            id: 'admin-inventory-donations-map',
            href: '/admin/inventory/donations-mapping',
            label: 'Donations mapping',
            icon: 'route',
            match: ['/admin/inventory/donations-mapping'],
            requires: (access) => access.canAccessInventoryWorkspace,
          },
          {
            id: 'admin-donations',
            href: '/admin/donations',
            label: 'Donations catalogue',
            icon: 'briefcase',
            match: ['/admin/donations'],
            requires: (access) => access.iharcRoles.includes('iharc_admin'),
          },
        ],
      },
    ],
  },
  {
    id: 'org',
    label: 'Organization workspace',
    defaultRoute: '/org',
    groups: [
      {
        id: 'org-overview',
        label: 'Overview',
        icon: 'dashboard',
        items: [
          {
            id: 'org-home',
            href: '/org',
            label: 'Overview',
            icon: 'dashboard',
            exact: true,
            requires: (access) => access.canAccessOrgWorkspace,
          },
        ],
      },
      {
        id: 'org-people',
        label: 'People',
        icon: 'users',
        items: [
          {
            id: 'org-members',
            href: '/org/members',
            label: 'Members',
            icon: 'users',
            match: ['/org/members'],
            requires: (access) => access.canManageOrgUsers,
          },
          {
            id: 'org-invites',
            href: '/org/invites',
            label: 'Invitations',
            icon: 'idCard',
            match: ['/org/invites'],
            requires: (access) => access.canManageOrgInvites,
          },
        ],
      },
      {
        id: 'org-settings',
        label: 'Settings',
        icon: 'settings',
        items: [
          {
            id: 'org-settings-general',
            href: '/org/settings',
            label: 'Settings',
            icon: 'settings',
            match: ['/org/settings'],
            requires: canManageOrgs,
          },
          {
            id: 'org-appointments',
            href: '/org/appointments',
            label: 'Appointments',
            icon: 'calendar',
            match: ['/org/appointments'],
            requires: (access) => access.canAccessOrgWorkspace,
          },
        ],
      },
    ],
  },
];

export function getWorkspaceNavBlueprint(id: WorkspaceId): WorkspaceNavBlueprint | undefined {
  return WORKSPACE_NAV_BLUEPRINTS.find((blueprint) => blueprint.id === id);
}

export { WORKSPACE_NAV_BLUEPRINTS };
