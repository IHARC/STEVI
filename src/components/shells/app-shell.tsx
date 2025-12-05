import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import { InboxPanel } from '@/components/layout/inbox-panel';
import { AppNavigationDesktop } from '@/components/layout/app-navigation';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';
import type { NavSection } from '@/lib/portal-navigation';

type AppShellProps = {
  children: ReactNode;
  navSections: NavSection[];
  globalNavItems: PrimaryNavItem[];
  inboxItems: InboxItem[];
  isClientPreview: boolean;
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
  commandPaletteItems: CommandPaletteItem[];
};

export function AppShell({
  children,
  navSections,
  globalNavItems,
  inboxItems,
  isClientPreview,
  navigation,
  branding,
  commandPaletteItems,
}: AppShellProps) {
  const showNavigation = navSections.length > 0;
  const showInbox = inboxItems.length > 0;
  const showClientPreviewBanner = isClientPreview;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {showNavigation ? (
        <AppNavigationDesktop navSections={navSections} globalNavItems={globalNavItems} />
      ) : null}
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav
          branding={branding}
          navigation={navigation}
          commands={commandPaletteItems}
          navSections={showNavigation ? navSections : []}
        />
        {showClientPreviewBanner ? <ClientPreviewBanner /> : null}
        <main id="main-content" className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6">
            <div
              className={cn(
                'grid gap-6',
                showInbox ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1',
              )}
            >
              <section className="min-w-0">
                <div className="space-y-6">
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
