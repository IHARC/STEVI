import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveOrgWorkspaceNav } from '@/lib/portal-access';
import { WorkspaceShell } from '@/components/shells/workspace-shell';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const headerList = await headers();
  const currentPath = headerList.get('next-url') ?? headerList.get('x-invoke-path') ?? '/';

  if (!access) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  if (!access.canAccessOrgWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const nav = resolveOrgWorkspaceNav(access);
  if (!nav) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  return <WorkspaceShell nav={nav}>{children}</WorkspaceShell>;
}
