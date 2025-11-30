import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import { WorkspaceClientNav } from '@/components/layout/workspace-client-nav';
import { PrimaryNavRail } from '@/components/layout/primary-nav';
import type { PortalLink, PortalAccess } from '@/lib/portal-access';
import { InboxPanel } from '@/components/layout/inbox-panel';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import { buildPrimaryNavItems } from '@/lib/primary-nav';
import type { WorkspaceId } from '@/lib/workspaces';

type PortalShellProps = {
  children: ReactNode;
  navLinks: PortalLink[];
  portalAccess: PortalAccess | null;
  inboxItems?: InboxItem[];
  activeWorkspace: WorkspaceId;
};

export function PortalShell({
  children,
  navLinks,
  portalAccess,
  inboxItems = [],
  activeWorkspace,
}: PortalShellProps) {
  const showClientNav = activeWorkspace === 'client' && navLinks.length > 0;
  const showInbox = inboxItems.length > 0;
  const primaryNavItems = buildPrimaryNavItems(portalAccess);
  const showClientPreviewBanner = activeWorkspace === 'client';

  return (
    <div className="flex min-h-screen bg-surface-container-lowest text-on-background">
      <PrimaryNavRail items={primaryNavItems} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav portalAccess={portalAccess} primaryNavItems={primaryNavItems} />
        {showClientPreviewBanner ? <ClientPreviewBanner /> : null}
        {showClientNav ? (
          <div className="sticky top-[4.75rem] z-30 bg-surface-container-low/90 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-container-low/75">
            <WorkspaceClientNav links={navLinks} />
          </div>
        ) : null}
        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-space-lg py-space-xl">
            <div
              className={cn(
                'grid gap-space-xl',
                showInbox ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1',
              )}
            >
              <section className="min-w-0 rounded-3xl border border-outline/12 bg-surface shadow-level-1">
                <div className="space-y-space-xl p-space-xl [&_.page-shell]:!w-full [&_.page-shell]:!max-w-none [&_.page-shell]:!p-0 [&_.page-stack]:!gap-space-xl">
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
