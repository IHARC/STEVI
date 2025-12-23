import { stripRouteGroups } from '@/lib/paths';
import type { PortalAccess } from '@/lib/portal-access';

export type PortalArea = 'client' | 'ops_frontline' | 'app_admin';

const LANDING_PATH_BY_AREA: Record<PortalArea, string> = {
  client: '/home',
  ops_frontline: '/ops/today',
  app_admin: '/app-admin',
};

type RequireAreaOptions = {
  currentPath?: string | null;
  landingPath?: string;
  preview?: boolean;
};

export type RequireAreaResult =
  | { allowed: true; activeArea: PortalArea; isPreview: boolean }
  | { allowed: false; redirectPath: string };

export function inferPortalAreaFromPath(pathname: string): PortalArea {
  const cleaned = stripRouteGroups(pathname || '');

  if (cleaned.startsWith('/app-admin')) return 'app_admin';
  if (cleaned.startsWith('/ops')) return 'ops_frontline';
  return 'client';
}

function defaultLandingPath(access: PortalAccess | null): string {
  if (!access) return LANDING_PATH_BY_AREA.client;

  const hasOpsAccess =
    access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canAccessOpsSteviAdmin;
  if (hasOpsAccess) {
    return LANDING_PATH_BY_AREA.ops_frontline;
  }

  return LANDING_PATH_BY_AREA.client;
}

export function landingPathForArea(area: PortalArea): string {
  return LANDING_PATH_BY_AREA[area];
}

export function resolveLandingPath(access: PortalAccess | null): string {
  const landingPath = defaultLandingPath(access);
  const landingArea = inferPortalAreaFromPath(landingPath);
  const result = requireArea(access, landingArea, { landingPath });

  if (!result.allowed) {
    return result.redirectPath;
  }

  return landingPath;
}

export function isPreviewQueryEnabled(path: string | null | undefined): boolean {
  if (!path) return false;

  try {
    const url = path.startsWith('http://') || path.startsWith('https://') ? new URL(path) : new URL(path, 'http://preview.local');
    const value = (url.searchParams.get('preview') ?? '').toLowerCase();
    return value === '1' || value === 'true';
  } catch {
    return false;
  }
}

export function requireArea(
  access: PortalAccess | null,
  area: PortalArea,
  options: RequireAreaOptions = {},
): RequireAreaResult {
  const landingPath = options.landingPath ?? defaultLandingPath(access);
  const currentPath = options.currentPath ? stripRouteGroups(options.currentPath) : null;

  if (!access) {
    const nextParam = encodeURIComponent(currentPath ?? landingPath ?? '/home');
    return { allowed: false, redirectPath: `/auth/start?next=${nextParam}` };
  }

  const clientHome = LANDING_PATH_BY_AREA.client;
  const hasAdminAccess = access.canAccessOpsSteviAdmin;
  const hasFrontlineAccess = access.canAccessOpsFrontline;
  const hasOrgAccess = access.canAccessOpsOrg;
  const hasOpsAccess = hasAdminAccess || hasFrontlineAccess || hasOrgAccess;
  const previewRequested = Boolean(options.preview);

  if (area === 'ops_frontline') {
    if (hasFrontlineAccess || hasOrgAccess || hasAdminAccess) {
      return { allowed: true, activeArea: 'ops_frontline', isPreview: false };
    }

    return { allowed: false, redirectPath: clientHome };
  }

  if (area === 'client') {
    if (hasOpsAccess && !previewRequested) {
      return { allowed: false, redirectPath: landingPath };
    }

    return {
      allowed: true,
      activeArea: 'client',
      isPreview: hasOpsAccess && previewRequested,
    };
  }

  if (area === 'app_admin') {
    if (hasAdminAccess) {
      return { allowed: true, activeArea: 'app_admin', isPreview: false };
    }
    return { allowed: false, redirectPath: landingPath };
  }

  return { allowed: false, redirectPath: clientHome };
}
