import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function StaffTasksPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow="Staff tools"
        title="My tasks"
        description="Track your open tasks across caseload, outreach, and scheduling."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>Wire this list to staff tasks with due dates, owners, and linked cases. Respect RLS and audit logging for updates.</p>
          <p>Consider grouping by due date and adding quick actions for outreach notes or case updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
