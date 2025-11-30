import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, resolveStaffWorkspaceNav } from '@/lib/portal-access';
import { PortalShell } from '@/components/shells/portal-shell';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { fetchWorkspaceInbox, type InboxItem } from '@/lib/inbox';
import { resolveWorkspaceQuickActions } from '@/lib/workspaces';
import { Button } from '@/components/ui/button';
import { normalizePathFromHeader } from '@/lib/paths';
import type { WorkspaceId } from '@/lib/workspaces';
import { AdminNav } from '@/components/layout/admin-nav';
import { AdminBreadcrumbs } from '@/components/layout/admin-breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  const headerList = await headers();
  const { path: currentPath } = normalizePathFromHeader(
    headerList.get('next-url') ?? headerList.get('x-invoke-path'),
    '/staff',
  );

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
    <PortalShell
      navLinks={[]}
      portalAccess={access}
      inboxItems={inboxItems}
      activeWorkspace={'staff' satisfies WorkspaceId}
    >
      <div className="flex gap-space-lg max-lg:flex-col">
        <aside className="sticky top-24 hidden h-[calc(100vh-9rem)] w-64 flex-shrink-0 lg:block">
          <AdminNav nav={nav} />
        </aside>

        <div className="min-w-0 flex-1 space-y-space-lg">
          <div className="lg:hidden">
            <AdminNav nav={nav} variant="mobile" />
          </div>
          <AdminBreadcrumbs nav={nav} />
          {stickyHeader ? (
            <div className="sticky top-24 z-10 -mx-space-xl mb-space-sm border-b border-outline/12 bg-surface px-space-xl py-space-sm shadow-level-1 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
              {stickyHeader}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </PortalShell>
  );
}
