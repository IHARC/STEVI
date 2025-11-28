import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { fetchOrgMembersWithRoles } from '@/lib/org/fetchers';
import { OrgMembersTable } from './org-members-table';

export const dynamic = 'force-dynamic';

export default async function OrgMembersPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canManageOrgUsers || !access.organizationId) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const members = await fetchOrgMembersWithRoles(supabase, access.organizationId);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-headline-lg sm:text-display-sm">Members</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          All actions respect Supabase row-level security. Use the toggles to keep roles clear and audit-friendly.
        </p>
      </header>

      <div className="grid gap-space-sm md:grid-cols-2">
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
          <CardTitle className="text-title-lg">Active members</CardTitle>
          <CardDescription>Promote admins, assign representatives, or remove access.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <OrgMembersTable members={members} currentProfileId={access.profile.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex items-start justify-between gap-space-sm">
        <div>
          <CardTitle className="text-title-md">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </CardHeader>
    </Card>
  );
}
