import type { NavSection, NavGroup, NavItem } from '@/lib/portal-navigation';

export type OpsHubNavItem = Pick<NavItem, 'href' | 'icon' | 'match' | 'exact'> & {
  id: string;
  label: string;
  items: NavItem[];
};

export function buildOpsHubNav(navSections: NavSection[]): OpsHubNavItem[] {
  const hubs: OpsHubNavItem[] = [];

  navSections.forEach((section) => {
    const hubGroups = section.groups.filter((group) => group.isHub);

    if (section.area === 'ops_frontline') {
      const groupsToUse = hubGroups.length > 0 ? hubGroups : section.groups;
      groupsToUse.forEach((group: NavGroup) => {
        const item = group.items[0];
        if (!item) return;
        hubs.push({
          id: `${section.id}-${group.id}`,
          label: group.label,
          href: item.href,
          icon: group.icon ?? item.icon,
          match: item.match ?? [item.href.split('?')[0]],
          exact: item.exact,
          items: group.items,
        });
      });
      return;
    }

    const primaryGroup = hubGroups[0] ?? section.groups[0];
    const primaryItem = primaryGroup?.items[0];
    if (!primaryItem) return;

    hubs.push({
      id: section.id,
      label: section.label,
      href: primaryItem.href,
      icon: primaryGroup?.icon ?? primaryItem.icon,
      match: primaryItem.match ?? [primaryItem.href.split('?')[0]],
      exact: primaryItem.exact,
      items: primaryGroup?.items ?? [],
    });
  });

  return hubs;
}
