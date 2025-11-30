import type { PortalAccess } from '@/lib/portal-access';
import type { AppIconName } from '@/lib/app-icons';

export type PrimaryNavItem = {
  id: 'home' | 'client' | 'staff' | 'admin' | 'org' | 'reports' | 'settings';
  label: string;
  description?: string;
  href: string;
  icon: AppIconName;
  /**
   * Optional path prefixes that should mark this item as active.
   * Falls back to href matching.
   */
  match?: string[];
};

export function buildPrimaryNavItems(access: PortalAccess | null): PrimaryNavItem[] {
  const items: PrimaryNavItem[] = [
    {
      id: 'home',
      label: 'Home',
      description: 'Overview & start',
      href: '/home',
      icon: 'home',
      match: ['/home'],
    },
    {
      id: 'client',
      label: 'Client workspace',
      description: 'Appointments, documents, cases',
      href: '/home',
      icon: 'dashboard',
      // Keep the link pointing at the client landing page but only mark as active
      // for the workspace-specific sections to avoid double-highlighting with Home.
      match: ['/appointments', '/documents', '/cases', '/support'],
    },
  ];

  if (access?.canAccessStaffWorkspace) {
    items.push({
      id: 'staff',
      label: 'Staff workspace',
      description: 'Caseload & outreach',
      href: '/staff',
      icon: 'briefcase',
      match: ['/staff'],
    });
  }

  if (access?.canAccessAdminWorkspace) {
    items.push({
      id: 'admin',
      label: 'Admin workspace',
      description: 'Operations & content',
      href: '/admin',
      icon: 'shield',
      match: ['/admin'],
    });
  }

  if (access?.canAccessOrgWorkspace) {
    items.push({
      id: 'org',
      label: 'Organization workspace',
      description: 'Members, invites, settings',
      href: '/org',
      icon: 'building',
      match: ['/org'],
    });
  }

  if (access?.canAccessAdminWorkspace || access?.canAccessStaffWorkspace) {
    const reportsHref = access?.canAccessAdminWorkspace ? '/admin/appointments' : '/staff/caseload';
    const reportMatches = access?.canAccessAdminWorkspace
      ? ['/admin/appointments', '/admin/clients', '/admin/consents']
      : ['/staff/caseload', '/staff/cases', '/staff/intake'];

    items.push({
      id: 'reports',
      label: 'Reports',
      description: 'Dashboards & exports',
      href: reportsHref,
      icon: 'chart',
      match: reportMatches,
    });
  }

  items.push({
    id: 'settings',
    label: 'Settings',
    description: 'Profile & preferences',
    href: '/profile',
    icon: 'settings',
    match: ['/profile'],
  });

  return items;
}
