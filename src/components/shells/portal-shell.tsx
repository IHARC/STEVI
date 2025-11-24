import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { PortalNav } from '@/components/layout/portal-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import type { PortalLink, PortalAccess } from '@/lib/portal-access';
import type { WorkspaceContextValue } from '@/components/providers/workspace-provider';

type PortalShellProps = {
  children: ReactNode;
  navLinks: PortalLink[];
  portalAccess: PortalAccess | null;
  workspaceContext: WorkspaceContextValue;
};

export function PortalShell({ children, navLinks, portalAccess, workspaceContext }: PortalShellProps) {
  const showClientNav = workspaceContext.activeWorkspace === 'client';

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <TopNav portalAccess={portalAccess} workspace={workspaceContext} />
      <ClientPreviewBanner />
      {showClientNav && navLinks.length > 0 ? <PortalNav links={navLinks} /> : null}
      <main id="main-content" className="flex-1 bg-background">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
