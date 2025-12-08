import { stripRouteGroups } from '@/lib/paths';
import type { PortalAccess } from '@/lib/portal-access';

export type PortalArea = 'client' | 'staff' | 'admin' | 'org';

const LANDING_PATH_BY_AREA: Record<PortalArea, string> = {
  client: '/home',
  staff: '/staff/overview',
  admin: '/admin/operations',
  org: '/org',
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

  if (cleaned.startsWith('/admin')) return 'admin';
  if (cleaned.startsWith('/staff')) return 'staff';
  if (cleaned.startsWith('/org')) return 'org';
  return 'client';
}

export function resolveLandingArea(access: PortalAccess | null): PortalArea {
  if (!access) return 'client';
  if (access.canAccessAdminWorkspace) return 'admin';
  if (access.canAccessStaffWorkspace) return 'staff';
  if (access.canAccessOrgWorkspace) return 'org';
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
  const hasAdminAccess = access.canAccessAdminWorkspace;
  const hasStaffAccess = access.canAccessStaffWorkspace || hasAdminAccess;
  const hasOrgAccess = access.canAccessOrgWorkspace;
  const hasWorkspaceAccess = hasAdminAccess || hasStaffAccess || hasOrgAccess;
  const previewRequested = Boolean(options.preview);

  if (area === 'client') {
    if (hasWorkspaceAccess && !previewRequested) {
      return { allowed: false, redirectPath: landingPathForArea(resolveLandingArea(access)) };
    }

    return {
      allowed: true,
      activeArea: 'client',
      isPreview: hasWorkspaceAccess && previewRequested,
    };
  }

  if (area === 'admin') {
    if (hasAdminAccess) {
      return { allowed: true, activeArea: 'admin', isPreview: false };
    }
    return { allowed: false, redirectPath: clientHome };
  }

  if (area === 'staff') {
    if (hasStaffAccess) {
      return { allowed: true, activeArea: 'staff', isPreview: false };
    }
    return { allowed: false, redirectPath: clientHome };
  }

  if (area === 'org') {
    if (hasOrgAccess) {
      return { allowed: true, activeArea: 'org', isPreview: false };
    }
    return { allowed: false, redirectPath: clientHome };
  }

  return { allowed: false, redirectPath: clientHome };
}
