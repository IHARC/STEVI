import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffCaseload, fetchStaffShifts } from '@/lib/staff/fetchers';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

export default async function StaffOverviewPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessStaffWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const [caseload, shifts] = await Promise.all([
    fetchStaffCaseload(supabase, access.userId),
    fetchStaffShifts(supabase, access.userId),
  ]);

  const roleLabel = access.iharcRoles.includes('iharc_supervisor') ? 'Supervisor' : 'Staff & volunteers';

  return (
    <div className="page-shell page-stack">
      <PageHeader
        eyebrow={roleLabel}
        title="Staff overview"
        description="Move between caseload, shifts, and outreach logging without switching modes. All actions respect Supabase RLS and audit logging."
        primaryAction={{ label: 'Open caseload', href: '/staff/caseload' }}
        secondaryAction={{ label: 'Log outreach', href: '/staff/outreach' }}
      />

      <section className="grid gap-space-md md:grid-cols-3">
        <Card className="h-full">
          <CardHeader className="space-y-space-2xs">
            <div className="flex items-center justify-between gap-space-xs">
              <CardTitle className="text-title-md">Active caseload</CardTitle>
              <Badge variant="secondary">{caseload.length} open</Badge>
            </div>
            <CardDescription>Review clients assigned to you. RLS limits what you can see.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            <ul className="space-y-space-2xs text-body-sm text-on-surface/80">
              {caseload.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-space-xs">
                  <div>
                    <p className="font-medium text-on-surface">{item.clientName}</p>
                    <p className="text-muted-foreground">{item.nextStep ?? 'Next step pending'}</p>
                  </div>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {item.status}
                  </Badge>
                </li>
              ))}
              {caseload.length === 0 ? <li>No assigned cases yet.</li> : null}
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/staff/caseload">Open caseload</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="space-y-space-2xs">
            <div className="flex items-center justify-between gap-space-xs">
              <CardTitle className="text-title-md">Today’s schedule</CardTitle>
              <Badge variant="secondary">{shifts.length} blocks</Badge>
            </div>
            <CardDescription>Shift and route assignments synced from IHARC Ops.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-2xs text-body-sm text-on-surface/80">
            {shifts.slice(0, 4).map((shift) => (
              <div key={shift.id} className="rounded-lg border border-outline/20 p-space-sm">
                <p className="font-medium text-on-surface">{shift.title}</p>
                <p className="text-muted-foreground">{shift.location}</p>
                <p className="text-label-sm text-muted-foreground">
                  {shift.startsAt}–{shift.endsAt}
                </p>
              </div>
            ))}
            {shifts.length === 0 ? <p className="text-muted-foreground">No shifts today.</p> : null}
            <Button asChild variant="outline" className="w-full">
              <Link href="/staff/schedule">Open schedule</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="space-y-space-2xs">
            <CardTitle className="text-title-md">Outreach</CardTitle>
            <CardDescription>Jump into the outreach log for field notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            <p className="text-body-sm text-muted-foreground">
              Capture interactions, locations, and follow-ups. Logs stay scoped to your assignments by RLS.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/staff/outreach">Open outreach log</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
