import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { WorkspacePageHeader } from '@/components/layout/workspace-page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminApprovalsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  const elevatedAdmin =
    access.isProfileApproved &&
    (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin'));

  if (!elevatedAdmin) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  return (
    <div className="page-shell page-stack">
      <WorkspacePageHeader
        eyebrow="Admin workspace"
        title="Approvals queue"
        description="Centralise pending profile and organization approvals before granting access. Wire this view to profile approvals and audit logging."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Connect this queue to profile approvals and organization reviews. Ensure actions log to the audit trail and respect RLS.</p>
          <p>Suggested next steps: fetch pending profiles, add bulk approve/deny actions, and surface status filters.</p>
        </CardContent>
      </Card>
    </div>
  );
}
