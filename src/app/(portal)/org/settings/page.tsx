import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function OrgSettingsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOrgWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Organization</p>
        <h1 className="text-headline-lg">Settings</h1>
        <p className="max-w-2xl text-body-md text-muted-foreground">
          Organization profile editing will land here. Platform administrators still approve changes and audit every
          update.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>Read-only for now. Requests roll up to IHARC admins.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-space-sm text-body-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="font-medium text-on-surface">Organization ID</dt>
              <dd>{access.organizationId ?? 'Not set'}</dd>
            </div>
            <div>
              <dt className="font-medium text-on-surface">Role</dt>
              <dd>{access.portalRoles.join(', ') || 'portal_user'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
