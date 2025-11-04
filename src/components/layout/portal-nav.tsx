'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PortalLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const portalLinks: PortalLink[] = [
  { href: '/home', label: 'Home', exact: true },
  { href: '/appointments', label: 'Appointments' },
  { href: '/documents', label: 'Documents' },
  { href: '/profile', label: 'Profile' },
  { href: '/support', label: 'Support' },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Portal navigation"
      className="border-b border-outline/10 bg-surface-container text-on-surface"
    >
      <div className="mx-auto w-full max-w-page px-space-md">
        <div className="relative -mx-space-md">
          <div
            className="flex items-center gap-space-sm overflow-x-auto px-space-md py-space-sm [-ms-overflow-style:'none'] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:px-0"
            role="list"
          >
            {portalLinks.map((link) => (
              <PortalNavLink key={link.href} href={link.href} exact={link.exact} pathname={pathname}>
                {link.label}
              </PortalNavLink>
            ))}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface-container to-transparent sm:hidden"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface-container to-transparent sm:hidden"
            aria-hidden
          />
        </div>
      </div>
    </nav>
  );
}

type PortalNavLinkProps = {
  href: string;
  exact?: boolean;
  pathname: string;
  children: ReactNode;
};

function PortalNavLink({ href, children, exact, pathname }: PortalNavLinkProps) {
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex-shrink-0 whitespace-nowrap rounded-full px-space-md py-space-2xs text-label-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container',
        active
          ? 'bg-primary text-on-primary shadow-level-1'
          : 'text-on-surface/80 hover:bg-primary/10 hover:text-primary'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
