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
    <div className="mx-auto flex w-full max-w-page gap-space-lg px-space-md py-space-lg">
      <aside className="sticky top-24 hidden h-[calc(100vh-6rem)] w-64 flex-shrink-0 lg:block">
        <AdminNav nav={nav} />
      </aside>

      <div className="flex-1 min-w-0 space-y-space-lg">
        <div className="lg:hidden">
          <AdminNav nav={nav} variant="mobile" />
        </div>
        <AdminBreadcrumbs nav={nav} />
        {stickyHeader ? (
          <div className="sticky top-20 z-10 -mx-space-md mb-space-sm bg-gradient-to-b from-surface to-surface/80 px-space-md py-space-sm backdrop-blur supports-[backdrop-filter]:bg-surface/70">
            {stickyHeader}
          </div>
        ) : null}
        {children}
      </div>

      {inboxSlot}
    </div>
  );
}

export const AdminShell = WorkspaceShell;
