'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@shared/ui/button';

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
        'text-sm font-semibold text-foreground/80',
        isStacked ? 'flex flex-col gap-2' : 'flex items-center gap-2'
      )}
    >
      <Button
        asChild
        variant="outline"
        size={isStacked ? 'default' : 'sm'}
        className={cn(isStacked ? 'w-full' : undefined)}
      >
        <Link href={`/login?next=${encodedNext}`}>Sign in</Link>
      </Button>
      <Button
        asChild
        size={isStacked ? 'default' : 'sm'}
        className={cn(isStacked ? 'w-full' : undefined)}
      >
        <Link href={`/register?next=${encodedNext}`}>Sign up</Link>
      </Button>
    </div>
  );
}
