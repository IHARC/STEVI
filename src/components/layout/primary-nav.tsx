'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveAppIcon } from '@/lib/app-icons';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { NavPill } from '@/components/ui/nav-pill';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function isActive(item: PrimaryNavItem, pathname: string): boolean {
  const matchPrefixes = item.match ?? [];
  if (matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.href}/`);
}

export function PrimaryNavRail({ items }: { items: PrimaryNavItem[] }) {
  const pathname = usePathname() ?? '/';
  if (!items.length) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-outline/10 bg-surface-container-lowest text-on-surface shadow-level-1 lg:flex"
    >
      <div className="px-space-lg pt-space-lg pb-space-md">
        <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">STEVI</p>
        <p className="text-title-lg font-semibold text-on-surface">IHARC portal</p>
      </div>
      <div className="flex-1 space-y-space-2xs px-space-sm pb-space-lg">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-space-sm rounded-2xl px-space-md py-space-sm text-label-lg font-semibold transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                active
                  ? 'bg-primary text-on-primary shadow-level-2'
                  : 'bg-surface text-on-surface/85 hover:bg-surface-container-high',
              )}
            >
              <Icon
                icon={resolveAppIcon(item.icon)}
                size="sm"
                className={cn('transition-colors', active ? 'text-on-primary' : 'text-on-surface/70')}
              />
              <div className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.description ? (
                  <span
                    className={cn(
                      'block truncate text-label-sm',
                      active ? 'text-on-primary/90' : 'text-on-surface/65',
                    )}
                  >
                    {item.description}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PrimaryNavBar({
  items,
  className,
}: {
  items: PrimaryNavItem[];
  className?: string;
}) {
  const pathname = usePathname() ?? '/';
  if (!items.length) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className={cn(
        'hidden border-b border-outline/12 bg-surface text-on-surface shadow-level-1 md:block lg:hidden',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-page gap-space-sm overflow-x-auto px-space-md py-space-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <NavPill asChild key={item.id} active={active} tone="primary" size="lg">
              <Link href={item.href} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            </NavPill>
          );
        })}
      </div>
    </nav>
  );
}

export function PrimaryNavMobile({
  items,
  label = 'Menu',
}: {
  items: PrimaryNavItem[];
  label?: string;
}) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const ordered = useMemo(() => items, [items]);

  if (!ordered.length) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full border border-outline/16 bg-surface-container-low text-on-surface shadow-level-1 hover:bg-surface-container"
          aria-label="Open primary navigation"
        >
          <Icon icon={Menu} size="sm" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] max-w-[85vw] p-space-md">
        <SheetHeader className="pb-space-xs">
          <SheetTitle className="text-title-lg">{label}</SheetTitle>
          <p className="text-body-sm text-muted-foreground">Jump to any STEVI area.</p>
        </SheetHeader>
        <div className="mt-space-md space-y-space-2xs">
          {ordered.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-space-sm rounded-2xl px-space-sm py-space-sm text-label-lg font-semibold transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  active
                    ? 'bg-primary text-on-primary shadow-level-2'
                    : 'bg-surface-container text-on-surface/85 hover:bg-surface-container-high',
                )}
              >
                <Icon
                  icon={resolveAppIcon(item.icon)}
                  size="sm"
                  className={cn('transition-colors', active ? 'text-on-primary' : 'text-on-surface/70')}
                />
                <div className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  {item.description ? (
                    <span className="block truncate text-label-sm text-on-surface/65">
                      {item.description}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
