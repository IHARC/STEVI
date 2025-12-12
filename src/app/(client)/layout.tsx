import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { ClientShell } from '@client/client-shell';
import { PortalAccessProvider } from '@shared/providers/portal-access-provider';
import { PortalLayoutProvider } from '@shared/providers/portal-layout-provider';
import { getPortalRequestContext } from '@shared/providers/portal-request-context';
import { buildClientNav } from '@/lib/client-navigation';
import { buildCommandPaletteItems } from '@/lib/portal-access';
import { resolveQuickActions, navAreaLabel } from '@/lib/portal-navigation';
import { buildPrimaryNavItems } from '@/lib/primary-nav';
import { getBrandingAssetsWithClient } from '@/lib/marketing/branding';
import { getUserNavigation } from '@shared/layout/user-nav';
import { getOnboardingStatusForUser } from '@/lib/onboarding/status';
import { landingPathForArea, requireArea, resolveLandingArea } from '@/lib/portal-areas';
import '@/styles/theme.client.css';

export const dynamic = 'force-dynamic';

export default async function ClientShellLayout({ children }: { children: ReactNode }) {
  const {
    portalAccess,
    landingPath,
    currentPath,
    currentPathname,
    supabase,
    isPreviewRequest,
  } = await getPortalRequestContext();

  const accessCheck = requireArea(portalAccess, 'client', {
    currentPath,
    preview: isPreviewRequest,
    landingPath,
  });

  if (!accessCheck.allowed) {
    redirect(accessCheck.redirectPath);
  }

  const isPreview = accessCheck.isPreview;
  const navSections = buildClientNav();
  const [branding, navigation] = await Promise.all([
    getBrandingAssetsWithClient(supabase),
    getUserNavigation(portalAccess),
  ]);
  const primaryNavItems = buildPrimaryNavItems(portalAccess);

  const quickActions = resolveQuickActions(portalAccess, 'client', { isPreview });
  const actionCommands = quickActions
    .filter((action) => !action.disabled)
    .map((action) => ({ href: action.href, label: action.label, group: 'Actions' }));
  const baseCommandPaletteItems = buildCommandPaletteItems(portalAccess, navSections, actionCommands);
  const commandPaletteItems = isPreview
    ? baseCommandPaletteItems.map((item) => ({ ...item, href: appendPreviewParam(item.href) }))
    : baseCommandPaletteItems;

  const primaryArea = resolveLandingArea(portalAccess);
  const primaryAreaLabel = navAreaLabel(primaryArea);
  const previewExitPath = landingPathForArea(primaryArea);

  const shouldGateOnboarding =
    !isPreview &&
    !portalAccess.canAccessOpsAdmin &&
    !portalAccess.canAccessOpsOrg &&
    !portalAccess.canAccessOpsFrontline;

  if (shouldGateOnboarding) {
    const onboardingStatus = await getOnboardingStatusForUser(portalAccess.userId, supabase);
    const isOnboardingRoute = currentPathname.startsWith('/onboarding');

    if (onboardingStatus.status !== 'COMPLETED' && !isOnboardingRoute) {
      const nextParam = encodeURIComponent(currentPath || '/home');
      redirect(`/onboarding?next=${nextParam}`);
    }
  }

  return (
    <PortalAccessProvider access={portalAccess}>
      <PortalLayoutProvider
        value={{
          activeArea: 'client',
          landingPath,
          isClientPreview: isPreview,
          clientPreviewExitPath: previewExitPath,
          primaryAreaLabel,
        }}
      >
        <ClientShell
          navSections={navSections}
          navigation={navigation}
          branding={branding}
          commandPaletteItems={commandPaletteItems}
          primaryNavItems={primaryNavItems}
        >
          {children}
        </ClientShell>
      </PortalLayoutProvider>
    </PortalAccessProvider>
  );
}

function appendPreviewParam(href: string): string {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
    return href;
  }

  try {
    const url = new URL(href, 'http://preview.local');
    url.searchParams.set('preview', '1');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href.includes('?') ? `${href}&preview=1` : `${href}?preview=1`;
  }
}
