import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@workspace/shells/app-shell';
import { PortalAccessProvider } from '@shared/providers/portal-access-provider';
import { PortalLayoutProvider } from '@shared/providers/portal-layout-provider';
import { getPortalRequestContext } from '@shared/providers/portal-request-context';
import { requireArea } from '@/lib/portal-areas';
import { navAreaLabel, type NavSection } from '@/lib/portal-navigation';
import { fetchPortalInbox } from '@/lib/inbox';
import { getBrandingAssetsWithClient } from '@/lib/marketing/branding';
import { getUserNavigation } from '@shared/layout/user-nav';
import { SettingsShell } from '@shared/layout/settings-shell';
import type { SettingsNavGroup, SettingsNavItem } from '@shared/layout/settings-nav';
import type { CommandPaletteItem } from '@/lib/portal-access';
import '@/styles/theme.ops.css';

export const dynamic = 'force-dynamic';

const ADMIN_NAV: SettingsNavGroup[] = [
  {
    label: 'STEVI Admin',
    items: [
      { label: 'General settings', href: '/app-admin', match: ['/app-admin'] },
      { label: 'Users & access', href: '/app-admin/users/all', match: ['/app-admin/users'] },
      { label: 'Roles & permissions', href: '/app-admin/permissions', match: ['/app-admin/permissions'] },
      { label: 'Content & comms', href: '/app-admin/content', match: ['/app-admin/content'] },
      { label: 'Integrations', href: '/app-admin/integrations', match: ['/app-admin/integrations'] },
      {
        label: 'Website & marketing',
        href: '/app-admin/website',
        match: ['/app-admin/website'],
        items: [
          { label: 'Branding', href: '/app-admin/website/branding', match: ['/app-admin/website/branding'] },
          { label: 'Navigation', href: '/app-admin/website/navigation', match: ['/app-admin/website/navigation'] },
          { label: 'Home', href: '/app-admin/website/home', match: ['/app-admin/website/home'] },
          { label: 'Supports', href: '/app-admin/website/supports', match: ['/app-admin/website/supports'] },
          { label: 'Programs', href: '/app-admin/website/programs', match: ['/app-admin/website/programs'] },
          { label: 'Footer', href: '/app-admin/website/footer', match: ['/app-admin/website/footer'] },
          { label: 'Content inventory', href: '/app-admin/website/inventory', match: ['/app-admin/website/inventory'] },
        ],
      },
      { label: 'Operations', href: '/app-admin/operations', match: ['/app-admin/operations'] },
    ],
  },
];

function buildAdminCommands(nav: SettingsNavGroup[]): CommandPaletteItem[] {
  const commands: CommandPaletteItem[] = [];
  const seen = new Set<string>();

  const visit = (item: SettingsNavItem, groupLabel: string) => {
    if (!seen.has(item.href)) {
      commands.push({ href: item.href, label: item.label, group: groupLabel });
      seen.add(item.href);
    }
    item.items?.forEach((child) => visit(child, item.label));
  };

  nav.forEach((group) => {
    const groupLabel = group.label ?? 'App Admin';
    group.items.forEach((item) => visit(item, groupLabel));
  });

  return commands;
}

export default async function AppAdminLayout({ children }: { children: ReactNode }) {
  const { portalAccess, landingPath, currentPath, supabase, isPreviewRequest } = await getPortalRequestContext();
  const accessCheck = requireArea(portalAccess, 'app_admin', {
    currentPath,
    landingPath,
    preview: isPreviewRequest,
  });

  if (!accessCheck.allowed) {
    redirect(accessCheck.redirectPath);
  }

  const navSections: NavSection[] = [];
  const commandPaletteItems = buildAdminCommands(ADMIN_NAV);
  const [branding, navigation, inboxItems] = await Promise.all([
    getBrandingAssetsWithClient(supabase),
    getUserNavigation(portalAccess),
    fetchPortalInbox(supabase, portalAccess, accessCheck.activeArea),
  ]);

  return (
    <PortalAccessProvider access={portalAccess}>
      <PortalLayoutProvider
        value={{
          activeArea: accessCheck.activeArea,
          landingPath,
          isClientPreview: accessCheck.isPreview,
          clientPreviewExitPath: landingPath,
          primaryAreaLabel: navAreaLabel(accessCheck.activeArea),
        }}
      >
        <AppShell
          navSections={navSections}
          inboxItems={inboxItems}
          isClientPreview={accessCheck.isPreview}
          navigation={navigation}
          branding={branding}
          commandPaletteItems={commandPaletteItems}
        >
          <SettingsShell nav={ADMIN_NAV}>{children}</SettingsShell>
        </AppShell>
      </PortalLayoutProvider>
    </PortalAccessProvider>
  );
}
