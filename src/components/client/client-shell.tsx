import type { ReactNode } from 'react';
import { TopNav } from '@shared/layout/top-nav';
import { AppNavigationDesktop } from '@shared/layout/app-navigation';
import { SiteFooter } from '@shared/SiteFooter';
import { ClientPreviewBanner } from '@shared/layout/client-preview-banner';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { NavSection } from '@/lib/nav-types';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@shared/layout/user-nav';
import { cn } from '@/lib/utils';

type ClientShellProps = {
  children: ReactNode;
  navSections: NavSection[];
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
  commandPaletteItems: CommandPaletteItem[];
  primaryNavItems?: PrimaryNavItem[];
};

export function ClientShell({
  children,
  navSections,
  navigation,
  branding,
  commandPaletteItems,
  primaryNavItems = [],
}: ClientShellProps) {
  const showNavigation = navSections.length > 0;

  return (
    <div className="client-shell flex min-h-screen bg-background text-foreground">
      {showNavigation ? (
        <AppNavigationDesktop
          navSections={navSections}
          globalNavItems={primaryNavItems}
          className="border-r border-border/60 bg-muted/20"
        />
      ) : null}
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav
          navSections={navSections}
          commands={commandPaletteItems}
          navigation={navigation}
          branding={branding}
        />
        <ClientPreviewBanner />
        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
            <div className={cn('space-y-6')}>{children}</div>
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
