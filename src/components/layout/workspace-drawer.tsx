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
  globalItems: PrimaryNavItem[];
  className?: string;
};

export function WorkspaceDrawerDesktop({ workspaceNav, globalItems, className }: WorkspaceDrawerProps) {
  const pathname = usePathname() ?? '/';
  const hasNav = Boolean(workspaceNav?.groups.length) || globalItems.length > 0;

  if (!hasNav) return null;

  return (
    <nav
      aria-label="Workspace navigation"
      className={cn(
        'sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-outline/12 bg-surface-container-lowest text-on-surface shadow-level-1 lg:flex',
        className,
      )}
    >
      <DrawerContent workspaceNav={workspaceNav} globalItems={globalItems} pathname={pathname} />
    </nav>
  );
}

export function WorkspaceDrawerMobile({ workspaceNav, globalItems }: WorkspaceDrawerProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const hasNav = Boolean(workspaceNav?.groups.length) || globalItems.length > 0;

  if (!hasNav) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full border border-outline/16 bg-surface-container-low text-on-surface shadow-level-1 hover:bg-surface-container"
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
          <p className="text-body-sm text-muted-foreground">Switch sections and global tools.</p>
        </SheetHeader>
        <ScrollArea className="h-full px-space-lg pb-space-lg">
          <DrawerContent
            workspaceNav={workspaceNav}
            globalItems={globalItems}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type DrawerContentProps = {
  workspaceNav: WorkspaceNav | null;
  globalItems: PrimaryNavItem[];
  pathname: string;
  onNavigate?: () => void;
};

function DrawerContent({ workspaceNav, globalItems, pathname, onNavigate }: DrawerContentProps) {
  const groups = workspaceNav?.groups ?? [];
  const headerLabel = workspaceNav?.label ?? 'Workspace';

  return (
    <div className="flex h-full flex-col">
      <div className="px-space-lg pt-space-lg pb-space-sm">
        <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">
          {headerLabel}
        </p>
        <p className="text-title-lg font-semibold text-on-surface">Navigation</p>
      </div>
      <div className="flex-1 overflow-y-auto px-space-sm pb-space-sm">
        <div className="space-y-space-sm">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl bg-surface-container-low px-space-sm py-space-xs shadow-level-1"
            >
              <div className="flex items-center gap-space-xs pb-space-2xs text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">
                {group.icon ? <Icon icon={resolveAppIcon(group.icon)} size="sm" className="text-on-surface/80" /> : null}
                <span>{group.label}</span>
              </div>
              <div className="space-y-space-2xs">
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
      <div className="mt-auto border-t border-outline/12 px-space-md py-space-sm">
        <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">
          Global
        </p>
        <div className="mt-space-2xs flex flex-col gap-space-2xs pb-space-sm">
          {globalItems.map((item) => (
            <DrawerGlobalLink
              key={item.id}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type DrawerLinkProps = {
  link: PortalLink;
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
        'group flex items-center gap-space-sm rounded-2xl px-space-sm py-space-2xs text-body-md font-medium transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'bg-secondary-container text-on-secondary-container shadow-level-1'
          : 'text-on-surface hover:bg-surface-container state-layer-color-primary',
      )}
    >
      {link.icon ? (
        <Icon
          icon={resolveAppIcon(link.icon)}
          size="sm"
          className={cn(
            'text-inherit transition-colors',
            active ? 'text-on-secondary-container' : 'text-on-surface/70',
          )}
        />
      ) : null}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

type DrawerGlobalLinkProps = {
  item: PrimaryNavItem;
  pathname: string;
  onNavigate?: () => void;
};

function DrawerGlobalLink({ item, pathname, onNavigate }: DrawerGlobalLinkProps) {
  const active = isLinkActive(item, pathname);

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'flex items-center justify-between gap-space-sm rounded-2xl px-space-sm py-space-2xs text-body-md font-medium transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        active
          ? 'bg-secondary-container text-on-secondary-container shadow-level-1'
          : 'text-on-surface hover:bg-surface-container state-layer-color-secondary',
      )}
    >
      <div className="flex items-center gap-space-sm">
        <Icon
          icon={resolveAppIcon(item.icon)}
          size="sm"
          className={cn('text-inherit', active ? 'text-on-secondary-container' : 'text-on-surface/70')}
        />
        <span className="truncate">{item.label}</span>
      </div>
      {item.description ? (
        <span className={cn('text-label-sm', active ? 'text-on-secondary-container/80' : 'text-muted-foreground')}>
          {item.description}
        </span>
      ) : null}
    </Link>
  );
}

function isLinkActive(
  link: Pick<PortalLink, 'href' | 'match' | 'exact'> | PrimaryNavItem,
  pathname: string,
): boolean {
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
