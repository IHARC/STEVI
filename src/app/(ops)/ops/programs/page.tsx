import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffShifts } from '@/lib/staff/fetchers';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function OpsProgramsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/programs');
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const shifts = access.canAccessOpsFrontline ? await fetchStaffShifts(supabase, access.userId) : [];
  const todaysPrograms = shifts.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Operations"
        title="Programs"
        description="Program cards, schedules, and rosters in one place. Start Visits from a program to keep context."
        secondaryAction={{ label: 'View partners', href: '/ops/partners' }}
        meta={[{ label: 'Outreach lives here', tone: 'info' }]}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today’s programs</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/ops/programs?view=schedule">View schedule</Link>
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {todaysPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} highlight />
          ))}
          {todaysPrograms.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">No scheduled programs today</CardTitle>
                <CardDescription>Shifts and outreach schedules will appear here once assigned.</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">All programs</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
          {shifts.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">No programs yet</CardTitle>
                <CardDescription>Set up programs and shifts to staff coverage and start Visits from context.</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ProgramCard({ program, highlight }: { program: { id: string; title: string; location: string; startsAt: string; endsAt: string }; highlight?: boolean }) {
  return (
    <Card className={cn('h-full border-border/60', highlight && 'ring-1 ring-primary/40')}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg truncate">{program.title}</CardTitle>
          <Badge variant="secondary">Today</Badge>
        </div>
        <CardDescription>{program.location}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground/80">
        <p>
          {program.startsAt} – {program.endsAt}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Roster</Badge>
          <Badge variant="outline">Attendance</Badge>
          <Badge variant="outline">Shift log</Badge>
        </div>
        <Button asChild className="w-full">
          <Link href={`/ops/programs/${program.id}`}>Open program</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
