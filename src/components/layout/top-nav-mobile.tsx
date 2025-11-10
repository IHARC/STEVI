'use client';

import type { ReactNode } from 'react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { getPublicPortalLinks } from '@/lib/portal-access';
import { cn } from '@/lib/utils';
import type { TopNavDropdownItem } from '@/components/layout/top-nav-dropdown';

type MarketingLink = {
  type: 'link';
  href: string;
  label: string;
};

type MarketingMenu = {
  type: 'menu';
  label: string;
  items: TopNavDropdownItem[];
};

export type MarketingNavItem = MarketingLink | MarketingMenu;

type TopNavMobileProps = {
  links: MarketingNavItem[];
  accountSection: ReactNode;
  quickAction?: ReactNode;
};

export function TopNavMobile({ links, accountSection, quickAction }: TopNavMobileProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const onPortalRoute = pathname.startsWith('/portal');
  const portalNavLinks = useMemo(() => getPublicPortalLinks(), []);

  type MobileMenuItem = {
    type: 'menu';
    label: string;
    isActive: boolean;
    items: Array<TopNavDropdownItem & { isActive: boolean }>;
  };

  type MobileLinkItem = {
    type: 'link';
    href: string;
    label: string;
    isActive: boolean;
  };

  type MobileNavItem = MobileLinkItem | MobileMenuItem;

  const navSections = useMemo(
    () => [
      {
        id: 'marketing',
        title: 'Explore IHARC',
        items: links.map<MobileNavItem>((link) => {
          if (link.type === 'link') {
            const isHome = link.href === '/';
            const isActive = isHome ? pathname === '/' : pathname.startsWith(link.href);

            return {
              ...link,
              isActive,
            };
          }

          const mappedItems = link.items.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return {
              ...item,
              isActive,
            };
          });

          return {
            type: 'menu',
            label: link.label,
            items: mappedItems,
            isActive: mappedItems.some((item) => item.isActive),
          };
        }),
      },
      ...(onPortalRoute
        ? [
            {
              id: 'portal',
              title: 'Collaboration Portal',
              items: portalNavLinks.map((link) => {
                const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);

                return {
                  type: 'link' as const,
                  href: link.href,
                  label: link.label,
                  isActive,
                };
              }),
            },
          ]
        : []),
    ],
    [links, onPortalRoute, pathname, portalNavLinks]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-transparent text-on-surface hover:bg-surface-container"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full w-[min(22rem,100vw)] flex-col gap-6 border-none bg-surface px-5 py-6 text-on-surface shadow-lg"
      >
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-title-lg font-semibold tracking-tight text-on-surface">
            Navigation
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pb-8">
          <nav aria-label="Primary navigation" className="flex flex-col gap-6">
            {navSections.map((section) => (
              <div key={section.id} className="flex flex-col gap-1.5">
                <p className="text-body-md font-semibold uppercase tracking-wide text-on-surface/80">
                  {section.title}
                </p>
                {section.items.map((item) =>
                  item.type === 'link' ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center justify-between rounded-full px-4 py-3 text-body-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                        item.isActive
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'text-on-surface hover:bg-surface-container-highest'
                      )}
                      aria-current={item.isActive ? 'page' : undefined}
                    >
                      <span>{item.label}</span>
                      {item.isActive ? (
                        <span className="text-label-sm font-semibold uppercase tracking-wide text-primary">
                          Active
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <MobileNavCollapsible key={item.label} item={item} closeSheet={() => setOpen(false)} />
                  )
                )}
              </div>
            ))}
          </nav>
          {quickAction ? (
            <div
              className="flex flex-col gap-2"
              onClickCapture={(event) => {
                const target = event.target as HTMLElement | null;
                if (!target) {
                  return;
                }
                if (target.closest('a[href],button')) {
                  setOpen(false);
                }
              }}
            >
              <p className="text-body-md font-semibold uppercase tracking-wide text-on-surface/80">
                Quick action
              </p>
              {quickAction}
            </div>
          ) : null}
          <div
            className="flex flex-col gap-2"
            onClickCapture={(event) => {
              const target = event.target as HTMLElement | null;
              if (!target) {
                return;
              }
              if (target.closest('a[href],button')) {
                setOpen(false);
              }
            }}
          >
            <p className="text-body-md font-semibold uppercase tracking-wide text-on-surface/80">
              Account
            </p>
            {accountSection}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type MobileNavCollapsibleProps = {
  item: {
    label: string;
    isActive: boolean;
    items: Array<TopNavDropdownItem & { isActive: boolean }>;
  };
  closeSheet: () => void;
};

function MobileNavCollapsible({ item, closeSheet }: MobileNavCollapsibleProps) {
  const [expanded, setExpanded] = useState(item.isActive);

  useEffect(() => {
    startTransition(() => {
      setExpanded(item.isActive);
    });
  }, [item.isActive]);

  return (
    <div className={cn('rounded-2xl border border-outline/15 bg-surface-container-low shadow-sm')}>
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className={cn(
          'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-body-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          item.isActive || expanded
            ? 'bg-secondary-container text-on-secondary-container'
            : 'text-on-surface hover:bg-surface-container-high'
        )}
        aria-expanded={expanded}
        aria-controls={`mobile-menu-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span>{item.label}</span>
        <div className="flex items-center gap-2">
          {item.isActive ? (
            <span className="text-label-sm font-semibold uppercase tracking-wide text-primary">Active</span>
          ) : null}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : undefined)}
            aria-hidden
          />
        </div>
      </button>
      <div
        id={`mobile-menu-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
        className={cn('gap-1 px-2 pb-2 pt-1 transition', expanded ? 'flex flex-col' : 'hidden')}
        aria-hidden={!expanded}
      >
        {item.items.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            onClick={closeSheet}
            className={cn(
              'rounded-xl px-3 py-2 text-body-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              child.isActive
                ? 'bg-primary/15 text-primary'
                : 'text-on-surface hover:bg-surface-container-high'
            )}
            aria-current={child.isActive ? 'page' : undefined}
          >
            <span className="block font-semibold">{child.label}</span>
            {child.description ? (
              <span className="mt-0.5 block text-label-sm text-on-surface/70">{child.description}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
