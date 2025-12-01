import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WorkspaceSectionLayout } from '@/components/layout/workspace-section-layout';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';
import { resolveOrgWorkspaceNav } from '@/lib/portal-access';
import { resolveWorkspaceQuickActions } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const { portalAccess, defaultWorkspacePath } = await getPortalRequestContext();
  const nav = resolveOrgWorkspaceNav(portalAccess);

  if (!nav) {
    redirect(defaultWorkspacePath);
  }

  const quickActions = resolveWorkspaceQuickActions(portalAccess, 'org').filter(
    (action) => !action.disabled,
  );

  return (
    <WorkspaceSectionLayout nav={nav} quickActions={quickActions}>
      {children}
    </WorkspaceSectionLayout>
  );
}
