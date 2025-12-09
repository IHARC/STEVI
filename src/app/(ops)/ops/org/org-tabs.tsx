import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';

function withOrg(href: string, orgId?: number | null) {
  if (!orgId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}orgId=${orgId}`;
}

export function OrgTabs({ orgId }: { orgId?: number | null }) {
  const tabs: PageTab[] = [
    { label: 'Overview', href: withOrg('/ops/org', orgId), match: ['/ops/org'] },
    { label: 'Members', href: withOrg('/ops/org/members', orgId) },
    { label: 'Invites', href: withOrg('/ops/org/invites', orgId) },
    { label: 'Settings', href: withOrg('/ops/org/settings', orgId) },
  ];

  return <PageTabNav tabs={tabs} />;
}
