import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import { WorkspaceClientNav } from '@/components/layout/workspace-client-nav';
import type { PortalLink, PortalAccess } from '@/lib/portal-access';

type PortalShellProps = {
  children: ReactNode;
  navLinks: PortalLink[];
  portalAccess: PortalAccess | null;
};

export function PortalShell({ children, navLinks, portalAccess }: PortalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <TopNav portalAccess={portalAccess} />
      <ClientPreviewBanner />
      <WorkspaceClientNav links={navLinks} />
      <main id="main-content" className="flex-1 bg-background">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
