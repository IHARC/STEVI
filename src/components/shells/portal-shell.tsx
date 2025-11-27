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
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <TopNav portalAccess={portalAccess} />
      <ClientPreviewBanner />
      <WorkspaceClientNav links={navLinks} />
      <main id="main-content" className="flex-1 bg-background">
        <div className="mx-auto flex w-full max-w-page gap-space-lg px-space-md py-space-lg">
          <div className="flex-1 min-w-0">{children}</div>
          <InboxPanel items={inboxItems} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
