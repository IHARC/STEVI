'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { WorkspaceNav, PortalLink } from '@/lib/portal-access';

type AdminNavProps = {
  nav: WorkspaceNav;
  variant?: 'desktop' | 'mobile';
};

export function AdminNav({ nav, variant = 'desktop' }: AdminNavProps) {
  if (variant === 'mobile') {
    return <MobileAdminNav nav={nav} />;
  }

  return <DesktopAdminNav nav={nav} />;
}

function DesktopAdminNav({ nav }: { nav: WorkspaceNav }) {
  const pathname = usePathname();

  return (
    <nav aria-label={`${nav.label} sections`} className="h-full space-y-space-sm">
      {nav.groups.map((group) => (
        <section key={group.id} className="space-y-space-2xs">
          <div className="flex items-center gap-space-xs px-space-sm text-label-sm font-semibold uppercase text-muted-foreground">
            <Icon icon={group.icon} size="xs" />
            <span>{group.label}</span>
          </div>
          <div className="space-y-[2px]">
            {group.links.map((link) => (
              <AdminNavLink key={link.href} link={link} pathname={pathname} />
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

function MobileAdminNav({ nav }: { nav: WorkspaceNav }) {
  const pathname = usePathname();
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
          <div className="space-y-space-sm">
            {nav.groups.map((group) => (
              <section key={group.id} className="space-y-space-2xs">
                <div className="flex items-center gap-space-xs px-space-xs text-label-sm font-semibold uppercase text-muted-foreground">
                  <Icon icon={group.icon} size="xs" />
                  <span>{group.label}</span>
                </div>
                <div className="space-y-[2px]">
                  {group.links.map((link) => (
                    <AdminNavLink
                      key={link.href}
                      link={link}
                      pathname={pathname}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ))}
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
      {link.icon ? <Icon icon={link.icon} size="sm" className="text-inherit" /> : null}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

