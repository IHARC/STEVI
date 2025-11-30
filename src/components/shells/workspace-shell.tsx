import type { ReactNode } from 'react';
import { AdminNav } from '@/components/layout/admin-nav';
import { AdminBreadcrumbs } from '@/components/layout/admin-breadcrumbs';
import type { WorkspaceNav, PortalAccess } from '@/lib/portal-access';
import { PrimaryNavRail } from '@/components/layout/primary-nav';
import { TopNav } from '@/components/layout/top-nav';
import { buildPrimaryNavItems } from '@/lib/primary-nav';
import type { WorkspaceId } from '@/lib/workspaces';
import { cn } from '@/lib/utils';

type WorkspaceShellProps = {
  nav: WorkspaceNav;
  children: ReactNode;
  stickyHeader?: ReactNode;
  inboxSlot?: ReactNode;
  portalAccess: PortalAccess | null;
  activeWorkspace: WorkspaceId;
};

export function WorkspaceShell({
  nav,
  children,
  stickyHeader,
  inboxSlot,
  portalAccess,
  activeWorkspace: _activeWorkspace,
}: WorkspaceShellProps) {
  const primaryNavItems = buildPrimaryNavItems(portalAccess);
  const showInbox = Boolean(inboxSlot);

  return (
    <div className="flex min-h-screen bg-surface-container-lowest text-on-background">
      <PrimaryNavRail items={primaryNavItems} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav portalAccess={portalAccess ?? null} primaryNavItems={primaryNavItems} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-space-lg py-space-xl">
            <div
              className={cn(
                'grid gap-space-xl',
                showInbox ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1',
              )}
            >
              <section className="min-w-0 space-y-space-lg rounded-3xl border border-outline/12 bg-surface p-space-lg shadow-level-1">
                <div className="flex gap-space-lg max-lg:flex-col">
                  <aside className="sticky top-24 hidden h-[calc(100vh-9rem)] w-64 flex-shrink-0 lg:block">
                    <AdminNav nav={nav} />
                  </aside>
                  <div className="flex-1 min-w-0 space-y-space-lg">
                    <div className="lg:hidden">
                      <AdminNav nav={nav} variant="mobile" />
                    </div>
                    <AdminBreadcrumbs nav={nav} />
                    {stickyHeader ? (
                      <div className="sticky top-24 z-10 -mx-space-lg mb-space-sm border-b border-outline/12 bg-surface px-space-lg py-space-sm shadow-level-1 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                        {stickyHeader}
                      </div>
                    ) : null}
                    {children}
                  </div>
                </div>
              </section>
              {inboxSlot}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export const AdminShell = WorkspaceShell;
