"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type PageTab = {
  label: string;
  href: string;
  match?: string[];
};

function isActive(pathname: string, tab: PageTab) {
  const prefixes = tab.match ?? [];
  if (prefixes.length > 0) {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export function PageTabNav({ tabs, className, activeHref }: { tabs: PageTab[]; className?: string; activeHref?: string }) {
  const pathname = usePathname() ?? '/';

  return (
    <div className={cn('w-full overflow-x-auto pb-1 sm:pb-0', className)}>
      <div
        className={cn(
          'inline-flex min-w-full flex-nowrap gap-1 rounded-2xl bg-muted p-1 shadow-sm sm:min-w-0 sm:flex-wrap',
        )}
        role="tablist"
        aria-label="Section navigation"
        aria-orientation="horizontal"
      >
        {tabs.map((tab) => {
          const active = activeHref ? activeHref === tab.href : isActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative inline-flex items-center gap-1 rounded-xl px-4 py-1 text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active
                  ? 'bg-secondary/15 text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-card',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
