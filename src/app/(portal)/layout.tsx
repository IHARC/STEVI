import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/shells/portal-shell';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { WorkspaceContextProvider } from '@/components/providers/workspace-context-provider';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveClientNavLinks, type PortalLink } from '@/lib/portal-access';
import { inferWorkspaceFromPath, resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { fetchClientInboxItems } from '@/lib/inbox';
import { getOnboardingStatusForUser } from '@/lib/onboarding/status';
import { normalizePathFromHeader } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const { pathname: currentPathname, path: currentPath } = normalizePathFromHeader(
    headerList.get('x-invoke-path') ?? headerList.get('next-url'),
    '/',
  );
  const activeWorkspace = inferWorkspaceFromPath(currentPathname);
  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);

  const shouldGateOnboarding =
    portalAccess &&
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
  const defaultWorkspacePath = resolveDefaultWorkspacePath(portalAccess);
  const inboxItems = portalAccess ? await fetchClientInboxItems(supabase, portalAccess) : [];

  return (
    <PortalAccessProvider access={portalAccess}>
      <WorkspaceContextProvider access={portalAccess} defaultPath={defaultWorkspacePath}>
        {activeWorkspace === 'client' ? (
          <PortalShell
            navLinks={navLinks}
            portalAccess={portalAccess}
            inboxItems={inboxItems}
            activeWorkspace={activeWorkspace}
          >
            {children}
          </PortalShell>
        ) : (
          children
        )}
      </WorkspaceContextProvider>
    </PortalAccessProvider>
  );
}
