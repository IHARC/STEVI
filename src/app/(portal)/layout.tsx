import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shells/app-shell';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { WorkspaceContextProvider } from '@/components/providers/workspace-context-provider';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';
import {
  buildCommandPaletteItems,
  resolveClientNavLinks,
  resolveWorkspaceNavForShell,
  type PortalLink,
} from '@/lib/portal-access';
import {
  isClientPreview,
  resolveWorkspaceQuickActions,
} from '@/lib/workspaces';
import { fetchWorkspaceInbox } from '@/lib/inbox';
import { getOnboardingStatusForUser } from '@/lib/onboarding/status';
import { buildPrimaryNavItems } from '@/lib/primary-nav';
import { getBrandingAssetsWithClient } from '@/lib/marketing/branding';
import { getUserNavigation } from '@/components/layout/user-nav';
import { buildEntityCommandPaletteItems } from '@/lib/command-palette';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const {
    portalAccess,
    defaultWorkspacePath,
    activeWorkspace,
    currentPath,
    currentPathname,
    supabase,
  } = await getPortalRequestContext();
  const workspaceNav = resolveWorkspaceNavForShell(portalAccess, activeWorkspace);

  if (activeWorkspace !== 'client' && !workspaceNav) {
    redirect(defaultWorkspacePath);
  }

  const shouldGateOnboarding =
    !portalAccess.canAccessAdminWorkspace &&
    !portalAccess.canAccessOrgWorkspace &&
    !portalAccess.canAccessStaffWorkspace &&
    activeWorkspace === 'client';

  if (shouldGateOnboarding) {
    const onboardingStatus = await getOnboardingStatusForUser(portalAccess.userId, supabase);
    const isOnboardingRoute = currentPathname.startsWith('/onboarding');

    if (onboardingStatus.status !== 'COMPLETED' && !isOnboardingRoute) {
      const nextParam = encodeURIComponent(currentPath || '/home');
      redirect(`/onboarding?next=${nextParam}`);
    }
  }

  const navLinks: PortalLink[] = resolveClientNavLinks(portalAccess);
  const primaryNavItems = buildPrimaryNavItems(portalAccess);
  const branding = await getBrandingAssetsWithClient(supabase);
  const navigation = await getUserNavigation(portalAccess);

  const previewingClient = isClientPreview(portalAccess, activeWorkspace);
  const quickActions = resolveWorkspaceQuickActions(portalAccess, activeWorkspace, {
    isPreview: previewingClient,
  });
  const inboxItems = await fetchWorkspaceInbox(supabase, portalAccess, activeWorkspace);
  const actionCommands = quickActions
    .filter((action) => !action.disabled)
    .map((action) => ({ href: action.href, label: action.label, group: 'Actions' }));
  const entityCommands = await buildEntityCommandPaletteItems(supabase, portalAccess);
  const commandPaletteItems = buildCommandPaletteItems(portalAccess, [
    ...actionCommands,
    ...entityCommands,
  ]);

  return (
    <PortalAccessProvider access={portalAccess}>
      <WorkspaceContextProvider access={portalAccess} defaultPath={defaultWorkspacePath}>
        <AppShell
          workspaceNav={workspaceNav}
          globalNavItems={primaryNavItems}
          clientNavLinks={navLinks}
          inboxItems={inboxItems}
          activeWorkspace={activeWorkspace}
          navigation={navigation}
          branding={branding}
          commandPaletteItems={commandPaletteItems}
        >
          {children}
        </AppShell>
      </WorkspaceContextProvider>
    </PortalAccessProvider>
  );
}
