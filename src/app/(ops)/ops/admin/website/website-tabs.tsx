import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';

export function WebsiteTabs() {
  const tabs: PageTab[] = [
    { label: 'Branding', href: '/ops/admin/website/branding' },
    { label: 'Navigation', href: '/ops/admin/website/navigation' },
    { label: 'Home', href: '/ops/admin/website/home' },
    { label: 'Supports', href: '/ops/admin/website/supports' },
    { label: 'Programs', href: '/ops/admin/website/programs' },
    { label: 'Footer', href: '/ops/admin/website/footer' },
    { label: 'Content inventory', href: '/ops/admin/website/inventory' },
    { label: 'Fundraising', href: '/ops/admin/website/fundraising' },
  ];

  return <PageTabNav tabs={tabs} variant="secondary" />;
}
