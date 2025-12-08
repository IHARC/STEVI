import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@workspace/shells/app-shell';
import { PortalAccessProvider } from '@shared/providers/portal-access-provider';
import { PortalLayoutProvider } from '@shared/providers/portal-layout-provider';
import { getPortalRequestContext } from '@shared/providers/portal-request-context';
import { buildCommandPaletteItems } from '@/lib/portal-access';
import { buildPortalNav, navAreaLabel, resolveQuickActions } from '@/lib/portal-navigation';
import { fetchPortalInbox } from '@/lib/inbox';
import { buildPrimaryNavItems } from '@/lib/primary-nav';
import { getBrandingAssetsWithClient } from '@/lib/marketing/branding';
import { getUserNavigation } from '@shared/layout/user-nav';
import { buildEntityCommandPaletteItems } from '@/lib/command-palette';
import { requireArea } from '@/lib/portal-areas';
import '@/styles/theme.workspace.css';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const {
    portalAccess,
    landingPath,
    activeArea,
    currentPath,
    supabase,
    isPreviewRequest,
  } = await getPortalRequestContext();
  const accessCheck = requireArea(portalAccess, activeArea, {
    currentPath,
    preview: isPreviewRequest,
    landingPath,
  });

  if (!accessCheck.allowed) {
    redirect(accessCheck.redirectPath);
  }

  // Workspace shell should never render in client preview mode.
  const previewingClient = accessCheck.isPreview;
  const navSections = buildPortalNav(portalAccess);

  if (navSections.length === 0) {
    redirect(landingPath);
  }

  const primaryNavItems = buildPrimaryNavItems(portalAccess);
  const branding = await getBrandingAssetsWithClient(supabase);
  const navigation = await getUserNavigation(portalAccess);

  const quickActions = resolveQuickActions(portalAccess, activeArea, {
    isPreview: previewingClient,
  });
  const inboxItems = await fetchPortalInbox(supabase, portalAccess, activeArea);
  const actionCommands = quickActions
    .filter((action) => !action.disabled)
    .map((action) => ({ href: action.href, label: action.label, group: 'Actions' }));
  const entityCommands = await buildEntityCommandPaletteItems(supabase, portalAccess);
  const commandPaletteItems = buildCommandPaletteItems(portalAccess, navSections, [
    ...actionCommands,
    ...entityCommands,
  ]);

  const primaryAreaLabel = navAreaLabel(activeArea);
  const previewExitPath = landingPath;

  return (
    <PortalAccessProvider access={portalAccess}>
      <PortalLayoutProvider
        value={{
          activeArea,
          landingPath,
          isClientPreview: previewingClient,
          clientPreviewExitPath: previewExitPath,
          primaryAreaLabel,
        }}
      >
        <AppShell
          navSections={navSections}
          globalNavItems={primaryNavItems}
          inboxItems={inboxItems}
          isClientPreview={previewingClient}
          navigation={navigation}
          branding={branding}
          commandPaletteItems={commandPaletteItems}
        >
          {children}
        </AppShell>
      </PortalLayoutProvider>
    </PortalAccessProvider>
  );
}
