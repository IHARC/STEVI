'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { ScrollArea } from '@shared/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@shared/ui/navigation-menu';
import { APP_ICON_MAP } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import type { NavSection, NavItem as PortalNavItem } from '@/lib/portal-navigation';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import { useOptionalPortalLayout } from '@shared/providers/portal-layout-provider';
import { buildOpsHubNav, type OpsHubNavItem } from '@/lib/ops-hubs';
import { isNavItemActive } from '@/lib/nav-active';

type AppNavigationProps = {
  navSections: NavSection[];
  globalNavItems?: PrimaryNavItem[];
  className?: string;
  mode?: 'full' | 'hubs';
};

export function AppNavigationDesktop({ navSections, globalNavItems = [], className }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const sections = useAugmentedSections(navSections);
  const hasNav = sections.some((section) => section.groups.length > 0);

  if (!hasNav) return null;

  return (
    <nav
      aria-label="Application navigation"
      className={cn(
        'sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border/60 bg-muted/30 px-3 py-6 xl:block',
        className,
      )}
    >
      <ScrollArea scrollbar={false} className="h-full pr-3">
        <NavContent
          navSections={sections}
          pathname={pathname}
          searchParams={searchParams}
          globalNavItems={globalNavItems}
          showGlobalNav={false}
        />
      </ScrollArea>
    </nav>
  );
}

export function AppNavigationMobile({ navSections, globalNavItems = [], mode = 'full' }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const sections = useAugmentedSections(navSections);
  const [open, setOpen] = useState(false);
  const hubs = mode === 'hubs' ? buildOpsHubNav(sections) : [];
  const hasNav = mode === 'hubs'
    ? hubs.length > 0
    : sections.some((section) => section.groups.length > 0);

  if (!hasNav) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-md border-border/60 bg-card shadow-sm"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[340px] max-w-[88vw] px-0 py-0">
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="text-base font-semibold">Navigation</SheetTitle>
          <p className="text-sm text-muted-foreground">Browse sections and tools.</p>
        </SheetHeader>
        <ScrollArea scrollbar={false} className="h-full">
          <div className="px-4 pb-6">
            {mode === 'hubs' ? (
              <HubContent hubs={hubs} pathname={pathname} searchParams={searchParams} onNavigate={() => setOpen(false)} />
            ) : (
              <NavContent
                navSections={sections}
                pathname={pathname}
                searchParams={searchParams}
                onNavigate={() => setOpen(false)}
                showGlobalNav
                globalNavItems={globalNavItems}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type NavContentProps = {
  navSections: NavSection[];
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  onNavigate?: () => void;
  globalNavItems?: PrimaryNavItem[];
  showGlobalNav?: boolean;
};

function NavContent({ navSections, pathname, searchParams, onNavigate, globalNavItems = [], showGlobalNav = true }: NavContentProps) {
  return (
    <div className="flex flex-col gap-4">
      {navSections.map((section) => (
        <section key={section.id} className="space-y-2 rounded-2xl border border-border/50 bg-card/70 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
          </div>
          <div className="space-y-3">
            {section.groups.map((group) => {
              const GroupIcon = group.icon ? APP_ICON_MAP[group.icon] : null;
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    {GroupIcon ? <GroupIcon className="h-4 w-4" aria-hidden /> : null}
                    <span>{group.label}</span>
                  </div>
                  <NavigationMenu className="w-full">
                    <NavigationMenuList className="flex w-full flex-col space-y-1">
                      {group.items.map((item) => (
                        <NavigationMenuItem key={item.href} className="w-full">
                          <NavigationMenuLink asChild className="w-full">
                            <NavLink
                              link={item}
                              pathname={pathname}
                              searchParams={searchParams}
                              onNavigate={onNavigate}
                            />
                          </NavigationMenuLink>
                        </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {showGlobalNav && globalNavItems.length ? (
        <section className="space-y-2 rounded-2xl border border-border/50 bg-card/70 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick links</p>
          <NavigationMenu className="w-full">
            <NavigationMenuList className="flex w-full flex-col space-y-1">
              {globalNavItems.map((item) => (
                <NavigationMenuItem key={item.id} className="w-full">
                  <NavigationMenuLink asChild className="w-full">
                    <NavLink
                      link={primaryNavToNavItem(item)}
                      pathname={pathname}
                      searchParams={searchParams}
                      onNavigate={onNavigate}
                    />
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </section>
      ) : null}
    </div>
  );
}

function HubContent({
  hubs,
  pathname,
  searchParams,
  onNavigate,
}: {
  hubs: OpsHubNavItem[];
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  onNavigate?: () => void;
}) {
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(() => new Set());

  return (
    <div className="space-y-3">
      {hubs.map((hub) => {
        const isActive = isNavItemActive(hub, pathname, searchParams) || hub.items.some((item) => isNavItemActive(item, pathname, searchParams));
        const hasSubmenu = hub.items.length > 1;
        const isExpanded = hasSubmenu && (isActive || expandedHubs.has(hub.id));
        return (
          <div key={hub.id} className="space-y-1">
            {hasSubmenu ? (
              <NavToggleButton
                hub={hub}
                expanded={isExpanded}
                active={isActive}
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
              <NavLink
                link={hub}
                pathname={pathname}
                searchParams={searchParams}
                onNavigate={onNavigate}
                activeOverride={isActive}
              />
            )}
            {hasSubmenu && isExpanded ? (
              <div id={`hub-mobile-${hub.id}`} className="space-y-1 pl-4">
                {hub.items.map((item) => (
                  <NavLink
                    key={item.id}
                    link={item}
                    pathname={pathname}
                    searchParams={searchParams}
                    onNavigate={onNavigate}
                    size="sub"
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function NavToggleButton({
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
  const IconComponent = hub.icon ? APP_ICON_MAP[hub.icon] : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={`hub-mobile-${hub.id}`}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'min-h-[44px]',
        active
          ? 'bg-secondary/70 text-foreground border-primary/30'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {IconComponent ? <IconComponent className="h-4 w-4" aria-hidden /> : null}
      <span className="flex-1 truncate text-left">{hub.label}</span>
      <ChevronDown className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : undefined)} aria-hidden />
    </button>
  );
}

type NavLinkProps = {
  link: Pick<PortalNavItem, 'href' | 'icon' | 'label' | 'match' | 'exact' | 'query'>;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  onNavigate?: () => void;
  size?: 'base' | 'sub';
  activeOverride?: boolean;
};

function NavLink({ link, pathname, searchParams, onNavigate, size = 'base', activeOverride }: NavLinkProps) {
  const active = activeOverride ?? isNavItemActive(link, pathname, searchParams);
  const IconComponent = link.icon ? APP_ICON_MAP[link.icon] : null;

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        size === 'sub' ? 'min-h-[36px] text-sm' : 'min-h-[44px] text-sm',
        active
          ? 'bg-secondary/70 text-foreground border-primary/30'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {IconComponent && size === 'base' ? <IconComponent className="h-4 w-4" aria-hidden /> : null}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

function useAugmentedSections(navSections: NavSection[]) {
  const layout = useOptionalPortalLayout();
  return useMemo<NavSection[]>(() => {
    if (!layout?.isClientPreview) return navSections;
    return addPreviewQueryToNavSections(navSections);
  }, [navSections, layout?.isClientPreview]);
}

function addPreviewQueryToNavSections(navSections: NavSection[]): NavSection[] {
  return navSections.map((section) => {
    if (section.area !== 'client') return section;

    return {
      ...section,
      groups: section.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          href: appendPreviewParam(item.href),
        })),
      })),
    } satisfies NavSection;
  });
}

function appendPreviewParam(href: string): string {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
    return href;
  }

  try {
    const url = new URL(href, 'http://preview.local');
    url.searchParams.set('preview', '1');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href.includes('?') ? `${href}&preview=1` : `${href}?preview=1`;
  }
}

function primaryNavToNavItem(item: PrimaryNavItem): Pick<PortalNavItem, 'href' | 'icon' | 'label' | 'match'> {
  return {
    href: item.href,
    icon: item.icon,
    label: item.label,
    match: item.match,
  };
}
