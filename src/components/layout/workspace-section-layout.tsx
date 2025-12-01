import type { ReactNode } from 'react';
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

  return (
    <div className="space-y-space-lg">
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <WorkspaceBreadcrumbs nav={nav} />
        {availableActions.length ? (
          <div className="flex flex-wrap gap-space-xs">
            {availableActions.map((action) => (
              <Button key={action.id} asChild size="sm" variant="secondary">
                <a href={action.href}>{action.label}</a>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
