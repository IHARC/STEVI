import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent } from '@shared/ui/card';

export const dynamic = 'force-dynamic';

export default async function PastAppointmentsPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/start?next=/appointments/past');
  }

  await ensurePortalProfile(supabase, user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Appointments"
        title="Past appointments"
        description="Review completed and cancelled appointments. Filtering and exports will be added when data is connected."
      />
      <Card>
        <CardContent className="space-y-1 py-4 text-sm text-muted-foreground">
          <p>This view will list historical appointments with outcomes and follow-ups once wired to Supabase.</p>
          <p>Use the main appointments page to manage upcoming visits in the meantime.</p>
        </CardContent>
      </Card>
    </div>
  );
}
