import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shells/app-shell';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { PortalLayoutProvider } from '@/components/providers/portal-layout-provider';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';
import { buildCommandPaletteItems } from '@/lib/portal-access';
import { buildPortalNav, inferPortalAreaFromPath, isClientPreview, navAreaLabel, resolveQuickActions } from '@/lib/portal-navigation';
import { fetchPortalInbox } from '@/lib/inbox';
import { getOnboardingStatusForUser } from '@/lib/onboarding/status';
import { buildPrimaryNavItems } from '@/lib/primary-nav';
import { getBrandingAssetsWithClient } from '@/lib/marketing/branding';
import { getUserNavigation } from '@/components/layout/user-nav';
import { buildEntityCommandPaletteItems } from '@/lib/command-palette';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const {
    portalAccess,
    landingPath,
    activeArea,
    currentPath,
    currentPathname,
    supabase,
  } = await getPortalRequestContext();
  const navSections = buildPortalNav(portalAccess);

  if (navSections.length === 0) {
    redirect(landingPath);
  }

  const shouldGateOnboarding =
    !portalAccess.canAccessAdminWorkspace &&
    !portalAccess.canAccessOrgWorkspace &&
    !portalAccess.canAccessStaffWorkspace &&
    activeArea === 'client';

  if (shouldGateOnboarding) {
    const onboardingStatus = await getOnboardingStatusForUser(portalAccess.userId, supabase);
    const isOnboardingRoute = currentPathname.startsWith('/onboarding');

    if (onboardingStatus.status !== 'COMPLETED' && !isOnboardingRoute) {
      const nextParam = encodeURIComponent(currentPath || '/home');
      redirect(`/onboarding?next=${nextParam}`);
    }
  }

  const primaryNavItems = buildPrimaryNavItems(portalAccess);
  const branding = await getBrandingAssetsWithClient(supabase);
  const navigation = await getUserNavigation(portalAccess);

  const previewingClient = isClientPreview(portalAccess, currentPathname);
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

  const landingArea = inferPortalAreaFromPath(landingPath);
  const primaryAreaLabel = navAreaLabel(landingArea);
  const previewExitPath = landingArea === 'client' ? '/home' : landingPath;

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
