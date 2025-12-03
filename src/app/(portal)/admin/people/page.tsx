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
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Admin"
        title="People & access"
        description="Centralize people, approvals, and permissions. Surfaces respect existing RLS and audit logging."
      />

      <PageTabNav
        tabs={allowedTabs.map((tab) => ({ label: tab.label, href: `/admin/people?tab=${tab.id}` }))}
        activeHref={`/admin/people?tab=${activeTab.id}`}
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-title-lg">{activeTab.label}</CardTitle>
          <CardDescription>{activeTab.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-space-sm">
          <Button asChild>
            <Link href={activeTab.href}>Open {activeTab.label}</Link>
          </Button>
          <p className="text-body-sm text-muted-foreground">Tabs keep a single sidebar entry while separating responsibilities.</p>
        </CardContent>
      </Card>
    </div>
  );
}
