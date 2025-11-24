import type { ReactNode } from 'react';
import { PortalShell } from '@/components/shells/portal-shell';
import { headers } from 'next/headers';
import { PortalAccessProvider } from '@/components/providers/portal-access-provider';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveClientNavLinks, type PortalLink } from '@/lib/portal-access';
import { WorkspaceProvider, type WorkspaceContextValue } from '@/components/providers/workspace-provider';
import {
  inferWorkspaceFromPath,
  isClientPreview,
  resolveDefaultWorkspacePath,
  resolveWorkspaceOptions,
} from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);
  const navLinks: PortalLink[] = resolveClientNavLinks(portalAccess);
  const headerList = await headers();
  const currentPath = headerList.get('next-url') ?? headerList.get('x-invoke-path') ?? '';
  const activeWorkspace = inferWorkspaceFromPath(currentPath);

  const workspaceContext: WorkspaceContextValue = {
    activeWorkspace,
    availableWorkspaces: resolveWorkspaceOptions(portalAccess),
    defaultPath: resolveDefaultWorkspacePath(portalAccess),
    previewExitPath: resolveDefaultWorkspacePath(portalAccess),
    isClientPreview: isClientPreview(portalAccess, activeWorkspace),
  };

  return (
    <PortalAccessProvider access={portalAccess}>
      <WorkspaceProvider value={workspaceContext}>
        <PortalShell navLinks={navLinks} portalAccess={portalAccess} workspaceContext={workspaceContext}>
          {children}
        </PortalShell>
      </WorkspaceProvider>
    </PortalAccessProvider>
  );
}
