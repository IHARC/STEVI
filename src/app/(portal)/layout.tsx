import type { ReactNode } from 'react';
import { PortalShell } from '@/components/shells/portal-shell';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { WorkspaceContextProvider } from '@/components/providers/workspace-context-provider';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveClientNavLinks, type PortalLink } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);
  const navLinks: PortalLink[] = resolveClientNavLinks(portalAccess);
  const defaultWorkspacePath = resolveDefaultWorkspacePath(portalAccess);

  return (
    <PortalAccessProvider access={portalAccess}>
      <WorkspaceContextProvider access={portalAccess} defaultPath={defaultWorkspacePath}>
        <PortalShell navLinks={navLinks} portalAccess={portalAccess}>
          {children}
        </PortalShell>
      </WorkspaceContextProvider>
    </PortalAccessProvider>
  );
}
