import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveStaffWorkspaceNav } from '@/lib/portal-access';
import { WorkspaceShell } from '@/components/shells/workspace-shell';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { InboxPanel } from '@/components/layout/inbox-panel';
import { fetchWorkspaceInbox, type InboxItem } from '@/lib/inbox';
import { resolveWorkspaceQuickActions } from '@/lib/workspaces';
import { Button } from '@/components/ui/button';

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

  const inboxItems: InboxItem[] = await fetchWorkspaceInbox(supabase, access, 'staff');
  const quickActions = resolveWorkspaceQuickActions(access, 'staff').filter((action) => !action.disabled);

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
    <WorkspaceShell nav={nav} stickyHeader={stickyHeader} inboxSlot={<InboxPanel items={inboxItems} />}>
      {children}
    </WorkspaceShell>
  );
}
