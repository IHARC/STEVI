import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { normalizePathFromHeader } from '@/lib/paths';
import {
  inferPortalAreaFromPath,
  isPreviewQueryEnabled,
  resolveLandingPath,
  resolveLandingArea,
  type PortalArea,
} from '@/lib/portal-areas';
import type { SupabaseRSCClient } from '@/lib/supabase/types';

export type PortalRequestContextValue = {
  portalAccess: PortalAccess;
  landingPath: string;
  activeArea: PortalArea;
  currentPathname: string;
  currentPath: string | null;
  supabase: SupabaseRSCClient;
  isPreviewRequest: boolean;
};

export async function getPortalRequestContext(): Promise<PortalRequestContextValue> {
  const headerList = await headers();
  const rawPath =
    headerList.get('x-invoke-path') ??
    headerList.get('next-url') ??
    headerList.get('x-forwarded-path') ??
    headerList.get('x-forwarded-uri') ??
    headerList.get('x-original-url') ??
    headerList.get('x-ms-original-url') ??
    headerList.get('x-rewrite-url') ??
    headerList.get('x-request-uri');

  const normalizedPath = normalizePathFromHeader(rawPath, '/');

  const supabase = await createSupabaseRSCClient();
  const portalAccess = await loadPortalAccess(supabase);

  if (!portalAccess) {
    const nextParam = encodeURIComponent(normalizedPath.path || '/home');
    redirect(`/login?next=${nextParam}`);
  }

  const landingPath = resolveLandingPath(portalAccess);

  // If we could not reliably detect the current path (e.g., header missing),
  // fall back to the user's highest-priority area so navigation matches
  // their access level instead of defaulting to the client portal.
  const effectivePathname =
    !normalizedPath.pathname || normalizedPath.pathname === '/'
      ? landingPath
      : normalizedPath.pathname;
  const effectivePath =
    !normalizedPath.path || normalizedPath.path === '/'
      ? landingPath
      : normalizedPath.path;

  let activeArea = inferPortalAreaFromPath(effectivePathname);

  if (activeArea === 'client' && effectivePathname.startsWith('/ops')) {
    activeArea = resolveLandingArea(portalAccess);
  }
  const isPreviewRequest = isPreviewQueryEnabled(effectivePath);

  return {
    portalAccess,
    landingPath,
    activeArea,
    currentPathname: effectivePathname,
    currentPath: effectivePath,
    supabase,
    isPreviewRequest,
  };
}
