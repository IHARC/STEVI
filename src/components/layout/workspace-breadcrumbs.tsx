'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { WorkspaceNav } from '@/lib/portal-access';

type WorkspaceBreadcrumbsProps = {
  nav: WorkspaceNav;
};

export function WorkspaceBreadcrumbs({ nav }: WorkspaceBreadcrumbsProps) {
  const pathname = usePathname();

  const match = nav.groups
    .flatMap((group) => group.links.map((link) => ({ group: group.label, link })))
    .find(({ link }) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  const trail = [
    { label: nav.label, href: `/${nav.id}` },
    match?.group ? { label: match.group } : null,
    match?.link ? { label: match.link.label } : null,
  ].filter(Boolean) as { label: string; href?: string }[];

  if (trail.length === 0) {
    return null;
  }

  return (
    <nav aria-label={`${nav.label} breadcrumbs`} className="text-label-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-space-2xs rounded-2xl border border-outline/12 bg-surface-container-high px-space-sm py-space-2xs shadow-sm">
        {trail.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-space-2xs">
            {item.href ? (
              <Link
                href={item.href}
                className="rounded-lg px-space-2xs py-space-3xs text-on-surface transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span className="rounded-lg bg-surface-container px-space-2xs py-space-3xs text-on-surface">{item.label}</span>
            )}
            {index < trail.length - 1 ? <span aria-hidden className="text-outline">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
