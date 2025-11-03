'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const DEFAULT_NEXT = '/home';

type AuthLinksProps = {
  layout?: 'inline' | 'stacked';
};

export function AuthLinks({ layout = 'inline' }: AuthLinksProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextParam = useMemo(() => {
    const searchString = searchParams.toString();
    const path = pathname ? `${pathname}${searchString ? `?${searchString}` : ''}` : DEFAULT_NEXT;

    if (!path.startsWith('/')) {
      return DEFAULT_NEXT;
    }

    return path || DEFAULT_NEXT;
  }, [pathname, searchParams]);

  const encodedNext = encodeURIComponent(nextParam);
  const isStacked = layout === 'stacked';

  return (
    <div
      className={cn(
        'text-sm font-semibold text-on-surface/80',
        isStacked ? 'flex flex-col gap-2' : 'flex items-center gap-2'
      )}
    >
      <Link
        href={`/login?next=${encodedNext}`}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-outline/40 bg-surface text-on-surface/80 transition hover:bg-brand-soft hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          isStacked ? 'w-full px-4 py-2' : 'px-3 py-1'
        )}
      >
        Sign in
      </Link>
      <Link
        href={`/register?next=${encodedNext}`}
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-primary text-on-primary shadow transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          isStacked ? 'w-full px-4 py-2' : 'px-3 py-1'
        )}
      >
        Sign up
      </Link>
    </div>
  );
}
