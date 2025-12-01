import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { normalizePathFromHeader } from '@/lib/paths';
import {
  inferWorkspaceFromPath,
  resolveDefaultWorkspacePath,
  type WorkspaceId,
} from '@/lib/workspaces';
import type { SupabaseRSCClient } from '@/lib/supabase/types';

export type PortalRequestContextValue = {
  portalAccess: PortalAccess;
  defaultWorkspacePath: string;
  activeWorkspace: WorkspaceId;
  currentPathname: string;
  currentPath: string | null;
  supabase: SupabaseRSCClient;
};

export async function getPortalRequestContext(): Promise<PortalRequestContextValue> {
  const headerList = await headers();
  const { pathname: currentPathname, path: currentPath } = normalizePathFromHeader(
    headerList.get('x-invoke-path') ?? headerList.get('next-url'),
    '/',
  );

  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);

  if (!portalAccess) {
    const nextParam = encodeURIComponent(currentPath || '/home');
    redirect(`/login?next=${nextParam}`);
  }

  const defaultWorkspacePath = resolveDefaultWorkspacePath(portalAccess);
  const activeWorkspace = inferWorkspaceFromPath(currentPathname);

  return {
    portalAccess,
    defaultWorkspacePath,
    activeWorkspace,
    currentPathname,
    currentPath,
    supabase,
  };
}
