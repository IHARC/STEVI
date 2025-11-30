import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveAdminWorkspaceNav } from '@/lib/portal-access';
import { WorkspaceShell } from '@/components/shells/workspace-shell';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { InboxPanel } from '@/components/layout/inbox-panel';
import { fetchWorkspaceInbox } from '@/lib/inbox';
import { resolveWorkspaceQuickActions } from '@/lib/workspaces';
import { Button } from '@/components/ui/button';
import { normalizePathFromHeader } from '@/lib/paths';
import type { WorkspaceId } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const headerList = await headers();
  const { path: currentPath } = normalizePathFromHeader(
    headerList.get('next-url') ?? headerList.get('x-invoke-path'),
    '/admin',
  );

  if (!access) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const adminNav = resolveAdminWorkspaceNav(access);
  if (!adminNav) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const inboxItems = await fetchWorkspaceInbox(supabase, access, 'admin');
  const quickActions = resolveWorkspaceQuickActions(access, 'admin').filter((action) => !action.disabled);

  const stickyHeader = quickActions.length ? (
    <div className="flex flex-wrap items-center gap-space-sm">
      {quickActions.map((action) => (
        <Button key={action.id} asChild size="sm" variant="secondary">
          <a href={action.href}>{action.label}</a>
        </Button>
      ))}
    </div>
  ) : null;

  return (
    <WorkspaceShell
      nav={adminNav}
      stickyHeader={stickyHeader}
      inboxSlot={<InboxPanel items={inboxItems} />}
      portalAccess={access}
      activeWorkspace={'admin' satisfies WorkspaceId}
    >
      {children}
    </WorkspaceShell>
  );
}
