import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import { InboxPanel } from '@/components/layout/inbox-panel';
import { WorkspaceDrawerDesktop } from '@/components/layout/workspace-drawer';
import type { CommandPaletteItem, WorkspaceNav } from '@/lib/portal-access';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { WorkspaceId, WorkspaceOption } from '@/lib/workspaces';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';

type AppShellProps = {
  children: ReactNode;
  workspaceNav: WorkspaceNav | null;
  globalNavItems: PrimaryNavItem[];
  workspaceOptions: WorkspaceOption[];
  inboxItems: InboxItem[];
  activeWorkspace: WorkspaceId;
  isClientPreview: boolean;
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
  commandPaletteItems: CommandPaletteItem[];
};

export function AppShell({
  children,
  workspaceNav,
  globalNavItems,
  workspaceOptions,
  inboxItems,
  activeWorkspace,
  isClientPreview,
  navigation,
  branding,
  commandPaletteItems,
}: AppShellProps) {
  const showWorkspaceDrawer = Boolean(workspaceNav?.groups.length);
  const showInbox = inboxItems.length > 0;
  const showClientPreviewBanner = isClientPreview;

  return (
    <div className="flex min-h-screen bg-surface-container-lowest text-on-background">
      {showWorkspaceDrawer ? (
        <WorkspaceDrawerDesktop workspaceNav={workspaceNav} globalNavItems={globalNavItems} />
      ) : null}
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav
          branding={branding}
          navigation={navigation}
          commands={commandPaletteItems}
          workspaceNav={showWorkspaceDrawer ? workspaceNav : null}
          globalNavItems={globalNavItems}
          workspaceOptions={workspaceOptions}
          activeWorkspace={activeWorkspace}
          isClientPreview={isClientPreview}
        />
        {showClientPreviewBanner ? <ClientPreviewBanner /> : null}
        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-page px-space-lg py-space-lg">
            <div
              className={cn(
                'grid gap-space-lg',
                showInbox ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1',
              )}
            >
              <section className="min-w-0">
                <div className="space-y-space-lg [&_.page-shell]:!w-full [&_.page-shell]:!max-w-none [&_.page-shell]:!p-0 [&_.page-stack]:!gap-space-lg">
                  {children}
                </div>
              </section>
              {showInbox ? <InboxPanel items={inboxItems} /> : null}
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
