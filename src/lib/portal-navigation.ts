import type { AppIconName } from '@/lib/app-icons';
import type { PortalAccess } from '@/lib/portal-access';
import type { NavGroup, NavItem, NavSection } from '@/lib/nav-types';
import type { PortalArea } from '@/lib/portal-areas';
import { PORTAL_NAV_SECTIONS, type NavGroupData, type NavItemData, type NavSectionData } from '@/lib/portal-navigation.data';
import { checkNavRule } from '@/lib/portal-navigation.rules';

export type { PortalArea } from '@/lib/portal-areas';
export { resolveLandingPath, inferPortalAreaFromPath } from '@/lib/portal-areas';
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

function filterItems(items: NavItemData[], access: PortalAccess): NavItem[] {
  return items
    .filter((item) => checkNavRule(access, item.requires))
    .map(({ requires: _requires, ...item }) => item);
}

function filterGroups(groups: NavGroupData[], access: PortalAccess): NavGroup[] {
  return groups
    .filter((group) => checkNavRule(access, group.requires))
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

  return (PORTAL_NAV_SECTIONS as NavSectionData[])
    .filter((section) => checkNavRule(access, section.requires))
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
