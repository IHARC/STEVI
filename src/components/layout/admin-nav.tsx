'use client';

import { useEffect, useMemo, useState, startTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Star, StarOff, Clock } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { resolveAppIcon } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import type { WorkspaceNav, PortalLink, NavGroup } from '@/lib/portal-access';

type AdminNavProps = {
  nav: WorkspaceNav;
  variant?: 'desktop' | 'mobile';
};

export function AdminNav({ nav, variant = 'desktop' }: AdminNavProps) {
  const pathname = usePathname();
  const activeGroup = useMemo(() => findActiveGroup(nav, pathname), [nav, pathname]);

  if (variant === 'mobile') {
    return (
      <MobileAdminNav
        nav={nav}
        pathname={pathname}
        activeGroupId={activeGroup?.id ?? null}
      />
    );
  }

  return (
    <DesktopAdminNav
      nav={nav}
      pathname={pathname}
      activeGroupId={activeGroup?.id ?? null}
    />
  );
}

type DesktopAdminNavProps = {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
};

function DesktopAdminNav({ nav, pathname, activeGroupId }: DesktopAdminNavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const initialGroupId = activeGroupId ?? nav.groups[0]?.id ?? null;
  const { favorites, recents, toggleFavorite } = useNavMemory(nav, pathname);

  if (nav.groups.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div
        className={cn(
          'admin-nav-label flex h-full flex-col rounded-2xl border border-outline/12 bg-surface-container-high shadow-md transition-[width] motion-duration-medium motion-ease-standard',
          collapsed ? 'w-[68px] px-space-2xs' : 'w-64 px-space-xs',
        )}
        data-collapsed={collapsed}
        aria-label={`${nav.label} navigation`}
      >
        <div className={cn('flex items-center py-space-xs', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed ? (
            <div className="px-space-2xs text-label-xs font-semibold uppercase text-muted-foreground tracking-[0.08em]">
              {nav.label}
            </div>
          ) : (
            <span className="sr-only">{nav.label}</span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-on-surface"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-pressed={collapsed}
                aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              >
                <Icon icon={collapsed ? ChevronRight : ChevronLeft} size="sm" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-label-sm">
              {collapsed ? 'Expand' : 'Collapse'}
            </TooltipContent>
          </Tooltip>
        </div>

        {collapsed ? (
          <CollapsedNavGroups nav={nav} pathname={pathname} />
        ) : (
          <ScrollArea className="flex-1 pr-[2px] space-y-space-xs">
            <PinnedSection title="Favorites" items={favorites} />
            <PinnedSection title="Recents" items={recents} icon={Clock} />
            <NavSections
              nav={nav}
              pathname={pathname}
              initialGroupId={initialGroupId}
              onToggleFavorite={toggleFavorite}
              favorites={favorites}
            />
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  );
}

type MobileAdminNavProps = {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
};

function MobileAdminNav({ nav, pathname, activeGroupId }: MobileAdminNavProps) {
  const [open, setOpen] = useState(false);
  const initialGroupId = activeGroupId ?? nav.groups[0]?.id ?? null;

  const activeLabel = useMemo(() => {
    const match = nav.groups.flatMap((group) => group.links).find((link) => isLinkActive(link, pathname));
    return match?.label ?? 'Admin navigation';
  }, [nav.groups, pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span>{activeLabel}</span>
          <span className="text-label-sm text-muted-foreground">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[360px] p-0">
        <SheetHeader className="px-space-md pt-space-md pb-space-sm text-left">
          <SheetTitle className="text-title-md">{nav.label}</SheetTitle>
          <p className="text-body-sm text-muted-foreground">Choose a workspace section.</p>
        </SheetHeader>
        <ScrollArea className="h-full px-space-md pb-space-md">
          <div className="space-y-space-xs">
            <NavSections
              nav={nav}
              pathname={pathname}
              initialGroupId={initialGroupId}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type NavSectionsProps = {
  nav: WorkspaceNav;
  pathname: string;
  onNavigate?: () => void;
  initialGroupId: string | null;
  onToggleFavorite?: (link: PortalLink) => void;
  favorites?: PortalLink[];
};

function NavSections({ nav, pathname, onNavigate, initialGroupId, onToggleFavorite, favorites }: NavSectionsProps) {
  if (nav.groups.length === 0) return null;

  return (
    <Accordion
      key={initialGroupId ?? 'default-group'}
      type="single"
      collapsible
      defaultValue={initialGroupId ?? undefined}
      className="admin-nav-label space-y-space-3xs"
    >
      {nav.groups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="rounded-xl border border-outline/12 bg-surface-container p-space-2xs shadow-sm"
        >
          <AccordionTrigger className="rounded-lg px-space-sm py-space-2xs font-semibold uppercase text-muted-foreground hover:no-underline tracking-[0.08em]">
            <div className="flex items-center gap-space-xs">
              <Icon icon={resolveAppIcon(group.icon)} size="sm" />
              <span>{group.label}</span>
            </div>
            <span className="rounded-full bg-surface-container-low px-2 py-[3px] font-semibold text-muted-foreground">
              {group.links.length}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-space-xs">
            <div className="space-y-[2px] pb-space-sm">
                {group.links.map((link) => (
                  <AdminNavLink
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={favorites?.some((fav) => fav.href === link.href)}
                  />
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

type PinnedSectionProps = {
  title: string;
  items: PortalLink[];
  icon?: typeof Clock;
};

function PinnedSection({ title, items, icon: IconComponent }: PinnedSectionProps) {
  if (!items.length) return null;
  return (
    <div className="space-y-space-3xs">
      <div className="flex items-center gap-space-2xs px-space-2xs uppercase text-muted-foreground tracking-[0.08em]">
        {IconComponent ? <Icon icon={IconComponent} size="xs" /> : null}
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap gap-space-3xs">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-space-2xs rounded-full border border-outline/20 bg-surface-container px-space-2xs py-space-3xs text-on-surface hover:border-outline/40"
          >
            <span className="truncate max-w-[160px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function useNavMemory(nav: WorkspaceNav, pathname: string) {
  const FAVORITES_KEY = 'stevi-admin-favorites';
  const RECENTS_KEY = 'stevi-admin-recents';
  const allLinks = useMemo(() => nav.groups.flatMap((g) => g.links), [nav.groups]);

  const [favorites, setFavorites] = useState<PortalLink[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const favRaw = localStorage.getItem(FAVORITES_KEY);
      return favRaw ? (JSON.parse(favRaw) as PortalLink[]) : [];
    } catch {
      return [];
    }
  });
  const [recents, setRecents] = useState<PortalLink[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const recRaw = localStorage.getItem(RECENTS_KEY);
      return recRaw ? (JSON.parse(recRaw) as PortalLink[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const current = allLinks.find((link) => link.href === pathname);
    if (!current) return;
    startTransition(() => {
      setRecents((prev) => {
        const next = [current, ...prev.filter((item) => item.href !== current.href)].slice(0, 6);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
        return next;
      });
    });
  }, [pathname, allLinks]);

  const toggleFavorite = (link: PortalLink) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.href === link.href);
      const next = exists ? prev.filter((item) => item.href !== link.href) : [link, ...prev].slice(0, 8);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { favorites, recents, toggleFavorite };
}

type CollapsedNavGroupsProps = {
  nav: WorkspaceNav;
  pathname: string;
};

function CollapsedNavGroups({ nav, pathname }: CollapsedNavGroupsProps) {
  return (
      <div className="admin-nav-label flex flex-col items-center gap-space-2xs pb-space-sm">
      {nav.groups.map((group) => {
        const isActive = group.links.some((link) => isLinkActive(link, pathname));
        return (
      <Popover key={group.id}>
        <PopoverTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
                className={cn(
                  'h-9 w-9 rounded-lg text-muted-foreground',
                  isActive && 'bg-secondary-container text-on-secondary-container',
                )}
            aria-label={`${group.label} links`}
          >
            <Icon icon={resolveAppIcon(group.icon)} size="sm" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="admin-nav-label w-60 p-space-sm">
          <div className="flex items-center gap-space-xs pb-space-2xs">
            <Icon icon={resolveAppIcon(group.icon)} size="sm" />
            <div className="text-label-sm font-semibold uppercase text-muted-foreground tracking-[0.08em]">{group.label}</div>
            <span className="ml-auto text-label-xs text-muted-foreground">
              {group.links.length}
                </span>
              </div>
              <div className="space-y-space-3xs">
                {group.links.map((link) => (
                  <AdminNavLink key={link.href} link={link} pathname={pathname} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

type AdminNavLinkProps = {
  link: PortalLink;
  pathname: string;
  onNavigate?: () => void;
  onToggleFavorite?: (link: PortalLink) => void;
  isFavorite?: boolean;
};

function AdminNavLink({ link, pathname, onNavigate, onToggleFavorite, isFavorite }: AdminNavLinkProps) {
  const active = isLinkActive(link, pathname);

  return (
    <div
      className={cn(
        'group flex items-center gap-space-xs rounded-lg px-space-xs py-space-3xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active ? 'bg-primary/10 text-primary ring-1 ring-primary/40 shadow-level-1' : 'text-on-surface/80 hover:bg-surface-container',
      )}
    >
      <Link
        href={link.href}
        aria-current={active ? 'page' : undefined}
        className="flex flex-1 items-center gap-space-sm truncate"
        onClick={onNavigate}
      >
        {link.icon ? <Icon icon={resolveAppIcon(link.icon)} size="sm" className="text-inherit" /> : null}
        <span className="truncate">{link.label}</span>
      </Link>
      <button
        type="button"
        aria-label={isFavorite ? 'Unpin from favorites' : 'Pin to favorites'}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:text-primary',
          active && 'text-primary hover:text-primary',
        )}
        onClick={() => onToggleFavorite?.(link)}
      >
        <Icon icon={isFavorite ? Star : StarOff} size="sm" />
      </button>
    </div>
  );
}

function isLinkActive(link: PortalLink, pathname: string): boolean {
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function findActiveGroup(nav: WorkspaceNav, pathname: string): NavGroup | null {
  const directMatch = nav.groups.find((candidate) =>
    candidate.links.some((link) => isLinkActive(link, pathname)),
  );

  if (directMatch) return directMatch;

  return nav.groups[0] ?? null;
}
