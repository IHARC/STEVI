import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <TopNav />
      <main id="main-content" className="flex-1 bg-background">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
