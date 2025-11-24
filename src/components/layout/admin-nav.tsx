'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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

type NavListProps = {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
  onNavigate?: () => void;
};

function NavList({ nav, pathname, activeGroupId, onNavigate }: NavListProps) {
  const activeGroup = useMemo(() => {
    if (activeGroupId) {
      return nav.groups.find((group) => group.id === activeGroupId);
    }
    return nav.groups[0] ?? null;
  }, [activeGroupId, nav.groups]);

  if (!activeGroup) return null;

  return (
    <div className="space-y-space-sm" aria-label={`${nav.label} navigation`}>
      <ModuleSwitcher nav={nav} activeGroupId={activeGroup.id} />

      <div className="space-y-[2px]" aria-label={`${activeGroup.label} links`}>
        {activeGroup.links.map((link) => (
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

function DesktopAdminNav({
  nav,
  pathname,
  activeGroupId,
}: {
  nav: WorkspaceNav;
  pathname: string;
  activeGroupId: string | null;
}) {
  return (
    <NavList
      nav={nav}
      pathname={pathname}
      activeGroupId={activeGroupId}
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
type ModuleSwitcherProps = {
  nav: WorkspaceNav;
  activeGroupId: string;
};

function ModuleSwitcher({ nav, activeGroupId }: ModuleSwitcherProps) {
  return (
    <div className="flex flex-col gap-space-2xs" role="tablist" aria-label="Admin modules">
      {nav.groups.map((group) => {
        const isActive = group.id === activeGroupId;
        const targetHref = group.links[0]?.href ?? '/admin';

        return (
          <Button
            key={group.id}
            asChild
            size="sm"
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-between gap-space-xs rounded-lg border border-outline/10 px-space-sm py-space-xs text-label-md font-semibold uppercase shadow-none',
              isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-muted-foreground hover:text-on-surface',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Link href={targetHref}>
              <span className="flex items-center gap-space-xs">
                <Icon icon={resolveAppIcon(group.icon)} size="xs" />
                {group.label}
              </span>
              <span className="ml-space-sm rounded-full bg-surface-container-high px-2 py-[3px] text-label-xs font-semibold text-muted-foreground">
                {group.links.length}
              </span>
            </Link>
          </Button>
        );
      })}
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
