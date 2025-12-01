import type { ReactNode } from 'react';
import { WorkspaceSectionNav } from '@/components/layout/workspace-section-nav';
import { WorkspaceBreadcrumbs } from '@/components/layout/workspace-breadcrumbs';
import { Button } from '@/components/ui/button';
import type { WorkspaceNav } from '@/lib/portal-access';
import type { WorkspaceQuickAction } from '@/lib/workspaces';

type WorkspaceSectionLayoutProps = {
  nav: WorkspaceNav;
  quickActions?: WorkspaceQuickAction[];
  children: ReactNode;
};

export function WorkspaceSectionLayout({
  nav,
  quickActions = [],
  children,
}: WorkspaceSectionLayoutProps) {
  const availableActions = quickActions.filter((action) => !action.disabled);
  const stickyHeader = availableActions.length ? (
    <div className="flex flex-wrap items-center gap-space-sm">
      {availableActions.map((action) => (
        <Button key={action.id} asChild size="sm" variant="secondary">
          <a href={action.href}>{action.label}</a>
        </Button>
      ))}
    </div>
  ) : null;

  return (
    <div className="flex gap-space-lg max-lg:flex-col">
      <aside className="sticky top-24 hidden h-[calc(100vh-9rem)] w-64 flex-shrink-0 lg:block">
        <WorkspaceSectionNav nav={nav} />
      </aside>

      <div className="min-w-0 flex-1 space-y-space-lg">
        <div className="lg:hidden">
          <WorkspaceSectionNav nav={nav} variant="mobile" />
        </div>
        <WorkspaceBreadcrumbs nav={nav} />
        {stickyHeader ? (
          <div className="sticky top-24 z-10 -mx-space-xl mb-space-sm border-b border-outline/12 bg-surface px-space-xl py-space-sm shadow-level-1 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            {stickyHeader}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
