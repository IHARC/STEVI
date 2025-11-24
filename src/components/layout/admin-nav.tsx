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

  if (nav.groups.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div
        className={cn(
          'flex h-full flex-col rounded-2xl border border-outline/12 bg-surface-container-high shadow-md transition-[width] motion-duration-medium motion-ease-standard',
          collapsed ? 'w-[76px] px-space-2xs' : 'w-full px-space-sm',
        )}
        data-collapsed={collapsed}
        aria-label={`${nav.label} navigation`}
      >
        <div className={cn('flex items-center py-space-sm', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed ? (
            <div className="px-space-2xs text-label-sm font-semibold uppercase text-muted-foreground">
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
          <ScrollArea className="flex-1 pr-[2px]">
            <NavSections
              nav={nav}
              pathname={pathname}
              initialGroupId={initialGroupId}
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
};

function NavSections({ nav, pathname, onNavigate, initialGroupId }: NavSectionsProps) {
  if (nav.groups.length === 0) return null;

  return (
    <Accordion
      key={initialGroupId ?? 'default-group'}
      type="single"
      collapsible
      defaultValue={initialGroupId ?? undefined}
      className="space-y-space-2xs"
    >
      {nav.groups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="rounded-xl border border-outline/12 bg-surface-container p-space-2xs shadow-sm"
        >
          <AccordionTrigger className="rounded-lg px-space-sm py-space-xs text-label-sm font-semibold uppercase text-muted-foreground hover:no-underline">
            <div className="flex items-center gap-space-xs">
              <Icon icon={resolveAppIcon(group.icon)} size="sm" />
              <span>{group.label}</span>
            </div>
            <span className="rounded-full bg-surface-container-low px-2 py-[3px] text-label-xs font-semibold text-muted-foreground">
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
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

type CollapsedNavGroupsProps = {
  nav: WorkspaceNav;
  pathname: string;
};

function CollapsedNavGroups({ nav, pathname }: CollapsedNavGroupsProps) {
  return (
    <div className="flex flex-col items-center gap-space-2xs pb-space-sm">
      {nav.groups.map((group) => {
        const isActive = group.links.some((link) => isLinkActive(link, pathname));
        return (
          <Popover key={group.id}>
            <PopoverTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'h-10 w-10 rounded-lg text-muted-foreground',
                  isActive && 'bg-secondary-container text-on-secondary-container',
                )}
                aria-label={`${group.label} links`}
              >
                <Icon icon={resolveAppIcon(group.icon)} size="sm" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-64 p-space-sm">
              <div className="flex items-center gap-space-xs pb-space-xs">
                <Icon icon={resolveAppIcon(group.icon)} size="sm" />
                <div className="text-label-sm font-semibold">{group.label}</div>
                <span className="ml-auto text-label-xs text-muted-foreground">
                  {group.links.length}
                </span>
              </div>
              <div className="space-y-[2px]">
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
};

function AdminNavLink({ link, pathname, onNavigate }: AdminNavLinkProps) {
  const active = isLinkActive(link, pathname);

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-space-sm rounded-lg px-space-sm py-space-2xs text-body-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/40 shadow-level-1'
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
