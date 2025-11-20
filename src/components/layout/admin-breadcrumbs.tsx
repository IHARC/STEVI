'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { WorkspaceNav } from '@/lib/portal-access';

type AdminBreadcrumbsProps = {
  nav: WorkspaceNav;
};

export function AdminBreadcrumbs({ nav }: AdminBreadcrumbsProps) {
  const pathname = usePathname();

  const match = nav.groups
    .flatMap((group) => group.links.map((link) => ({ group: group.label, link })))
    .find(({ link }) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  const trail = [
    { label: nav.label, href: '/admin' },
    match?.group ? { label: match.group } : null,
    match?.link ? { label: match.link.label } : null,
  ].filter(Boolean) as { label: string; href?: string }[];

  if (trail.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Admin breadcrumbs" className="text-label-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-space-2xs">
        {trail.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-space-2xs">
            {item.href ? (
              <Link href={item.href} className="hover:text-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
            {index < trail.length - 1 ? <span aria-hidden>•</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

