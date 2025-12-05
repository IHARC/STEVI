import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffShifts } from '@/lib/staff/fetchers';

export const dynamic = 'force-dynamic';

export default async function StaffSchedulePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const shifts = await fetchStaffShifts(supabase, access.userId);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Schedule</p>
        <h1 className="text-3xl text-foreground">Today’s coverage</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Wire this view to Supabase once the shift + assignment schemas are confirmed. For now it demonstrates the
          layout and Material 3 treatment.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {shifts.map((shift) => (
          <Card key={shift.id} className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">{shift.title}</CardTitle>
              <CardDescription>{shift.location}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80">
              <p>
                {shift.startsAt}–{shift.endsAt}
              </p>
              <p className="mt-1 text-muted-foreground">Assignments and checklists will render here.</p>
            </CardContent>
          </Card>
        ))}
        {shifts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">No shifts scheduled</CardTitle>
              <CardDescription>When shifts are assigned, they will appear here automatically.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
