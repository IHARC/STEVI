'use client';

import { usePathname } from 'next/navigation';
import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';

export function AdminTabs() {
  const tabs: PageTab[] = [
    { label: 'General settings', href: '/ops/admin', match: ['/ops/admin'] },
    { label: 'Content', href: '/ops/admin/content' },
    { label: 'Organizations', href: '/ops/admin/organizations', match: ['/ops/admin/organizations'] },
    { label: 'Users', href: '/ops/admin/users/all', match: ['/ops/admin/users'] },
    { label: 'Inventory', href: '/ops/admin/inventory', match: ['/ops/admin/inventory'] },
    { label: 'Website', href: '/ops/admin/website/branding', match: ['/ops/admin/website'] },
    { label: 'Operations', href: '/ops/admin/operations', match: ['/ops/admin/operations'] },
  ];

  const pathname = usePathname() ?? '/';
  const cleaned = pathname.split('?')[0];
  let activeHref = tabs[0].href;
  let bestMatchLength = -1;

  tabs.forEach((tab) => {
    const prefixes = tab.match ?? [tab.href];
    prefixes.forEach((prefix) => {
      if (cleaned === prefix || cleaned.startsWith(`${prefix}/`)) {
        if (prefix.length > bestMatchLength) {
          bestMatchLength = prefix.length;
          activeHref = tab.href;
        }
      }
    });
  });

  return <PageTabNav tabs={tabs} activeHref={activeHref} />;
}
