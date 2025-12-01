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
    const reportsHref = access?.canAccessAdminWorkspace ? '/admin/operations' : '/staff/overview';
    const reportMatches = access?.canAccessAdminWorkspace
      ? ['/admin/operations', '/admin/approvals', '/admin/appointments']
      : ['/staff/overview', '/staff/caseload', '/staff/tasks', '/staff/schedule'];

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
