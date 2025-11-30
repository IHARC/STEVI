import type { ReactNode } from 'react';
import { AdminNav } from '@/components/layout/admin-nav';
import { AdminBreadcrumbs } from '@/components/layout/admin-breadcrumbs';
import type { WorkspaceNav } from '@/lib/portal-access';

type WorkspaceShellProps = {
  nav: WorkspaceNav;
  children: ReactNode;
  stickyHeader?: ReactNode;
  inboxSlot?: ReactNode;
};

export function WorkspaceShell({ nav, children, stickyHeader, inboxSlot }: WorkspaceShellProps) {
  return (
    <div className="mx-auto w-full max-w-page px-space-md py-space-lg">
      <div className="flex gap-space-lg rounded-3xl border border-outline/12 bg-surface px-space-lg py-space-lg shadow-level-1 max-lg:flex-col">
        <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-64 flex-shrink-0 lg:block">
          <AdminNav nav={nav} />
        </aside>

        <div className="flex-1 min-w-0 space-y-space-lg">
          <div className="lg:hidden">
            <AdminNav nav={nav} variant="mobile" />
          </div>
          <AdminBreadcrumbs nav={nav} />
          {stickyHeader ? (
            <div className="sticky top-20 z-10 -mx-space-lg mb-space-sm border-b border-outline/12 bg-surface px-space-lg py-space-sm shadow-level-1 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
              {stickyHeader}
            </div>
          ) : null}
          {children}
        </div>

        {inboxSlot}
      </div>
    </div>
  );
}

export const AdminShell = WorkspaceShell;
