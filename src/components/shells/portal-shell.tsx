import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { PortalNav } from '@/components/layout/portal-nav';
import { SiteFooter } from '@/components/SiteFooter';
import type { PortalLink, PortalAccess } from '@/lib/portal-access';

type PortalShellProps = {
  children: ReactNode;
  navLinks: PortalLink[];
  portalAccess: PortalAccess | null;
  showClientNav?: boolean;
};

export function PortalShell({ children, navLinks, portalAccess, showClientNav = true }: PortalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <TopNav portalAccess={portalAccess} />
      {showClientNav && navLinks.length > 0 ? <PortalNav links={navLinks} /> : null}
      <main id="main-content" className="flex-1 bg-background">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
