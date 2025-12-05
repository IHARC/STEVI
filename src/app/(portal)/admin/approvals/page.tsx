import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminApprovalsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const elevatedAdmin =
    access.isProfileApproved &&
    (access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin'));

  if (!elevatedAdmin) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Admin"
        title="Approvals queue"
        description="Centralise pending profile and organization approvals before granting access. Wire this view to profile approvals and audit logging."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Connect this queue to profile approvals and organization reviews. Ensure actions log to the audit trail and respect RLS.</p>
          <p>Suggested next steps: fetch pending profiles, add bulk approve/deny actions, and surface status filters.</p>
        </CardContent>
      </Card>
    </div>
  );
}
