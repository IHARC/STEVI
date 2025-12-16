'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_ICON_MAP } from '@/lib/app-icons';
import type { NavSection } from '@/lib/portal-navigation';
import { buildOpsHubLinks, type OpsHubLink } from '@/lib/ops-hubs';
import { cn } from '@/lib/utils';

type OpsHubRailProps = {
  navSections: NavSection[];
};

export function OpsHubRail({ navSections }: OpsHubRailProps) {
  const pathname = usePathname() ?? '/';
  const hubs = useMemo(() => buildOpsHubLinks(navSections), [navSections]);

  if (!hubs.length) return null;

  return (
    <nav
      aria-label="Operations hubs"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 border-r border-border/60 bg-muted/30 px-3 py-6 lg:block"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          {hubs.map((hub) => (
            <HubLinkRow key={hub.id} hub={hub} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function HubLinkRow({ hub, pathname }: { hub: OpsHubLink; pathname: string }) {
  const active = isActive(hub, pathname);
  const Icon = hub.icon ? APP_ICON_MAP[hub.icon] : null;

  return (
    <Link
      href={hub.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'text-foreground hover:bg-muted',
        active ? 'bg-primary/10 text-primary ring-1 ring-primary/40' : undefined,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      <span className="truncate">{hub.label}</span>
    </Link>
  );
}

function isActive(link: OpsHubLink, pathname: string) {
  const hrefPath = link.href.split('?')[0];
  const matchPrefixes = link.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if (link.exact) return pathname === hrefPath;
  if (pathname === hrefPath) return true;
  return pathname.startsWith(`${hrefPath}/`);
}
