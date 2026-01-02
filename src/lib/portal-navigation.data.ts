import type { NavGroup, NavItem, NavSection } from '@/lib/nav-types';
import type { PortalArea } from '@/lib/portal-areas';

export type NavRuleKey =
  | 'frontline_access'
  | 'clients_access'
  | 'programs_access'
  | 'inventory_access'
  | 'fundraising_access'
  | 'reports_access'
  | 'time_tracking_access'
  | 'cfs_access'
  | 'organizations_access'
  | 'org_scoped_organizations_access'
  | 'manage_consents'
  | 'preview_client_portal'
  | 'report_costs';

export type NavItemData = NavItem & { requires?: NavRuleKey | NavRuleKey[] };
export type NavGroupData = Omit<NavGroup, 'items'> & { items: NavItemData[]; requires?: NavRuleKey | NavRuleKey[] };
export type NavSectionData = Omit<NavSection, 'groups'> & { groups: NavGroupData[]; requires?: NavRuleKey | NavRuleKey[] };

export const PORTAL_NAV_SECTIONS: NavSectionData[] = [
  {
    id: 'ops_frontline',
    label: 'Operations',
    description: 'Frontline tools for staff, volunteers, and admins',
    area: 'ops_frontline' as PortalArea,
    requires: 'frontline_access',
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
        requires: 'cfs_access',
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
        requires: 'clients_access',
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
            id: 'clients-leads',
            href: '/ops/clients?view=leads',
            label: 'Leads',
            match: ['/ops/clients'],
            query: { view: 'leads' },
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
            requires: 'manage_consents',
          },
          {
            id: 'clients-portal-preview',
            href: '/home?preview=1',
            label: 'Preview client portal',
            match: ['/home'],
            requires: 'preview_client_portal',
          },
        ],
      },
      {
        id: 'programs',
        label: 'Programs',
        icon: 'calendarRange',
        requires: 'programs_access',
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
        requires: 'time_tracking_access',
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
        requires: 'reports_access',
        isHub: true,
        items: [
          {
            id: 'reports-costs',
            href: '/ops/reports/costs',
            label: 'Costs',
            icon: 'chart',
            match: ['/ops/reports/costs'],
            requires: 'report_costs',
          },
          {
            id: 'reports-cfs',
            href: '/ops/reports/cfs',
            label: 'CFS',
            icon: 'chart',
            match: ['/ops/reports/cfs'],
            requires: 'cfs_access',
          },
        ],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'boxes',
        requires: 'inventory_access',
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
        requires: 'fundraising_access',
        isHub: true,
        items: [
          { id: 'fundraising', href: '/ops/fundraising', label: 'Fundraising', icon: 'handHeart', match: ['/ops/fundraising'] },
        ],
      },
      {
        id: 'organizations',
        label: 'Organizations',
        icon: 'building',
        requires: 'organizations_access',
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
    area: 'ops_frontline' as PortalArea,
    requires: 'org_scoped_organizations_access',
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
            requires: 'manage_consents',
          },
        ],
      },
    ],
  },
];
