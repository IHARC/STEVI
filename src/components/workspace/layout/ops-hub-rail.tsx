'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_ICON_MAP } from '@/lib/app-icons';
import type { NavSection } from '@/lib/portal-navigation';
import { buildOpsHubLinks, type OpsHubLink } from '@/lib/ops-hubs';
import { cn } from '@/lib/utils';

type OpsHubRailProps = {
  navSections: NavSection[];
};

const RECENTS_KEY = 'stevi.ops.recentHubs';
const RECENTS_EVENT = 'stevi.ops.recentHubs.updated';
type StoredHub = Pick<OpsHubLink, 'id' | 'href' | 'label' | 'icon' | 'match' | 'exact'>;
const EMPTY_RECENTS: StoredHub[] = [];

export function OpsHubRail({ navSections }: OpsHubRailProps) {
  const pathname = usePathname() ?? '/';
  const hubs = useMemo(() => buildOpsHubLinks(navSections), [navSections]);
  const activeHub = useMemo(() => hubs.find((hub) => isActive(hub, pathname)) ?? null, [hubs, pathname]);
  const [storedRecents, setStoredRecents] = useState<StoredHub[]>(() =>
    typeof window === 'undefined' ? EMPTY_RECENTS : readRecentsFromStorage(),
  );
  const recents = useMemo(() => {
    if (!activeHub) return storedRecents;
    return storedRecents.filter((hub) => hub.id !== activeHub.id);
  }, [activeHub, storedRecents]);

  useEffect(() => {
    const syncFromStorage = () => {
      const next = readRecentsFromStorage();
      setStoredRecents((prev) => (areHubsEqual(prev, next) ? prev : next));
    };

    const handler = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== RECENTS_KEY) return;
      syncFromStorage();
    };

    const localHandler = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== RECENTS_KEY) return;
      syncFromStorage();
    };

    window.addEventListener('storage', handler);
    window.addEventListener(RECENTS_EVENT, localHandler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(RECENTS_EVENT, localHandler);
    };
  }, []);

  useEffect(() => {
    if (!activeHub) return;

    const next = normalizeStoredHubs([activeHub, ...storedRecents.filter((hub) => hub.id !== activeHub.id)]).slice(0, 3);
    if (areHubsEqual(storedRecents, next)) return;

    writeRecentsToStorage(next);
  }, [activeHub, storedRecents]);

  if (!hubs.length) return null;

  return (
    <nav
      aria-label="Operations hubs"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 border-r border-border/60 bg-muted/30 px-3 py-6 lg:block"
    >
      <div className="flex flex-col gap-4">
        {recents.length ? (
          <div className="space-y-2">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
            <div className="flex flex-col gap-1">
              {recents.map((hub) => (
                <HubLinkRow key={`recent-${hub.id}`} hub={hub} pathname={pathname} subtle />
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          {hubs.map((hub) => (
            <HubLinkRow key={hub.id} hub={hub} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function HubLinkRow({ hub, pathname, subtle }: { hub: OpsHubLink; pathname: string; subtle?: boolean }) {
  const active = isActive(hub, pathname);
  const Icon = hub.icon ? APP_ICON_MAP[hub.icon] : null;

  return (
    <Link
      href={hub.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        subtle ? 'text-muted-foreground hover:bg-muted' : 'text-foreground hover:bg-muted',
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

function areHubsEqual(a: StoredHub[], b: StoredHub[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left.id !== right.id) return false;
    if (left.href !== right.href) return false;
    if (left.label !== right.label) return false;
    if (left.icon !== right.icon) return false;
    if (left.exact !== right.exact) return false;
    const leftMatch = left.match ?? null;
    const rightMatch = right.match ?? null;
    if (leftMatch === null && rightMatch === null) continue;
    if (leftMatch === null || rightMatch === null) return false;
    if (leftMatch.length !== rightMatch.length) return false;
    for (let matchIndex = 0; matchIndex < leftMatch.length; matchIndex += 1) {
      if (leftMatch[matchIndex] !== rightMatch[matchIndex]) return false;
    }
  }
  return true;
}

function normalizeStoredHubs(hubs: StoredHub[]): StoredHub[] {
  return hubs
    .filter((hub) => hub && typeof hub.id === 'string' && typeof hub.href === 'string' && typeof hub.label === 'string')
    .map((hub) => ({
      id: hub.id,
      href: hub.href,
      label: hub.label,
      icon: hub.icon,
      exact: hub.exact,
      match: hub.match,
    }));
}

function readRecentsFromStorage(): StoredHub[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return EMPTY_RECENTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_RECENTS;
    return normalizeStoredHubs(parsed as StoredHub[]).slice(0, 3);
  } catch {
    return EMPTY_RECENTS;
  }
}

function writeRecentsToStorage(hubs: StoredHub[]) {
  const next = normalizeStoredHubs(hubs).slice(0, 3);
  const nextRaw = JSON.stringify(next);
  const currentRaw = window.localStorage.getItem(RECENTS_KEY);
  if (currentRaw === nextRaw) return;

  window.localStorage.setItem(RECENTS_KEY, nextRaw);
  window.dispatchEvent(new CustomEvent(RECENTS_EVENT, { detail: RECENTS_KEY }));
}
