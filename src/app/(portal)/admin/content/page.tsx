import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { PageTabNav } from '@/components/layout/page-tab-nav';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type Tab = {
  id: string;
  label: string;
  description: string;
  href: string;
  requires: (access: PortalAccess) => boolean;
};

const TABS: Tab[] = [
  {
    id: 'website',
    label: 'Website settings',
    description: 'Branding, navigation, homepage content, and other marketing controls.',
    href: '/admin/website',
    requires: (access) => access.canManageWebsiteContent,
  },
  {
    id: 'resources',
    label: 'Resource library',
    description: 'Publish and govern public resources that sync to the marketing site.',
    href: '/admin/resources',
    requires: (access) => access.canManageResources,
  },
  {
    id: 'policies',
    label: 'Policies',
    description: 'Edit policies shown in the portal and on the public site with audit logging.',
    href: '/admin/policies',
    requires: (access) => access.canManagePolicies,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Create SMS and email notifications; delivery respects Supabase RLS and rate limits.',
    href: '/admin/notifications',
    requires: (access) => access.canManageNotifications,
  },
];

type AdminContentHubProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminContentHubPage({ searchParams }: AdminContentHubProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/content');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const allowedTabs = TABS.filter((tab) => tab.requires(access));
  if (allowedTabs.length === 0) {
    redirect(resolveLandingPath(access));
  }

  const params = await searchParams;
  const tabParam = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  const activeTab = allowedTabs.find((tab) => tab.id === tabParam) ?? allowedTabs[0];

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Admin"
        title="Content & website"
        description="Manage public-facing content from one place. Access and audit are scoped by your role."
        meta={[
          { label: 'RLS enforced', tone: 'info' },
          { label: 'Audit on', tone: 'success' },
        ]}
        helperLink={{ href: '/admin/help#content', label: 'View publishing guide' }}
      />

      <PageTabNav
        tabs={allowedTabs.map((tab) => ({ label: tab.label, href: `/admin/content?tab=${tab.id}` }))}
        activeHref={`/admin/content?tab=${activeTab.id}`}
      />

      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">What’s inside:</span>
        <ul className="mt-1 flex flex-wrap gap-2" role="list">
          {allowedTabs.map((tab) => (
            <li key={tab.id} className="rounded-lg bg-muted px-3 py-0.5 text-xs text-muted-foreground">
              {tab.label}
            </li>
          ))}
        </ul>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-xl">{activeTab.label}</CardTitle>
          <CardDescription>{activeTab.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={activeTab.href}>Open {activeTab.label}</Link>
          </Button>
          <p className="text-sm text-muted-foreground">Tab navigation keeps a single entry in the sidebar while separating responsibilities.</p>
        </CardContent>
      </Card>
    </div>
  );
}
