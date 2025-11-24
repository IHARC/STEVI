'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { resolveAppIcon } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import type { WorkspaceNav, PortalLink, NavGroup } from '@/lib/portal-access';

type AdminNavProps = {
  nav: WorkspaceNav;
  variant?: 'desktop' | 'mobile';
};

export function AdminNav({ nav, variant = 'desktop' }: AdminNavProps) {
  const pathname = usePathname();

  const activeGroupId = useMemo(() => findActiveGroupId(nav, pathname), [nav, pathname]);

  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    getInitialOpenGroups(nav, pathname, activeGroupId),
  );

  const renderedOpenGroups = useMemo(() => {
    const validGroups = openGroups.filter((id) => nav.groups.some((group) => group.id === id));

    if (activeGroupId && !validGroups.includes(activeGroupId)) {
      return [...validGroups, activeGroupId];
    }

    return validGroups;
  }, [activeGroupId, nav.groups, openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  };

  if (variant === 'mobile') {
    return (
      <MobileAdminNav
        nav={nav}
        pathname={pathname}
        openGroups={renderedOpenGroups}
        onToggleGroup={toggleGroup}
      />
    );
  }

  return (
    <DesktopAdminNav
      nav={nav}
      pathname={pathname}
      openGroups={renderedOpenGroups}
      onToggleGroup={toggleGroup}
    />
  );
}

type NavListProps = {
  nav: WorkspaceNav;
  pathname: string;
  openGroups: string[];
  onToggleGroup: (groupId: string) => void;
  onNavigate?: () => void;
};

function NavList({ nav, pathname, openGroups, onToggleGroup, onNavigate }: NavListProps) {
  return (
    <nav aria-label={`${nav.label} sections`} className="space-y-space-2xs">
      {nav.groups.map((group) => (
        <NavGroupSection
          key={group.id}
          group={group}
          pathname={pathname}
          isOpen={openGroups.includes(group.id)}
          onToggle={() => onToggleGroup(group.id)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function DesktopAdminNav({
  nav,
  pathname,
  openGroups,
  onToggleGroup,
}: {
  nav: WorkspaceNav;
  pathname: string;
  openGroups: string[];
  onToggleGroup: (groupId: string) => void;
}) {
  return (
    <NavList
      nav={nav}
      pathname={pathname}
      openGroups={openGroups}
      onToggleGroup={onToggleGroup}
    />
  );
}

function MobileAdminNav({
  nav,
  pathname,
  openGroups,
  onToggleGroup,
}: {
  nav: WorkspaceNav;
  pathname: string;
  openGroups: string[];
  onToggleGroup: (groupId: string) => void;
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
              openGroups={openGroups}
              onToggleGroup={onToggleGroup}
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

function NavGroupSection({
  group,
  pathname,
  isOpen,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const active = group.links.some((link) => isLinkActive(pathname, link.href));

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="rounded-xl border border-outline/12 bg-surface-container-low">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-space-sm rounded-xl px-space-sm py-space-xs text-label-sm font-semibold uppercase transition-colors',
              active ? 'text-on-surface' : 'text-muted-foreground hover:text-on-surface',
            )}
            aria-expanded={isOpen}
            aria-controls={`admin-nav-${group.id}`}
          >
            <span className="flex items-center gap-space-xs">
              <Icon icon={resolveAppIcon(group.icon)} size="xs" />
              {group.label}
            </span>
            <span className="flex items-center gap-space-xs">
              <span className="rounded-full bg-surface-container-high px-2 py-[3px] text-label-xs font-semibold text-muted-foreground">
                {group.links.length}
              </span>
              <Icon
                icon={ChevronDown}
                size="sm"
                className={cn(
                  'transition-transform motion-duration-short motion-ease-standard',
                  isOpen ? 'rotate-180' : undefined,
                )}
              />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent
          id={`admin-nav-${group.id}`}
          className="space-y-[2px] px-space-xs pb-space-sm pt-space-2xs data-[state=closed]:hidden"
        >
          {group.links.map((link) => (
            <AdminNavLink
              key={link.href}
              link={link}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function getInitialOpenGroups(nav: WorkspaceNav, pathname: string, activeGroupId: string | null) {
  if (activeGroupId) return [activeGroupId];
  if (nav.groups.length > 0) return [nav.groups[0].id];
  return [];
}

function findActiveGroupId(nav: WorkspaceNav, pathname: string): string | null {
  const group = nav.groups.find((candidate) =>
    candidate.links.some((link) => isLinkActive(pathname, link.href)),
  );

  return group?.id ?? null;
}

function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
