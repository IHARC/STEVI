import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchPendingIntakes } from '@/lib/cases/fetchers';
import { processIntakeAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function IntakeQueuePage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/staff/intake');
  if (!access.canAccessStaffWorkspace) redirect(resolveDefaultWorkspacePath(access));

  const intakes = await fetchPendingIntakes(supabase);

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Onboarding</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Intake queue</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Convert submitted intakes into people and cases. No automatic linking to existing records — every intake is
          reviewed manually.
        </p>
      </header>

      <div className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
        {intakes.map((intake) => (
          <Card key={intake.id} className="h-full">
            <CardHeader className="space-y-space-2xs">
              <div className="flex items-center justify-between gap-space-sm">
                <CardTitle className="text-title-md">{intake.chosenName}</CardTitle>
                <Badge variant="secondary">New</Badge>
              </div>
              <CardDescription>Submitted {new Date(intake.createdAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-space-sm text-body-sm text-on-surface/80">
              <p>Email: {intake.contactEmail ?? '—'}</p>
              <p>Phone: {intake.contactPhone ?? '—'}</p>
              <p>Data sharing consent: {intake.consentDataSharing ? 'Yes' : 'No'}</p>
              <form action={processIntakeAction} className="space-y-space-2xs">
                <input type="hidden" name="intake_id" value={intake.id} />
                <Button type="submit" className="w-full">Create person & case</Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {intakes.length === 0 ? (
          <Card className="border-dashed border-outline/60">
            <CardHeader>
              <CardTitle className="text-title-md">No pending intakes</CardTitle>
              <CardDescription>New submissions will appear here automatically.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
