import { stripRouteGroups } from '@/lib/paths';
import type { PortalAccess } from '@/lib/portal-access';

export type PortalArea = 'client' | 'ops_frontline' | 'ops_org' | 'ops_hq';

const LANDING_PATH_BY_AREA: Record<PortalArea, string> = {
  client: '/home',
  ops_frontline: '/ops/today',
  ops_org: '/ops/org',
  ops_hq: '/ops/hq',
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

  if (cleaned.startsWith('/ops/hq')) return 'ops_hq';
  if (cleaned.startsWith('/ops/org')) return 'ops_org';
  if (cleaned.startsWith('/ops')) return 'ops_frontline';
  return 'client';
}

export function resolveLandingArea(access: PortalAccess | null): PortalArea {
  if (!access) return 'client';
  if (access.canAccessOpsHq) return 'ops_hq';
  if (access.canAccessOpsFrontline) return 'ops_frontline';
  if (access.canAccessOpsOrg) return 'ops_org';
  return 'client';
}

export function landingPathForArea(area: PortalArea): string {
  return LANDING_PATH_BY_AREA[area];
}

export function resolveLandingPath(access: PortalAccess | null): string {
  const landingArea = resolveLandingArea(access);
  const landingPath = landingPathForArea(landingArea);
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
  const landingPath = options.landingPath ?? landingPathForArea(resolveLandingArea(access));
  const currentPath = options.currentPath ? stripRouteGroups(options.currentPath) : null;

  if (!access) {
    const nextParam = encodeURIComponent(currentPath ?? landingPath ?? '/home');
    return { allowed: false, redirectPath: `/login?next=${nextParam}` };
  }

  const clientHome = LANDING_PATH_BY_AREA.client;
  const hasHqAccess = access.canAccessOpsHq;
  const hasFrontlineAccess = access.canAccessOpsFrontline;
  const hasOrgAccess = access.canAccessOpsOrg;
  const hasOpsAccess = hasHqAccess || hasFrontlineAccess || hasOrgAccess;
  const previewRequested = Boolean(options.preview);

  if (area === 'ops_frontline') {
    if (hasFrontlineAccess) {
      return { allowed: true, activeArea: 'ops_frontline', isPreview: false };
    }

    const redirectPath = hasOrgAccess ? LANDING_PATH_BY_AREA.ops_org : clientHome;
    return { allowed: false, redirectPath };
  }

  if (area === 'client') {
    if (hasOpsAccess && !previewRequested) {
      return { allowed: false, redirectPath: landingPathForArea(resolveLandingArea(access)) };
    }

    return {
      allowed: true,
      activeArea: 'client',
      isPreview: hasOpsAccess && previewRequested,
    };
  }

  if (area === 'ops_hq') {
    if (hasHqAccess) {
      return { allowed: true, activeArea: 'ops_hq', isPreview: false };
    }
    return { allowed: false, redirectPath: landingPath };
  }

  if (area === 'ops_org') {
    if (hasOrgAccess) {
      return { allowed: true, activeArea: 'ops_org', isPreview: false };
    }
    const redirectPath = hasFrontlineAccess ? LANDING_PATH_BY_AREA.ops_frontline : landingPath;
    return { allowed: false, redirectPath };
  }

  return { allowed: false, redirectPath: clientHome };
}
