'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { APP_ICON_MAP } from '@/lib/app-icons';
import type { NavSection } from '@/lib/portal-navigation';
import { buildOpsHubNav, type OpsHubNavItem } from '@/lib/ops-hubs';
import { cn } from '@/lib/utils';
import { isNavItemActive } from '@/lib/nav-active';
import { ChevronDown } from 'lucide-react';

type OpsHubRailProps = {
  navSections: NavSection[];
};

export function OpsHubRail({ navSections }: OpsHubRailProps) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const hubs = useMemo(() => buildOpsHubNav(navSections), [navSections]);
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(() => new Set());

  if (!hubs.length) return null;

  return (
    <nav
      aria-label="Operations hubs"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 border-r border-border/60 bg-muted/30 px-3 py-6 lg:block"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          {hubs.map((hub) => {
            const active = isHubActive(hub, pathname, searchParams);
            const hasSubmenu = hub.items.length > 1;
            const isExpanded = hasSubmenu && (active || expandedHubs.has(hub.id));
            return (
              <div key={hub.id} className="space-y-1">
                {hasSubmenu ? (
                  <HubToggleRow
                    hub={hub}
                    expanded={isExpanded}
                    active={active}
                    onToggle={() => {
                      setExpandedHubs((prev) => {
                        const next = new Set(prev);
                        if (next.has(hub.id)) {
                          next.delete(hub.id);
                        } else {
                          next.add(hub.id);
                        }
                        return next;
                      });
                    }}
                  />
                ) : (
                  <HubLinkRow hub={hub} pathname={pathname} searchParams={searchParams} />
                )}
                {hasSubmenu && isExpanded ? (
                  <div id={`hub-${hub.id}`} className="space-y-1 pl-7">
                    {hub.items.map((item) => (
                      <HubSubLinkRow key={item.id} item={item} pathname={pathname} searchParams={searchParams} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function HubLinkRow({
  hub,
  pathname,
  searchParams,
}: {
  hub: OpsHubNavItem;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const active = isNavItemActive(hub, pathname, searchParams);
  const Icon = hub.icon ? APP_ICON_MAP[hub.icon] : null;

  return (
    <Link
      href={hub.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[44px] items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'text-foreground/80 hover:bg-muted/70 hover:text-foreground',
        active ? 'bg-secondary/70 text-foreground border-primary/30' : undefined,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      <span className="truncate">{hub.label}</span>
    </Link>
  );
}

function HubSubLinkRow({
  item,
  pathname,
  searchParams,
}: {
  item: OpsHubNavItem['items'][number];
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const active = isNavItemActive(item, pathname, searchParams);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[36px] items-center rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'bg-secondary/70 text-foreground border-primary/30'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function HubToggleRow({
  hub,
  expanded,
  active,
  onToggle,
}: {
  hub: OpsHubNavItem;
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
}) {
  const Icon = hub.icon ? APP_ICON_MAP[hub.icon] : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={`hub-${hub.id}`}
      className={cn(
        'flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'text-foreground/80 hover:bg-muted/70 hover:text-foreground',
        active ? 'bg-secondary/70 text-foreground border-primary/30' : undefined,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      <span className="flex-1 truncate text-left">{hub.label}</span>
      <ChevronDown className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : undefined)} aria-hidden />
    </button>
  );
}

function isHubActive(hub: OpsHubNavItem, pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  if (isNavItemActive(hub, pathname, searchParams)) return true;
  return hub.items.some((item) => isNavItemActive(item, pathname, searchParams));
}
