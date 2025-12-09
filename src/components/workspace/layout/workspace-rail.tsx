"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_ICON_MAP } from '@/lib/app-icons';
import type { NavSection, NavGroup } from '@/lib/portal-navigation';
import { cn } from '@/lib/utils';

type WorkspaceRailProps = {
  navSections: NavSection[];
};

type HubLink = {
  id: string;
  label: string;
  href: string;
  icon?: keyof typeof APP_ICON_MAP;
  match?: string[];
  exact?: boolean;
};

export function WorkspaceRail({ navSections }: WorkspaceRailProps) {
  const pathname = usePathname() ?? '/';
  const hubs = buildHubLinks(navSections);

  if (!hubs.length) return null;

  return (
    <nav
      aria-label="Workspace hubs"
      className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/60 bg-muted/30 px-3 py-6 xl:block"
    >
      <div className="flex flex-col gap-2">
        {hubs.map((hub) => {
          const active = isActive(hub, pathname);
          const Icon = hub.icon ? APP_ICON_MAP[hub.icon] : null;
          return (
            <Link
              key={hub.id}
              href={hub.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active ? 'bg-primary/10 text-primary ring-1 ring-primary/40' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
              <span className="truncate">{hub.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function buildHubLinks(navSections: NavSection[]): HubLink[] {
  const workspace = navSections.find((section) => section.id === 'workspace');
  if (!workspace) return [];

  return workspace.groups.map((group: NavGroup) => {
    const item = group.items[0];
    return {
      id: group.id,
      label: group.label,
      href: item?.href ?? '#',
      icon: group.icon,
      match: item?.match,
      exact: item?.exact,
    } satisfies HubLink;
  });
}

function isActive(link: HubLink, pathname: string) {
  const hrefPath = link.href.split('?')[0];
  const matchPrefixes = link.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if (link.exact) return pathname === hrefPath;
  if (pathname === hrefPath) return true;
  return pathname.startsWith(`${hrefPath}/`);
}
