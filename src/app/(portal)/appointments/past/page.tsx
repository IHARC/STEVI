import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { WorkspacePageHeader } from '@/components/layout/workspace-page-header';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function PastAppointmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/appointments/past');
  }

  await ensurePortalProfile(supabase, user.id);

  return (
    <div className="page-shell page-stack">
      <WorkspacePageHeader
        eyebrow="Appointments"
        title="Past appointments"
        description="Review completed and cancelled appointments. Filtering and exports will be added when data is connected."
      />
      <Card>
        <CardContent className="space-y-space-2xs py-space-md text-body-md text-muted-foreground">
          <p>This view will list historical appointments with outcomes and follow-ups once wired to Supabase.</p>
          <p>Use the main appointments page to manage upcoming visits in the meantime.</p>
        </CardContent>
      </Card>
    </div>
  );
}

