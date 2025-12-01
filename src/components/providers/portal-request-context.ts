import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { normalizePathFromHeader } from '@/lib/paths';
import {
  inferWorkspaceFromPath,
  resolveDefaultWorkspace,
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
  const normalizedPath = normalizePathFromHeader(
    headerList.get('x-invoke-path') ?? headerList.get('next-url'),
    '/',
  );

  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);

  if (!portalAccess) {
    const nextParam = encodeURIComponent(normalizedPath.path || '/home');
    redirect(`/login?next=${nextParam}`);
  }

  const defaultWorkspaceOption = resolveDefaultWorkspace(portalAccess);
  const defaultWorkspacePath = defaultWorkspaceOption.href;

  // If we could not reliably detect the current path (e.g., header missing),
  // fall back to the user's highest-priority workspace so navigation matches
  // their access level instead of defaulting to the client workspace.
  const effectivePathname =
    !normalizedPath.pathname || normalizedPath.pathname === '/'
      ? defaultWorkspacePath
      : normalizedPath.pathname;
  const effectivePath =
    !normalizedPath.path || normalizedPath.path === '/'
      ? defaultWorkspacePath
      : normalizedPath.path;

  const activeWorkspace = inferWorkspaceFromPath(effectivePathname);

  return {
    portalAccess,
    defaultWorkspacePath,
    activeWorkspace,
    currentPathname: effectivePathname,
    currentPath: effectivePath,
    supabase,
  };
}
