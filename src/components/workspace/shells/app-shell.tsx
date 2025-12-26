import type { ReactNode } from 'react';
import { TopNav } from '@shared/layout/top-nav';
import { SiteFooter } from '@shared/SiteFooter';
import { ClientPreviewBanner } from '@shared/layout/client-preview-banner';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@shared/layout/user-nav';
import type { NavSection } from '@/lib/portal-navigation';
import { OpsHubRail } from '@workspace/layout/ops-hub-rail';
import { LayoutDebugOverlay } from '@shared/layout/layout-debug-overlay';
import { OpsMainGrid } from '@workspace/shells/ops-main-grid';
import type { CommandPaletteItem } from '@/lib/portal-access';
import { Toaster } from '@shared/ui/toaster';

type AppShellProps = {
  children: ReactNode;
  navSections: NavSection[];
  inboxItems: InboxItem[];
  isClientPreview: boolean;
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
  commandPaletteItems: CommandPaletteItem[];
};

export function AppShell({
  children,
  navSections,
  inboxItems,
  isClientPreview,
  navigation,
  branding,
  commandPaletteItems,
}: AppShellProps) {
  const showNavigation = navSections.length > 0;
  const showClientPreviewBanner = isClientPreview;

  return (
    <div className={cn('ops-shell min-h-screen bg-background text-foreground')}>
      <LayoutDebugOverlay />
      <Toaster position="top-right" />
      <TopNav
        branding={branding}
        navigation={navigation}
        commands={commandPaletteItems}
        navSections={showNavigation ? navSections : []}
      />
      {showClientPreviewBanner ? <ClientPreviewBanner /> : null}

      <div className="flex min-h-[calc(100vh-4rem)]">
        {showNavigation ? <OpsHubRail navSections={navSections} /> : null}
        <div className="flex min-h-full flex-1 flex-col">
          <main id="main-content" className="flex-1">
            <div className="mx-0 w-full max-w-none px-4 py-6 md:px-6 lg:px-8 2xl:px-10">
              {/* Guardrail: inbox layout gating is client-derived inside OpsMainGrid to avoid header-based path mismatches. */}
              <OpsMainGrid inboxItems={inboxItems}>{children}</OpsMainGrid>
            </div>
          </main>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
