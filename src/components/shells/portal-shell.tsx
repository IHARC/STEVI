import type { ReactNode } from 'react';
import { TopNav } from '@/components/layout/top-nav';
import { SiteFooter } from '@/components/SiteFooter';
import { ClientPreviewBanner } from '@/components/layout/client-preview-banner';
import { WorkspaceClientNav } from '@/components/layout/workspace-client-nav';
import type { PortalLink, PortalAccess } from '@/lib/portal-access';
import { InboxPanel } from '@/components/layout/inbox-panel';
import type { InboxItem } from '@/lib/inbox';
import { PortalNavClient } from '@/components/layout/portal-nav-client';
import { cn } from '@/lib/utils';

type PortalShellProps = {
  children: ReactNode;
  navLinks: PortalLink[];
  portalAccess: PortalAccess | null;
  inboxItems?: InboxItem[];
};

export function PortalShell({ children, navLinks, portalAccess, inboxItems = [] }: PortalShellProps) {
  const showNavRail = navLinks.length > 0;
  const showInbox = inboxItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-background">
      <TopNav portalAccess={portalAccess} />
      <ClientPreviewBanner />
      <WorkspaceClientNav links={navLinks} />
      <main id="main-content" className="flex-1">
        <div className="relative isolate">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(var(--md-sys-color-primary)/0.14),transparent_45%),radial-gradient(circle_at_82%_10%,rgba(var(--md-sys-color-secondary)/0.12),transparent_40%),radial-gradient(circle_at_18%_86%,rgba(var(--md-sys-color-tertiary)/0.08),transparent_42%)]"
            aria-hidden
          />
          <div className="mx-auto w-full max-w-[1500px] px-space-lg py-space-xl">
            <div
              className={cn(
                'grid gap-space-xl',
                showNavRail && showInbox
                  ? 'lg:grid-cols-[16rem_minmax(0,1fr)_22rem] xl:grid-cols-[17rem_minmax(0,1fr)_24rem]'
                  : showNavRail
                    ? 'lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]'
                    : showInbox
                      ? 'lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]'
                      : 'lg:grid-cols-[minmax(0,1fr)]',
              )}
            >
              {showNavRail ? <PortalNavClient links={navLinks} variant="rail" /> : null}
              <section className="min-w-0 rounded-3xl border border-outline/12 bg-surface-container shadow-level-2 backdrop-blur-md">
                <div className="space-y-space-xl p-space-xl [&_.page-shell]:!w-full [&_.page-shell]:!max-w-none [&_.page-shell]:!p-0 [&_.page-stack]:!gap-space-xl">
                  {children}
                </div>
              </section>
              {showInbox ? <InboxPanel items={inboxItems} /> : null}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
