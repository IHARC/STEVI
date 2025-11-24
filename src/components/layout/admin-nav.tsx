'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [collapsed, setCollapsed] = useState(false);

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
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((prev) => !prev)}
    />
  );
}

type NavListProps = {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
  onNavigate?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function NavList({ nav, pathname, activeGroupId, onNavigate, collapsed, onToggleCollapse }: NavListProps) {
  const activeGroup = useMemo(() => {
    if (activeGroupId) {
      return nav.groups.find((group) => group.id === activeGroupId);
    }
    return nav.groups[0] ?? null;
  }, [activeGroupId, nav.groups]);

  if (!activeGroup) return null;

  return (
    <div className="space-y-space-sm" aria-label={`${nav.label} navigation`} data-collapsed={collapsed}>
      <div className="flex items-center justify-between rounded-xl border border-outline/12 bg-surface-container-high px-space-sm py-space-xs shadow-sm">
        <span className="text-label-sm font-semibold uppercase text-muted-foreground">Modules</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-on-surface"
          onClick={onToggleCollapse}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <Icon icon={collapsed ? ChevronRight : ChevronLeft} size="sm" />
        </Button>
      </div>

      <TooltipProvider delayDuration={150} skipDelayDuration={0}>
        <ModuleRail nav={nav} activeGroupId={activeGroup.id} collapsed={collapsed} />
      </TooltipProvider>

      {collapsed ? null : (
        <SubNavPanel group={activeGroup} pathname={pathname} onNavigate={onNavigate} />
      )}
    </div>
  );
}

function DesktopAdminNav({
  nav,
  pathname,
  activeGroupId,
  collapsed,
  onToggleCollapse,
}: {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <NavList
      nav={nav}
      pathname={pathname}
      activeGroupId={activeGroupId}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    />
  );
}

function MobileAdminNav({
  nav,
  pathname,
  activeGroupId,
}: {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
}) {
  const [open, setOpen] = useState(false);

  const activeLabel = useMemo(() => {
    const match = nav.groups.flatMap((group) => group.links).find((link) => pathname.startsWith(link.href));
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
      <SheetContent side="left" className="w-[320px] p-0">
        <SheetHeader className="px-space-md pt-space-md pb-space-sm text-left">
          <SheetTitle className="text-title-md">{nav.label}</SheetTitle>
          <p className="text-body-sm text-muted-foreground">Choose a workspace section.</p>
        </SheetHeader>
        <ScrollArea className="h-full px-space-md pb-space-md">
          <div className="space-y-space-xs">
            <NavList
              nav={nav}
              pathname={pathname}
              activeGroupId={activeGroupId}
              onNavigate={() => setOpen(false)}
              collapsed={false}
              onToggleCollapse={() => {}}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type AdminNavLinkProps = {
  link: PortalLink;
  pathname: string;
  onNavigate?: () => void;
};

function AdminNavLink({ link, pathname, onNavigate }: AdminNavLinkProps) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-space-sm rounded-lg border border-transparent px-space-sm py-space-2xs text-body-md font-medium transition',
        'state-layer-color-primary hover:state-layer-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'border-primary/40 bg-primary/10 text-primary shadow-level-1'
          : 'text-on-surface/80 hover:bg-surface-container',
      )}
      onClick={onNavigate}
    >
      {link.icon ? (
        <Icon icon={resolveAppIcon(link.icon)} size="sm" className="text-inherit" />
      ) : null}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}
type ModuleRailProps = {
  nav: WorkspaceNav;
  activeGroupId: string;
  collapsed: boolean;
};

function ModuleRail({ nav, activeGroupId, collapsed }: ModuleRailProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-outline/12 bg-surface-container-high p-space-2xs shadow-md transition-all motion-duration-medium motion-ease-standard',
        collapsed ? 'w-14' : 'w-full',
      )}
      role="tablist"
      aria-label="Admin modules"
    >
      {nav.groups.map((group) => {
        const isActive = group.id === activeGroupId;
        const targetHref = group.links[0]?.href ?? '/admin';

        const linkClasses = collapsed
          ? 'relative flex h-10 w-10 items-center justify-center rounded-lg text-label-sm font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
          : 'relative flex w-full items-center justify-between gap-space-xs rounded-lg px-space-sm py-space-xs text-label-sm font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

        const buttonContent = (
          <Link
            href={targetHref}
            className={cn(
              linkClasses,
              isActive
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-muted-foreground hover:bg-surface-container hover:text-on-surface',
            )}
          >
            <span className="flex items-center gap-space-xs">
              <Icon icon={resolveAppIcon(group.icon)} size="sm" />
              {collapsed ? null : group.label}
            </span>
            {collapsed ? null : (
              <span className="rounded-full bg-surface-container-low px-2 py-[3px] text-label-xs font-semibold text-muted-foreground">
                {group.links.length}
              </span>
            )}
            {isActive ? (
              <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" aria-hidden />
            ) : null}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={group.id} delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="icon"
                  className={cn(
                    'mb-[2px] h-10 w-10 justify-center rounded-lg p-0 text-label-sm font-semibold uppercase shadow-none last:mb-0',
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-muted-foreground hover:text-on-surface',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {buttonContent}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-label-sm">
                <div className="flex items-center gap-space-xs">
                  <Icon icon={resolveAppIcon(group.icon)} size="sm" />
                  <span>{group.label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Button
            key={group.id}
            asChild
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'mb-[4px] w-full justify-between rounded-lg px-0 py-0 text-label-sm font-semibold uppercase shadow-none last:mb-0 border border-transparent',
              isActive ? 'border-primary/50' : 'hover:border-outline/30',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {buttonContent}
          </Button>
        );
      })}
    </div>
  );
}

type SubNavPanelProps = {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
};

function SubNavPanel({ group, pathname, onNavigate }: SubNavPanelProps) {
  return (
    <div className="space-y-space-2xs rounded-xl border border-outline/12 bg-surface-container p-space-sm" aria-label={`${group.label} links`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs text-label-sm font-semibold uppercase text-muted-foreground">
          <Icon icon={resolveAppIcon(group.icon)} size="xs" />
          <span>{group.label}</span>
        </div>
        <span className="text-label-xs text-muted-foreground">{group.links.length} links</span>
      </div>

      <div className="space-y-[2px]">
        {group.links.map((link) => (
          <AdminNavLink
            key={link.href}
            link={link}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function findActiveGroup(nav: WorkspaceNav, pathname: string): NavGroup | null {
  const directMatch = nav.groups.find((candidate) =>
    candidate.links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`)),
  );

  if (directMatch) return directMatch;

  return nav.groups[0] ?? null;
}
