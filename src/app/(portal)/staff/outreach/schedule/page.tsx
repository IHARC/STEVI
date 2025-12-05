import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { OutreachTabs } from '../outreach-tabs';

export const dynamic = 'force-dynamic';

export default async function OutreachSchedulePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3">
        <PageHeader
          eyebrow="Staff tools"
          title="Outreach schedule"
          description="Plan outreach routes and assignments. Bring map and shift data together here."
        />
        <OutreachTabs />
      </div>
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Stub view for scheduling outreach routes. Integrate with shifts, appointments, and geospatial data when available.</p>
          <p>Ensure any future updates respect RLS and log to the audit trail.</p>
        </CardContent>
      </Card>
    </div>
  );
}
