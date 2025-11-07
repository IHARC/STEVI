'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TopNavLinkProps = {
  href: string;
  children: ReactNode;
};

export function TopNavLink({ href, children }: TopNavLinkProps) {
  const pathname = usePathname();
  const isHomeLink = href === '/';
  const isActive = isHomeLink ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'rounded-full px-2.5 py-1.5 text-body-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        isActive ? 'bg-brand-soft text-brand' : 'text-on-surface/80 hover:bg-brand-soft hover:text-brand'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
