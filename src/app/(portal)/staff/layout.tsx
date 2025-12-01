import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WorkspaceSectionLayout } from '@/components/layout/workspace-section-layout';
import { getPortalRequestContext } from '@/components/providers/portal-request-context';
import { resolveStaffWorkspaceNav } from '@/lib/portal-access';
import { resolveWorkspaceQuickActions } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { portalAccess, defaultWorkspacePath } = await getPortalRequestContext();
  const nav = resolveStaffWorkspaceNav(portalAccess);

  if (!nav) {
    redirect(defaultWorkspacePath);
  }

  const quickActions = resolveWorkspaceQuickActions(portalAccess, 'staff').filter(
    (action) => !action.disabled,
  );

  return (
    <WorkspaceSectionLayout nav={nav} quickActions={quickActions}>
      {children}
    </WorkspaceSectionLayout>
  );
}
