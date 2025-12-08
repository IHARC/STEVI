import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

export default async function StaffTasksPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Staff tools"
        title="My tasks"
        description="Track your open tasks across caseload, outreach, and scheduling."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>Wire this list to staff tasks with due dates, owners, and linked cases. Respect RLS and audit logging for updates.</p>
          <p>Consider grouping by due date and adding quick actions for outreach notes or case updates.</p>
        </CardContent>
      </Card>
    </div>
  );
}
