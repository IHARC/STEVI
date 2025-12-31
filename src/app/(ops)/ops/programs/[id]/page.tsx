import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffShifts } from '@/lib/staff/fetchers';
import { normalizeEnumParam, toSearchParams } from '@/lib/search-params';
import { PageHeader } from '@shared/layout/page-header';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

export default async function ProgramDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const canonicalParams = toSearchParams(resolvedSearchParams);
  const { redirected } = normalizeEnumParam(canonicalParams, 'view', ['overview'] as const, 'overview');
  if (redirected) {
    redirect(`/ops/programs/${id}?${canonicalParams.toString()}`);
  }
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/auth/start?next=${encodeURIComponent(`/ops/programs/${id}?view=overview`)}`);
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const shifts = access.canAccessOpsFrontline ? await fetchStaffShifts(supabase, access.userId) : [];
  const program = shifts.find((shift) => shift.id === id) ?? null;
  if (!program) {
    notFound();
  }

  const orgMissing = (access.canAccessOpsFrontline || access.canAccessOpsAdmin) && !access.organizationId;
  const newEncounterHref = `/ops/encounters/new?programId=${program.id}`;
  const encounterAction = orgMissing
    ? { label: 'Select acting org to start Encounter', href: newEncounterHref }
    : { label: 'Start encounter in this program', href: newEncounterHref };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Program"
        title={program.title}
        description="Roster, attendance, and shift context for this program. Start encounters from here to keep provenance."
        primaryAction={encounterAction}
        secondaryAction={{ label: 'Back to programs', href: '/ops/programs?view=overview' }}
        breadcrumbs={[{ label: 'Programs', href: '/ops/programs?view=overview' }, { label: program.title }]}
        meta={[{ label: program.location, tone: 'info' }]}
      />

      <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Roster & attendance</CardTitle>
            <CardDescription>Assign staff and volunteers; attendance rolls stay within the encounter record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <p className="text-muted-foreground">Wire roster to staffing data when available. Keep shift notes inside encounters to preserve provenance.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/ops/programs?view=schedule">Manage schedule</Link>
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
              <Link href={newEncounterHref}>Log shift note</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
