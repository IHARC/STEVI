import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';

export function AdminTabs() {
  const tabs: PageTab[] = [
    { label: 'Overview', href: '/ops/admin', match: ['/ops/admin'] },
    { label: 'Content', href: '/ops/admin/content' },
    { label: 'Organizations', href: '/ops/admin/organizations', match: ['/ops/admin/organizations'] },
    { label: 'Users', href: '/ops/admin/users/all', match: ['/ops/admin/users'] },
    { label: 'Inventory', href: '/ops/admin/inventory', match: ['/ops/admin/inventory'] },
    { label: 'Website', href: '/ops/admin/website', match: ['/ops/admin/website'] },
    { label: 'Operations', href: '/ops/admin/operations', match: ['/ops/admin/operations'] },
  ];

  return <PageTabNav tabs={tabs} />;
}

