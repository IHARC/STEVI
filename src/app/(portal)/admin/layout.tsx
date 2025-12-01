import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WorkspaceSectionLayout } from '@/components/layout/workspace-section-layout';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';
import { resolveAdminWorkspaceNav } from '@/lib/portal-access';
import { resolveWorkspaceQuickActions } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { portalAccess, defaultWorkspacePath } = await getPortalRequestContext();
  const adminNav = resolveAdminWorkspaceNav(portalAccess);

  if (!adminNav) {
    redirect(defaultWorkspacePath);
  }

  const quickActions = resolveWorkspaceQuickActions(portalAccess, 'admin').filter(
    (action) => !action.disabled,
  );

  return (
    <WorkspaceSectionLayout nav={adminNav} quickActions={quickActions}>
      {children}
    </WorkspaceSectionLayout>
  );
}
