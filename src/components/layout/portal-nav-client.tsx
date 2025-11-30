'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PortalLink } from '@/lib/portal-access';
import { NavPill } from '@/components/ui/nav-pill';

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
      className="border-b border-outline/12 bg-surface text-on-surface shadow-sm"
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
    <NavPill asChild active={active} className="flex-shrink-0 whitespace-nowrap" tone="primary">
      <Link href={link.href} aria-current={active ? 'page' : undefined}>
        {link.label}
      </Link>
    </NavPill>
  );
}
