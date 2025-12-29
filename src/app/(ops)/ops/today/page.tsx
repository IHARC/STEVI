import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchStaffCaseload, fetchStaffShifts } from '@/lib/staff/fetchers';
import { fetchPendingIntakes } from '@/lib/cases/fetchers';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Badge } from '@shared/ui/badge';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function OpsTodayPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/today');
  }

  if (!access.canAccessOpsAdmin && !access.canAccessOpsFrontline && !access.canAccessOpsOrg) {
    redirect(resolveLandingPath(access));
  }

  const hasVolunteerRole = access.orgRoles.some((role) => role.roleKind === 'volunteer' || role.name === 'iharc_volunteer');
  const hasStaffRole = access.orgRoles.some((role) => role.roleKind === 'staff');
  const isVolunteerOnly = hasVolunteerRole && !hasStaffRole && !access.canAccessOpsAdmin && !access.canManageConsents;
  const showStaffWidgets = access.canAccessOpsFrontline && !isVolunteerOnly;
  const showVolunteerOnly = access.canAccessOpsFrontline && !showStaffWidgets;
  const [caseload, shifts, intakes] = showStaffWidgets
    ? await loadStaffWidgets(supabase, access.userId)
    : [[], [], []];

  const findPersonHref = '/ops/clients?view=directory';
  const canStartVisit = access.canAccessOpsFrontline || access.canAccessOpsAdmin;
  const orgMissing = canStartVisit && !access.organizationId;
  const newVisitHref = canStartVisit ? '/ops/visits/new' : findPersonHref;
  const visitAction = canStartVisit
    ? { label: orgMissing ? 'Select acting org to start Visit' : 'New Visit', href: newVisitHref }
    : { label: 'Find or create person', href: findPersonHref };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Today"
        description="Stay visit-first: start a Visit, find or create a person, and work the queues that matter for your role."
        meta={[{ label: 'Visit-first', tone: 'info' }, { label: 'Single rail', tone: 'neutral' }]}
        primaryAction={visitAction}
        secondaryAction={{ label: 'Find or create person', href: findPersonHref }}
        helperLink={{ label: 'View help', href: '/support' }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Find or create person</CardTitle>
            <CardDescription>Jump to search or intake without leaving the Visit-first rail.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Visit copy</Badge>
              <Badge variant="outline">No mega menu</Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={newVisitHref}>New Visit</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={findPersonHref}>Find or create person</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              All frontline actions happen inside a Visit. Starting here pre-fills your context and keeps supplies, referrals, and notes together.
            </p>
          </CardContent>
        </Card>

        {showStaffWidgets ? (
          <Card className="border-border/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Active caseload</CardTitle>
                <Badge variant="secondary">{caseload.length} open</Badge>
              </div>
              <CardDescription>Visit and task from people assigned to you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              {caseload.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.clientName}</p>
                    <Badge variant={item.status === 'active' ? 'default' : 'outline'} className="capitalize">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Next: {item.nextStep ?? 'Add next step from Visit'}</p>
                </div>
              ))}
              {caseload.length === 0 ? <p className="text-muted-foreground">No assigned people yet.</p> : null}
              <Button asChild variant="outline" className="w-full">
                <Link href="/ops/clients?view=caseload">Open caseload</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {showStaffWidgets ? (
          <Card className="border-border/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Today’s shifts</CardTitle>
                <Badge variant="secondary">{shifts.length}</Badge>
              </div>
              <CardDescription>Program and outreach context for Visit creation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              {shifts.slice(0, 4).map((shift) => (
                <div key={shift.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="font-medium text-foreground">{shift.title}</p>
                  <p className="text-muted-foreground">{shift.location}</p>
                  <p className="text-xs text-muted-foreground">{shift.startsAt}–{shift.endsAt}</p>
                </div>
              ))}
              {shifts.length === 0 ? <p className="text-muted-foreground">No scheduled shifts today.</p> : null}
              <Button asChild variant="outline" className="w-full">
                <Link href="/ops/programs?view=overview">Open programs</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {showStaffWidgets ? (
          <Card className="border-border/70">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Intake queue</CardTitle>
                <Badge variant="secondary">{intakes.length}</Badge>
              </div>
              <CardDescription>Convert submissions into Visits without leaving the rail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              {intakes.slice(0, 3).map((intake) => (
                <div key={intake.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="font-medium text-foreground">{intake.chosenName}</p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(intake.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {intakes.length === 0 ? <p className="text-muted-foreground">No pending intakes.</p> : null}
              <Button asChild variant="outline" className="w-full">
                <Link href="/ops/clients?view=directory">Process intake</Link>
              </Button>
            </CardContent>
          </Card>
        ) : showVolunteerOnly ? (
          <Card className="border-border/70">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Volunteer tools</CardTitle>
              <CardDescription>Stay focused on intake, Visits, and referrals. Admin hubs stay hidden.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              <Button asChild className="w-full">
                <Link href={newVisitHref}>Start Visit</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={findPersonHref}>Find or create person</Link>
              </Button>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">Organizations</span>
                <span>Ask your admin for access to organizations and referrals.</span>
              </div>
              <p className="text-xs text-muted-foreground">Referrals and supplies must be logged inside the Visit.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/70">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Ops orientation</CardTitle>
              <CardDescription>Use the Ops rail to reach Organization, Organizations, and Inventory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Admins can manage access under Organization → Access & roles.</p>
              <p>Referrals start from a Visit or client record; Organizations stores partner contacts and services.</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/ops/organizations">Go to Organizations</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

async function loadStaffWidgets(supabase: SupabaseRSCClient, userId: string) {
  try {
    const [caseload, shifts, intakes] = await Promise.all([
      fetchStaffCaseload(supabase, userId),
      fetchStaffShifts(supabase, userId),
      fetchPendingIntakes(supabase),
    ]);
    return [caseload, shifts, intakes] as const;
  } catch (error) {
    console.warn('Unable to load staff widgets for today', error);
    return [[], [], []] as const;
  }
}
