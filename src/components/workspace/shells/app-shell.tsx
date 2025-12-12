import type { ReactNode } from 'react';
import { TopNav } from '@shared/layout/top-nav';
import { SiteFooter } from '@shared/SiteFooter';
import { ClientPreviewBanner } from '@shared/layout/client-preview-banner';
import { InboxPanel } from '@shared/layout/inbox-panel';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { InboxItem } from '@/lib/inbox';
import { cn } from '@/lib/utils';
import type { PortalArea } from '@/lib/portal-areas';
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
  activeArea: PortalArea;
  currentPathname?: string | null;
};

export function AppShell({
  children,
  navSections,
  inboxItems,
  isClientPreview,
  navigation,
  branding,
  commandPaletteItems,
  activeArea,
  currentPathname,
}: AppShellProps) {
  const showNavigation = navSections.length > 0;
  const showInbox = shouldShowInbox(activeArea, currentPathname) && inboxItems.length > 0;
  const showClientPreviewBanner = isClientPreview;

  return (
    <div className={cn('ops-shell min-h-screen bg-background text-foreground')}>
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
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
              <div
                className={cn(
                  'grid gap-6',
                  showInbox ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1',
                )}
              >
                <section className="min-w-0">
                  <div className="space-y-6">{children}</div>
                </section>
                {showInbox ? <InboxPanel items={inboxItems} /> : null}
              </div>
            </div>
          </main>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}

function shouldShowInbox(area: PortalArea, pathname: string | null | undefined) {
  if (area !== 'ops_frontline') return false;
  const cleaned = (pathname ?? '').split('?')[0];
  return cleaned === '/ops/today';
}
