import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import { WorkspaceClientNav } from '@/components/layout/workspace-client-nav';
import type { PortalLink, PortalAccess } from '@/lib/portal-access';
import { InboxPanel } from '@/components/layout/inbox-panel';
import type { InboxItem } from '@/lib/inbox';

type PortalShellProps = {
  children: ReactNode;
  navLinks: PortalLink[];
  portalAccess: PortalAccess | null;
  inboxItems?: InboxItem[];
};

export function PortalShell({ children, navLinks, portalAccess, inboxItems = [] }: PortalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-container-lowest text-on-background">
      <TopNav portalAccess={portalAccess} />
      <ClientPreviewBanner />
      <WorkspaceClientNav links={navLinks} />
      <main id="main-content" className="flex-1 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-page px-space-md py-space-lg">
          <div className="rounded-3xl border border-outline/12 bg-surface px-space-lg py-space-lg shadow-level-1">
            <div className="flex w-full gap-space-lg max-lg:flex-col">
              <div className="flex-1 min-w-0">{children}</div>
              <InboxPanel items={inboxItems} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
