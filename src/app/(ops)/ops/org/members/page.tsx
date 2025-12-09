import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchOrgMembersWithRoles } from '@/lib/org/fetchers';
import { OrgMembersTable } from './org-members-table';
import { OrgTabs } from '../org-tabs';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function OrgMembersPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(resolveLandingPath(access));
  }

  const resolved = searchParams ? await searchParams : undefined;
  const orgParam = resolved?.orgId ?? resolved?.org ?? resolved?.organizationId;
  const parsedOrg = Array.isArray(orgParam) ? Number.parseInt(orgParam[0] ?? '', 10) : Number.parseInt(orgParam ?? '', 10);
  const requestedOrgId = Number.isFinite(parsedOrg) ? parsedOrg : null;
  const targetOrgId = access.organizationId ?? requestedOrgId ?? null;

  if (!targetOrgId && access.canAccessOpsAdmin) {
    redirect('/ops/org');
  }

  const allowed = (access.canManageOrgUsers && targetOrgId !== null && access.organizationId === targetOrgId) || access.canAccessOpsAdmin;
  if (!allowed || !targetOrgId) {
    redirect(resolveLandingPath(access));
  }

  const members = await fetchOrgMembersWithRoles(supabase, targetOrgId);

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-3xl sm:text-4xl">Members</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          All actions respect Supabase row-level security. Use the toggles to keep roles clear and audit-friendly.
        </p>
      </header>

      <OrgTabs orgId={targetOrgId} />

      <div className="grid gap-3 md:grid-cols-2">
        <RoleCard
          title="Org admin"
          description="Full control of members, invitations, and organization settings."
          badge="Full access"
        />
        <RoleCard
          title="Org representative"
          description="Can invite members and collaborate with IHARC staff without full admin rights."
          badge="Limited"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Active members</CardTitle>
          <CardDescription>Promote admins, assign representatives, or remove access.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <OrgMembersTable members={members} currentProfileId={access.profile.id} organizationId={targetOrgId} />
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </CardHeader>
    </Card>
  );
}
