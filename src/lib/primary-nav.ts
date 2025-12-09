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

  items.push({
    id: 'settings',
    label: 'Settings',
    description: 'Profile & preferences',
    href:
      access?.canAccessAdminWorkspace || access?.canAccessStaffWorkspace || access?.canAccessOrgWorkspace
        ? '/workspace/profile'
        : '/profile',
    icon: 'settings',
    match:
      access?.canAccessAdminWorkspace || access?.canAccessStaffWorkspace || access?.canAccessOrgWorkspace
        ? ['/workspace/profile']
        : ['/profile'],
  });

  return items;
}
