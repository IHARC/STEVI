'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { PortalLink } from '@/lib/portal-access';
import { NavPill } from '@/components/ui/nav-pill';

type PortalNavClientProps = {
  links: PortalLink[];
  variant?: 'bar' | 'rail';
  className?: string;
};

export function PortalNavClient({ links, variant = 'bar', className }: PortalNavClientProps) {
  const pathname = usePathname();

  if (links.length === 0) return null;

  if (variant === 'rail') {
    return (
      <aside className={cn('hidden lg:block', className)} aria-label="Portal navigation">
        <div className="sticky top-24 rounded-3xl border border-outline/14 bg-surface-container p-space-sm shadow-level-1">
          <div className="space-y-space-2xs">
            {links.map((link) => (
              <PortalNavLink key={link.href} link={link} pathname={pathname} variant="rail" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <nav
      aria-label="Portal navigation"
      className={cn(
        'border-b border-outline/12 bg-surface-container-high/95 text-on-surface shadow-level-1 backdrop-blur-lg supports-[backdrop-filter]:bg-surface-container-high/85',
        className,
      )}
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
  variant?: 'bar' | 'rail';
};

function PortalNavLink({ link, pathname, variant = 'bar' }: PortalNavLinkProps) {
  const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);

  if (variant === 'rail') {
    return (
      <NavPill
        asChild
        active={active}
        tone="primary"
        className="flex w-full items-center justify-between gap-space-sm text-left"
      >
        <Link href={link.href} aria-current={active ? 'page' : undefined}>
          {link.label}
        </Link>
      </NavPill>
    );
  }

  return (
    <NavPill asChild active={active} className="flex-shrink-0 whitespace-nowrap" tone="primary">
      <Link href={link.href} aria-current={active ? 'page' : undefined}>
        {link.label}
      </Link>
    </NavPill>
  );
}
