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
import { LayoutDebugOverlay } from '@shared/layout/layout-debug-overlay';

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
    <div className="client-shell min-h-screen bg-background text-foreground">
      <LayoutDebugOverlay />
      <TopNav
        navSections={navSections}
        commands={commandPaletteItems}
        navigation={navigation}
        branding={branding}
      />
      <ClientPreviewBanner />

      <div className="flex min-h-[calc(100vh-4rem)]">
        {showNavigation ? (
          <AppNavigationDesktop
            navSections={navSections}
            globalNavItems={primaryNavItems}
            className="border-r border-border/60 bg-muted/20"
          />
        ) : null}
        <div className="flex min-h-full flex-1 flex-col">
          <main id="main-content" className="flex-1">
            <div className="mx-0 w-full max-w-none px-4 py-6 md:px-6 lg:px-8 2xl:px-10">
              <div className={cn('mx-0 w-full max-w-none space-y-6')}>{children}</div>
            </div>
          </main>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
