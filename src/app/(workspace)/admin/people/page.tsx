import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { PageHeader } from '@shared/layout/page-header';
import { PageTabNav } from '@shared/layout/page-tab-nav';
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

const isElevatedAdmin = (access: PortalAccess) =>
  access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin');

const TABS: Tab[] = [
  {
    id: 'clients',
    label: 'Client directory',
    description: 'Find clients, review consent status, and open cases with full audit logging.',
    href: '/admin/clients',
    requires: (access) => access.canManageConsents,
  },
  {
    id: 'consents',
    label: 'Consent overrides',
    description: 'Manage consent overrides and history with required RLS enforcement.',
    href: '/admin/consents',
    requires: (access) => access.canManageConsents,
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Manage portal user accounts and role assignments.',
    href: '/admin/users',
    requires: (access) => access.isProfileApproved && (isElevatedAdmin(access) || access.portalRoles.includes('portal_org_admin')),
  },
  {
    id: 'profiles',
    label: 'Profiles & invites',
    description: 'Approve or revoke profiles and invitations with audit trail coverage.',
    href: '/admin/profiles',
    requires: (access) => access.isProfileApproved && isElevatedAdmin(access),
  },
  {
    id: 'permissions',
    label: 'Permissions',
    description: 'Review portal permission sets and ensure least-privilege assignments.',
    href: '/admin/permissions',
    requires: (access) => access.isProfileApproved && isElevatedAdmin(access),
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Manage organizations, relationships, and delegated administrators.',
    href: '/admin/organizations',
    requires: (access) => access.isProfileApproved && isElevatedAdmin(access),
  },
];

type AdminPeopleHubProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPeopleHubPage({ searchParams }: AdminPeopleHubProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/people');
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
        title="People & access"
        description="Centralize people, approvals, and permissions. Surfaces respect existing RLS and audit logging."
        meta={[
          { label: 'RLS enforced', tone: 'info' },
          { label: 'Audit on', tone: 'success' },
        ]}
        helperLink={{ href: '/admin/help#people', label: 'View access guide' }}
      />

      <PageTabNav
        tabs={allowedTabs.map((tab) => ({ label: tab.label, href: `/admin/people?tab=${tab.id}` }))}
        activeHref={`/admin/people?tab=${activeTab.id}`}
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
          <p className="text-sm text-muted-foreground">Tabs keep a single sidebar entry while separating responsibilities.</p>
        </CardContent>
      </Card>
    </div>
  );
}
