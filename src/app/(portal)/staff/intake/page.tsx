import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchPendingIntakes } from '@/lib/cases/fetchers';
import { processIntakeAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function IntakeQueuePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/staff/intake');
  if (!access.canAccessStaffWorkspace) redirect(resolveLandingPath(access));

  const intakes = await fetchPendingIntakes(supabase);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Onboarding</p>
        <h1 className="text-3xl text-foreground sm:text-4xl">Intake queue</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Convert submitted intakes into people and cases. No automatic linking to existing records — every intake is
          reviewed manually.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {intakes.map((intake) => (
          <Card key={intake.id} className="h-full">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">{intake.chosenName}</CardTitle>
                <Badge variant="secondary">New</Badge>
              </div>
              <CardDescription>Submitted {new Date(intake.createdAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <p>Email: {intake.contactEmail ?? '—'}</p>
              <p>Phone: {intake.contactPhone ?? '—'}</p>
              <p>Data sharing consent: {intake.consentDataSharing ? 'Yes' : 'No'}</p>
              <form action={processIntakeAction} className="space-y-1">
                <input type="hidden" name="intake_id" value={intake.id} />
                <Button type="submit" className="w-full">Create person & case</Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {intakes.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No pending intakes</CardTitle>
              <CardDescription>New submissions will appear here automatically.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
