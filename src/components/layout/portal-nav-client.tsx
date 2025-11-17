'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PortalLink } from '@/lib/portal-access';
import { cn } from '@/lib/utils';

type PortalNavClientProps = {
  links: PortalLink[];
};

export function PortalNavClient({ links }: PortalNavClientProps) {
  const pathname = usePathname();

  if (links.length === 0) {
    return null;
  }

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
            {links.map((link) => (
              <PortalNavLink key={link.href} link={link} pathname={pathname} />
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
  link: PortalLink;
  pathname: string;
};

function PortalNavLink({ link, pathname }: PortalNavLinkProps) {
  const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <Link
      href={link.href}
      className={cn(
        'flex-shrink-0 whitespace-nowrap rounded-full px-space-md py-space-2xs text-label-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container',
        active
          ? 'bg-primary text-on-primary shadow-level-1'
          : 'text-on-surface/80 state-layer-color-primary hover:state-layer-hover hover:text-primary',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {link.label}
    </Link>
  );
}
