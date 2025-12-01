'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { WorkspaceNav, PortalLink } from '@/lib/portal-access';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import { resolveAppIcon } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

type WorkspaceDrawerProps = {
  workspaceNav: WorkspaceNav | null;
  globalNavItems?: PrimaryNavItem[];
  className?: string;
};

export function WorkspaceDrawerDesktop({ workspaceNav, globalNavItems = [], className }: WorkspaceDrawerProps) {
  const pathname = usePathname() ?? '/';
  const hasNav = Boolean(workspaceNav?.groups.length);

  if (!hasNav) return null;

  return (
    <nav
      aria-label="Workspace navigation"
      className={cn(
        'sticky top-0 hidden h-screen w-64 shrink-0 border-r border-outline/12 bg-surface-container-lowest text-on-surface shadow-level-1 lg:flex',
        className,
      )}
    >
      <DrawerContent
        workspaceNav={workspaceNav}
        pathname={pathname}
        globalNavItems={globalNavItems}
      />
    </nav>
  );
}

export function WorkspaceDrawerMobile({ workspaceNav, globalNavItems = [] }: WorkspaceDrawerProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const hasNav = Boolean(workspaceNav?.groups.length);

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
          <SheetTitle className="text-title-lg">
            {workspaceNav?.label ?? 'Navigation'}
          </SheetTitle>
          <p className="text-body-sm text-muted-foreground">Browse workspace sections.</p>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <ScrollArea className="flex-1">
            <DrawerContent
              workspaceNav={workspaceNav}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              showHeader={false}
            />
          </ScrollArea>
          {globalNavItems.length ? (
            <div className="border-t border-outline/12 px-space-sm py-space-sm">
              <p className="px-space-sm pb-space-2xs text-label-sm font-medium text-on-surface-variant">Workspace</p>
              <div className="flex flex-col gap-space-3xs">
                {globalNavItems.map((item) => (
                  <DrawerLink
                    key={item.id}
                    link={primaryNavToDrawerLink(item)}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type DrawerContentProps = {
  workspaceNav: WorkspaceNav | null;
  pathname: string;
  onNavigate?: () => void;
  globalNavItems?: PrimaryNavItem[];
  showHeader?: boolean;
};

function DrawerContent({
  workspaceNav,
  pathname,
  onNavigate,
  globalNavItems = [],
  showHeader = true,
}: DrawerContentProps) {
  const groups = workspaceNav?.groups ?? [];
  const headerLabel = workspaceNav?.label ?? 'Workspace';

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      {showHeader ? (
        <div className="px-space-lg pt-space-lg pb-space-xs">
          <p className="text-label-sm font-medium text-on-surface-variant">
            {headerLabel}
          </p>
          <p className="text-title-sm font-semibold text-on-surface">Navigation</p>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto px-space-sm pb-space-lg">
        <div className="space-y-space-md">
          {groups.map((group) => (
            <div key={group.id} className="space-y-space-2xs">
              <div className="flex items-center gap-space-xs px-space-sm pt-space-sm text-label-sm font-medium text-on-surface-variant">
                {group.icon ? <Icon icon={resolveAppIcon(group.icon)} size="sm" className="text-on-surface/70" /> : null}
                <span className="truncate">{group.label}</span>
              </div>
              <div className="flex flex-col gap-space-3xs">
                {group.items.map((link) => (
                  <DrawerLink
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {globalNavItems.length ? (
        <div className="border-t border-outline/12 px-space-sm py-space-sm">
          <p className="px-space-sm pb-space-2xs text-label-sm font-medium text-on-surface-variant">Workspace</p>
          <div className="flex flex-col gap-space-3xs">
            {globalNavItems.map((item) => (
              <DrawerLink
                key={item.id}
                link={primaryNavToDrawerLink(item)}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type DrawerLinkProps = {
  link: DrawerLinkData;
  pathname: string;
  onNavigate?: () => void;
};

function DrawerLink({ link, pathname, onNavigate }: DrawerLinkProps) {
  const active = isLinkActive(link, pathname);

  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'group flex h-10 items-center gap-space-sm rounded-[var(--md-sys-shape-corner-extra-small)] px-space-md text-label-md font-semibold transition-colors motion-duration-short motion-ease-standard state-layer-color-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant hover:bg-surface-container',
      )}
    >
      {link.icon ? (
        <Icon
          icon={resolveAppIcon(link.icon)}
          size="sm"
          className={cn(
            'text-inherit transition-colors',
            active ? 'text-on-secondary-container' : 'text-on-surface-variant',
          )}
        />
      ) : null}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

function isLinkActive(link: Pick<DrawerLinkData, 'href' | 'match' | 'exact'>, pathname: string): boolean {
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

type DrawerLinkData = Pick<PortalLink, 'href' | 'icon' | 'label' | 'match' | 'exact'>;

function primaryNavToDrawerLink(item: PrimaryNavItem): DrawerLinkData {
  return {
    href: item.href,
    icon: item.icon,
    label: item.label,
    match: item.match,
  };
}
