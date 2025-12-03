import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ShiftLogsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Staff tools"
        title="Shift logs"
        description="Capture shift summaries, handoffs, and safety checks."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Plan to ingest shift logs from IHARC systems or allow inline entry. Keep handoff notes visible to on-call supervisors.</p>
          <p>All updates should be audited and respect staff role-based permissions.</p>
        </CardContent>
      </Card>
    </div>
  );
}

