import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveStaffWorkspaceNav } from '@/lib/portal-access';
import { WorkspaceShell } from '@/components/shells/workspace-shell';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const headerList = await headers();
  const currentPath = headerList.get('next-url') ?? headerList.get('x-invoke-path') ?? '/';

  if (!access) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  if (!access.canAccessStaffWorkspace) {
    const fallback = resolveDefaultWorkspacePath(access);
    redirect(fallback);
  }

  const nav = resolveStaffWorkspaceNav(access);

  if (!nav) {
    const fallback = resolveDefaultWorkspacePath(access);
    redirect(fallback);
  }

  return <WorkspaceShell nav={nav}>{children}</WorkspaceShell>;
}
