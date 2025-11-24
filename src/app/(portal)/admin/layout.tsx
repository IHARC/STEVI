import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveAdminWorkspaceNav } from '@/lib/portal-access';
import { WorkspaceShell } from '@/components/shells/workspace-shell';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const adminNav = resolveAdminWorkspaceNav(access);
  if (!adminNav) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  return <WorkspaceShell nav={adminNav}>{children}</WorkspaceShell>;
}
