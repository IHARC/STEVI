import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminWarmingRoomPage() {
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
        title="Warming room operations"
        description="Plan capacity, staffing, and safety checks for IHARC warming rooms. Integrate with inventory and scheduling when data is ready."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Stub view for warming room coordination. Add capacity tracking, incident logging, and shift coverage here.</p>
          <p>Ensure all mutations log to the audit trail and respect consent flags once hooked to Supabase data.</p>
        </CardContent>
      </Card>
    </div>
  );
}
