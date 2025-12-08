'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { ScrollArea } from '@shared/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@shared/ui/navigation-menu';
import { APP_ICON_MAP, type AppIconName } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import type { NavSection, NavItem as PortalNavItem } from '@/lib/portal-navigation';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import { resolveQuickActions, type QuickAction } from '@/lib/portal-navigation';
import { usePortalAccess } from '@shared/providers/portal-access-provider';
import { useOptionalPortalLayout } from '@shared/providers/portal-layout-provider';

type AppNavigationProps = {
  navSections: NavSection[];
  globalNavItems?: PrimaryNavItem[];
  className?: string;
};

export function AppNavigationDesktop({ navSections, globalNavItems = [], className }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const sections = useAugmentedSections(navSections);
  const hasNav = sections.some((section) => section.groups.length > 0);

  if (!hasNav) return null;

  return (
    <nav
      aria-label="Application navigation"
      className={cn(
        'sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-muted/30 px-3 py-6 xl:block',
        className,
      )}
    >
      <ScrollArea className="h-full pr-3">
        <NavContent
          navSections={sections}
          pathname={pathname}
          globalNavItems={globalNavItems}
          showGlobalNav={false}
        />
      </ScrollArea>
    </nav>
  );
}

export function AppNavigationMobile({ navSections, globalNavItems = [] }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const sections = useAugmentedSections(navSections);
  const [open, setOpen] = useState(false);
  const hasNav = sections.some((section) => section.groups.length > 0);

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
        <ScrollArea className="h-full">
          <div className="px-4 pb-6">
            <NavContent
              navSections={sections}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              showGlobalNav
              globalNavItems={globalNavItems}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type NavContentProps = {
  navSections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
  globalNavItems?: PrimaryNavItem[];
  showGlobalNav?: boolean;
};

function NavContent({ navSections, pathname, onNavigate, globalNavItems = [], showGlobalNav = true }: NavContentProps) {
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

type NavLinkProps = {
  link: Pick<PortalNavItem, 'href' | 'icon' | 'label' | 'match' | 'exact'>;
  pathname: string;
  onNavigate?: () => void;
};

function NavLink({ link, pathname, onNavigate }: NavLinkProps) {
  const active = isLinkActive(link, pathname);
  const IconComponent = link.icon ? APP_ICON_MAP[link.icon] : null;

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/50'
          : 'text-muted-foreground',
      )}
    >
      {IconComponent ? <IconComponent className="h-4 w-4" aria-hidden /> : null}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

function useAugmentedSections(navSections: NavSection[]) {
  const access = usePortalAccess();
  const layout = useOptionalPortalLayout();

  const quickActions = useMemo(() => {
    if (!access || !layout) return [] as QuickAction[];
    return resolveQuickActions(access, layout.activeArea, { isPreview: layout.isClientPreview }).filter(
      (action) => !action.disabled,
    );
  }, [access, layout]);

  return useMemo<NavSection[]>(() => {
    const baseSections: NavSection[] = quickActions.length
      ? [
          {
            id: 'quick-access',
            label: 'Quick access',
            area: navSections[0]?.area ?? 'client',
            groups: [
              {
                id: 'quick-access-group',
                label: 'Shortcuts',
                icon: 'dashboard' as AppIconName,
                items: quickActions.map((action) => ({
                  id: action.id,
                  href: action.href,
                  label: action.label,
                  icon: quickActionIcon(action.icon),
                })),
              },
            ],
          } satisfies NavSection,
          ...navSections,
        ]
      : navSections;

    if (!layout?.isClientPreview) return baseSections;

    return addPreviewQueryToNavSections(baseSections);
  }, [navSections, quickActions, layout?.isClientPreview]);
}

function quickActionIcon(icon?: QuickAction['icon']): AppIconName | undefined {
  if (!icon) return undefined;
  if (icon === 'chat') return 'message';
  if (icon === 'calendar') return 'calendar';
  if (icon === 'file') return 'file';
  return undefined;
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

function isLinkActive(link: Pick<PortalNavItem, 'href' | 'match' | 'exact'>, pathname: string): boolean {
  const hrefPath = link.href.split('?')[0];
  const matchPrefixes = link.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if ('exact' in link && link.exact) {
    return pathname === hrefPath;
  }

  if (pathname === hrefPath) return true;
  return pathname.startsWith(`${hrefPath}/`);
}

function primaryNavToNavItem(item: PrimaryNavItem): Pick<PortalNavItem, 'href' | 'icon' | 'label' | 'match'> {
  return {
    href: item.href,
    icon: item.icon,
    label: item.label,
    match: item.match,
  };
}
