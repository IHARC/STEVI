import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function StaffTeamTasksPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Staff tools"
        title="Team tasks"
        description="Coordinate tasks across the outreach team with ownership and status."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Stub for a team-wide task board. Integrate with caseload assignments and outreach scheduling when available.</p>
          <p>Include filters by location, shift, and priority, and ensure changes are audited.</p>
        </CardContent>
      </Card>
    </div>
  );
}
