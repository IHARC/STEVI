import type { PortalAccess } from '@/lib/portal-access';
import type { AppIconName } from '@/lib/app-icons';

export type PrimaryNavItem = {
  id: 'reports' | 'settings';
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
  const items: PrimaryNavItem[] = [];

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
