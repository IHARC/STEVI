import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';

const TABS: PageTab[] = [
  { label: 'Log', href: '/staff/outreach', match: ['/staff/outreach'] },
  { label: 'Schedule', href: '/staff/outreach/schedule' },
  { label: 'Encampments', href: '/staff/outreach/encampments' },
  { label: 'Map', href: '/staff/outreach/map' },
];

export function OutreachTabs() {
  return <PageTabNav tabs={TABS} />;
}

