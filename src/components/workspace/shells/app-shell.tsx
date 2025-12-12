import type { ReactNode } from 'react';
import { TopNav } from '@shared/layout/top-nav';
import { SiteFooter } from '@shared/SiteFooter';
import { ClientPreviewBanner } from '@shared/layout/client-preview-banner';
import { InboxPanel } from '@shared/layout/inbox-panel';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@shared/layout/user-nav';
import type { NavSection } from '@/lib/portal-navigation';
import { OpsHubRail } from '@workspace/layout/ops-hub-rail';

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
  const showInbox = inboxItems.length > 0;
  const showClientPreviewBanner = isClientPreview;

  return (
    <div className={cn('ops-shell flex min-h-screen bg-background text-foreground')}>
      {showNavigation ? (
        <OpsHubRail navSections={navSections} />
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
