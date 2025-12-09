import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffShifts } from '@/lib/staff/fetchers';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/workspace/programs/${id}`);
  }

  if (!access.canAccessStaffWorkspace && !access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  const shifts = access.canAccessStaffWorkspace ? await fetchStaffShifts(supabase, access.userId) : [];
  const program = shifts.find((shift) => shift.id === id) ?? null;
  if (!program) {
    notFound();
  }

  const newVisitHref = `/workspace/visits/new?programId=${program.id}`;
  const orgMissing = (access.canAccessStaffWorkspace || access.canAccessAdminWorkspace) && !access.organizationId;
  const visitAction = orgMissing
    ? { label: 'Select org to start Visit', href: '/org' }
    : { label: 'Start Visit in this program', href: newVisitHref };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Program"
        title={program.title}
        description="Roster, attendance, and shift context for this program. Start Visits from here to keep provenance."
        primaryAction={visitAction}
        secondaryAction={{ label: 'Back to programs', href: '/workspace/programs' }}
        breadcrumbs={[{ label: 'Programs', href: '/workspace/programs' }, { label: program.title }]}
        meta={[{ label: program.location, tone: 'info' }]}
      />

      <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Roster & attendance</CardTitle>
            <CardDescription>Assign staff and volunteers; attendance rolls stay within the Visit record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Shift log</Badge>
              <Badge variant="outline">Attendance</Badge>
              <Badge variant="outline">Schedule</Badge>
            </div>
            <p className="text-muted-foreground">Wire roster to staffing data when available. Keep shift notes inside Visits to preserve provenance.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/workspace/programs">Manage schedule</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shift context</CardTitle>
            <CardDescription>Location and timing for this program.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p className="font-semibold">Location</p>
            <p className="text-muted-foreground">{program.location}</p>
            <p className="font-semibold mt-2">Schedule</p>
            <p className="text-muted-foreground">{program.startsAt} – {program.endsAt}</p>
            <Button asChild variant="outline" className="w-full mt-3">
              <Link href="/workspace/visits/new">Log shift note</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
