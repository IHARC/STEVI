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
    <div className={cn('w-full overflow-x-auto pb-space-2xs sm:pb-0', className)}>
      <div
        className={cn(
          'inline-flex min-w-full flex-nowrap gap-space-2xs rounded-[var(--md-sys-shape-corner-large)] bg-surface-container-low p-space-2xs shadow-level-1 sm:min-w-0 sm:flex-wrap',
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
                'relative inline-flex items-center gap-space-2xs rounded-[var(--md-sys-shape-corner-medium)] px-space-md py-space-2xs text-label-md font-semibold transition-colors motion-duration-short motion-ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                active
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container',
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
