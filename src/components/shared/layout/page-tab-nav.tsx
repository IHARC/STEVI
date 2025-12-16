"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PageTab = {
  label: string;
  href: string;
  match?: string[];
};

type PageTabNavVariant = 'primary' | 'secondary';

function isActive(pathname: string, tab: PageTab) {
  const prefixes = tab.match ?? [];
  if (prefixes.length > 0) {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export function PageTabNav({
  tabs,
  className,
  activeHref,
  variant = 'primary',
  actions,
  actionsClassName,
}: {
  tabs: PageTab[];
  className?: string;
  activeHref?: string;
  variant?: PageTabNavVariant;
  actions?: ReactNode;
  actionsClassName?: string;
}) {
  const pathname = usePathname() ?? '/';

  return (
    <nav
      aria-label="Section navigation"
      className={cn(
        'w-full',
        variant === 'primary' ? 'pb-1 sm:pb-0' : 'border-b border-border/60 pb-1',
        className,
      )}
    >
      <div
        className={cn(
          variant === 'primary'
            ? 'flex w-full flex-wrap items-center gap-1 rounded-2xl bg-muted p-1 shadow-sm'
            : 'flex w-full flex-wrap gap-2 bg-transparent p-0',
        )}
      >
        <div className={cn('flex flex-1 flex-wrap', variant === 'primary' ? 'gap-1' : 'gap-2')}>
          {tabs.map((tab) => {
            const active = activeHref ? activeHref === tab.href : isActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  variant === 'primary'
                    ? 'relative inline-flex items-center gap-1 rounded-xl px-4 py-1 text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    : 'relative inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  variant === 'primary'
                    ? active
                      ? 'bg-secondary/15 text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-card'
                    : active
                      ? 'text-foreground after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-primary'
                      : 'hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {actions ? (
          <div className={cn('ml-auto flex flex-wrap items-center gap-2', actionsClassName)}>
            {actions}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
