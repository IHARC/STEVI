import { PageTabNav, type PageTab } from '@/components/layout/page-tab-nav';

const ORG_TABS: PageTab[] = [
  { label: 'Overview', href: '/org', match: ['/org'] },
  { label: 'Members', href: '/org/members' },
  { label: 'Invites', href: '/org/invites' },
  { label: 'Settings', href: '/org/settings' },
];

export function OrgTabs() {
  return <PageTabNav tabs={ORG_TABS} />;
}

