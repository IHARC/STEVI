import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPortalRequestContext } from '@shared/providers/portal-request-context';
import { requireArea } from '@/lib/portal-areas';
import { SettingsShell } from '@shared/layout/settings-shell';
import type { SettingsNavGroup } from '@shared/layout/settings-nav';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const { portalAccess, landingPath, currentPath } = await getPortalRequestContext();
  const accessCheck = requireArea(portalAccess, 'ops_org', { currentPath, landingPath });
  if (!accessCheck.allowed) {
    redirect(accessCheck.redirectPath);
  }

  const targetOrgId = resolveOrgIdFromPath(currentPath) ?? portalAccess.organizationId ?? null;
  const nav: SettingsNavGroup[] = [
    {
      label: 'Organization',
      items: [
        { label: 'Overview', href: withOrg('/ops/org', targetOrgId), match: ['/ops/org'] },
        { label: 'Members', href: withOrg('/ops/org/members', targetOrgId), match: ['/ops/org/members'] },
        { label: 'Invites', href: withOrg('/ops/org/invites', targetOrgId), match: ['/ops/org/invites'] },
        { label: 'Appointments', href: withOrg('/ops/org/appointments', targetOrgId), match: ['/ops/org/appointments'] },
        { label: 'Settings', href: withOrg('/ops/org/settings', targetOrgId), match: ['/ops/org/settings'] },
      ],
    },
  ];

  return <SettingsShell nav={nav}>{children}</SettingsShell>;
}

function withOrg(href: string, orgId: number | null) {
  if (!orgId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}orgId=${orgId}`;
}

function resolveOrgIdFromPath(path: string | null) {
  if (!path) return null;
  try {
    const url = new URL(path, 'http://local.stevi');
    const orgParam = url.searchParams.get('orgId') ?? url.searchParams.get('org') ?? url.searchParams.get('organizationId');
    if (!orgParam) return null;
    const parsed = Number.parseInt(orgParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
