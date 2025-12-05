'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import type { NavSection, NavItem as PortalNavItem } from '@/lib/portal-navigation';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import { resolveAppIcon, type AppIconName } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveQuickActions, type QuickAction } from '@/lib/portal-navigation';
import { usePortalAccess } from '@/components/providers/portal-access-provider';
import { useOptionalPortalLayout } from '@/components/providers/portal-layout-provider';

type AppNavigationProps = {
  navSections: NavSection[];
  globalNavItems?: PrimaryNavItem[];
  className?: string;
};

export function AppNavigationDesktop({ navSections, globalNavItems = [], className }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const hasNav = navSections.some((section) => section.groups.length > 0);
  const [collapsed, setCollapsed] = useState(true);

  if (!hasNav) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        aria-label="Application navigation"
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-outline/12 bg-surface-container-lowest text-on-surface shadow-level-1 xl:flex',
          collapsed ? 'w-[84px]' : 'w-64',
          className,
        )}
      >
        <div className="flex h-full w-full flex-col">
          <div className={cn('flex items-center gap-space-xs px-space-sm pb-space-xs pt-space-sm', collapsed && 'justify-center')}> 
            {!collapsed ? (
              <div className="flex flex-col leading-tight">
                <span className="text-label-sm font-semibold text-on-surface">Menu</span>
              </div>
            ) : null}
            <div className="ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-[var(--md-sys-shape-corner-small)]"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              >
                <Icon icon={collapsed ? ChevronRight : ChevronLeft} size="sm" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <NavContent
              navSections={navSections}
              pathname={pathname}
              globalNavItems={globalNavItems}
              collapsed={collapsed}
              showGlobalNav={false}
            />
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}

export function AppNavigationMobile({ navSections, globalNavItems = [] }: AppNavigationProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const hasNav = navSections.some((section) => section.groups.length > 0);

  if (!hasNav) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-[var(--md-sys-shape-corner-extra-small)] border border-outline/16 bg-surface-container-low text-on-surface shadow-level-1 hover:bg-surface-container"
          aria-label="Open navigation"
        >
          <Icon icon={Menu} size="sm" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[340px] max-w-[88vw] p-0">
        <SheetHeader className="px-space-lg pt-space-lg pb-space-sm text-left">
          <SheetTitle className="text-title-lg">Navigation</SheetTitle>
          <p className="text-body-sm text-muted-foreground">Browse sections and tools.</p>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <ScrollArea className="flex-1">
            <NavContent
              navSections={navSections}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              showGlobalNav
              globalNavItems={globalNavItems}
            />
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type NavContentProps = {
  navSections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
  globalNavItems?: PrimaryNavItem[];
  collapsed?: boolean;
  showGlobalNav?: boolean;
};

function quickActionIcon(icon?: QuickAction['icon']): AppIconName | undefined {
  if (!icon) return undefined;
  if (icon === 'chat') return 'message';
  if (icon === 'calendar') return 'calendar';
  if (icon === 'file') return 'file';
  return undefined;
}

function NavContent({ navSections, pathname, onNavigate, globalNavItems = [], collapsed = false, showGlobalNav = true }: NavContentProps) {
  const access = usePortalAccess();
  const layout = useOptionalPortalLayout();

  const quickActions = useMemo(() => {
    if (!access || !layout) return [] as QuickAction[];
    return resolveQuickActions(access, layout.activeArea, { isPreview: layout.isClientPreview }).filter((action) => !action.disabled);
  }, [access, layout]);

  const computedNavSections = useMemo(() => {
    if (!quickActions.length) return navSections;
    const quickNavSection: NavSection = {
      id: 'quick-access',
      label: 'Quick access',
      area: navSections[0]?.area ?? 'client',
      groups: [
        {
          id: 'quick-access-group',
          label: 'Quick actions',
          icon: 'dashboard',
          items: quickActions.map((action) => ({
            id: action.id,
            href: action.href,
            label: action.label,
            icon: quickActionIcon(action.icon),
          })),
        },
      ],
    };

    return [quickNavSection, ...navSections];
  }, [navSections, quickActions]);

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">

      <div className={cn('nav-scroll flex-1 overflow-y-auto px-space-sm pb-space-lg', collapsed && 'px-space-2xs')}> 
        <div className="space-y-space-sm">
          {computedNavSections.map((section) => (
            <div key={section.id} className={cn('space-y-space-2xs rounded-[var(--md-sys-shape-corner-small)]', !collapsed && 'bg-surface-container-low p-space-2xs shadow-level-1')}>
              <div className={cn('flex items-center gap-space-xs px-space-sm pt-space-2xs text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant', collapsed && 'justify-center px-space-3xs text-[11px]')}>
                <span className={cn('truncate', collapsed && 'sr-only')}>{section.label}</span>
              </div>
              <div className="space-y-space-2xs">
                {section.groups.map((group) => (
                  <div key={group.id} className="space-y-space-3xs">
                    <div className={cn('flex items-center gap-space-xs px-space-sm pt-space-2xs text-label-sm font-medium text-on-surface-variant', collapsed && 'sr-only')}>
                      {group.icon ? (
                        <Icon icon={resolveAppIcon(group.icon)} size="sm" className="text-on-surface/70" />
                      ) : null}
                      <span className="truncate">{group.label}</span>
                    </div>
                    <div className="flex flex-col gap-space-2xs">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          link={item}
                          pathname={pathname}
                          onNavigate={onNavigate}
                          collapsed={collapsed}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showGlobalNav && globalNavItems.length ? (
        <div className="border-t border-outline/12 px-space-sm py-space-sm">
          <p className="px-space-sm pb-space-2xs text-label-sm font-medium text-on-surface-variant">Quick links</p>
          <div className="flex flex-col gap-space-3xs">
            {globalNavItems.map((item) => (
              <NavLink
                key={item.id}
                link={primaryNavToNavItem(item)}
                pathname={pathname}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type NavLinkProps = {
  link: Pick<PortalNavItem, 'href' | 'icon' | 'label' | 'match' | 'exact'>;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
};

function NavLink({ link, pathname, onNavigate, collapsed = false }: NavLinkProps) {
  const active = isLinkActive(link, pathname);
  const content = (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? link.label : undefined}
      onClick={onNavigate}
      className={cn(
        'group flex h-10 items-center gap-space-sm rounded-[var(--md-sys-shape-corner-extra-small)] text-label-md font-semibold transition-colors motion-duration-short motion-ease-standard state-layer-color-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        collapsed ? 'justify-center px-space-sm' : 'px-space-md',
        active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant hover:bg-surface-container',
      )}
    >
      <span className={cn('truncate', collapsed && 'sr-only')}>{link.label}</span>
    </Link>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="text-label-sm">
        {link.label}
      </TooltipContent>
    </Tooltip>
  );
}

function isLinkActive(link: Pick<PortalNavItem, 'href' | 'match' | 'exact'>, pathname: string): boolean {
  const matchPrefixes = link.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if ('exact' in link && link.exact) {
    return pathname === link.href;
  }

  if (pathname === link.href) return true;
  return pathname.startsWith(`${link.href}/`);
}

function primaryNavToNavItem(item: PrimaryNavItem): Pick<PortalNavItem, 'href' | 'icon' | 'label' | 'match'> {
  return {
    href: item.href,
    icon: item.icon,
    label: item.label,
    match: item.match,
  };
}
