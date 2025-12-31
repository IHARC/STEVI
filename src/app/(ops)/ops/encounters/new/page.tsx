import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffShifts } from '@/lib/staff/fetchers';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { EncounterCreateForm } from '@workspace/encounters/encounter-create-form';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

type PersonRow = Pick<Database['core']['Tables']['people']['Row'], 'id' | 'first_name' | 'last_name'>;

export default async function NewEncounterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const personIdParam = resolvedSearchParams?.personId ?? resolvedSearchParams?.person_id;
  const caseIdParam = resolvedSearchParams?.caseId ?? resolvedSearchParams?.case_id;
  const programIdParam = resolvedSearchParams?.programId ?? resolvedSearchParams?.program_id;

  const personId = Number.parseInt(Array.isArray(personIdParam) ? personIdParam[0] : (personIdParam ?? ''), 10);
  const caseId = Number.parseInt(Array.isArray(caseIdParam) ? caseIdParam[0] : (caseIdParam ?? ''), 10);
  const programId = Array.isArray(programIdParam) ? programIdParam[0] : programIdParam;

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect('/auth/start?next=/ops/encounters/new');
  }

  if (!access.canAccessOpsAdmin && !access.canAccessOpsFrontline && !access.canAccessOpsOrg) {
    redirect(resolveLandingPath(access));
  }

  const canStartEncounter = access.canAccessOpsAdmin || access.canAccessOpsFrontline;
  const orgMissing = canStartEncounter && !access.organizationId;
  const orgSelectionHref = '/ops/profile';
  const orgOptionsCount = access.actingOrgChoicesCount;

  if (orgMissing) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Encounter"
          title="Select an acting organization"
          description="Choose your organization before starting an encounter. This keeps provenance, referrals, and supplies tied to the right tenant."
          primaryAction={{ label: 'Select organization', href: orgSelectionHref }}
          secondaryAction={{ label: 'Back to Today', href: '/ops/today' }}
          meta={[
            { label: orgOptionsCount && orgOptionsCount > 1 ? 'Multiple orgs available' : 'Org required', tone: 'warning' },
          ]}
          breadcrumbs={[{ label: 'Today', href: '/ops/today' }, { label: 'New Encounter' }]}
        />

        <Card className="border-dashed border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Set acting org to continue</CardTitle>
            <CardDescription>Encounter creation is blocked until you pick which organization you’re acting on behalf of.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <p>Pick your acting org from account settings (or use the Acting org switcher in the header). This ensures every encounter, referral, and supply adjustment records provenance.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={orgSelectionHref}>Open account settings</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/ops/today">Return to Today</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">If you only have one organization, we’ll auto-select it next time you sign in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!personId || Number.isNaN(personId)) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Encounter"
          title="Select a person"
          description="Encounters are always tied to a person. Find a client to start logging context and outputs."
          primaryAction={{ label: 'Find a person', href: '/ops/clients?view=directory' }}
          secondaryAction={{ label: 'Back to Today', href: '/ops/today' }}
          breadcrumbs={[{ label: 'Today', href: '/ops/today' }, { label: 'New Encounter' }]}
        />

        <Card className="border-dashed border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Choose a person to continue</CardTitle>
            <CardDescription>Start from the directory to attach the encounter to the right client record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <Button asChild className="w-full md:w-auto">
              <Link href="/ops/clients?view=directory">Open client directory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const person = await loadPerson(supabase, personId);
  if (!person) notFound();

  const shifts = access.canAccessOpsFrontline ? await fetchStaffShifts(supabase, access.userId) : [];
  const programContext = programId ? shifts.find((shift) => shift.id === programId) ?? null : null;

  const defaultEncounterType = programContext ? 'program' : 'outreach';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Encounter"
        title={`Start encounter for ${person.first_name ?? 'Person'} ${person.last_name ?? ''}`.trim()}
        description="Capture encounter context before logging tasks, supplies, referrals, or care updates."
        secondaryAction={{ label: 'Back to client profile', href: `/ops/clients/${person.id}?view=directory` }}
        breadcrumbs={[{ label: 'Clients', href: '/ops/clients?view=directory' }, { label: 'New Encounter' }]}
        meta={[{ label: access.organizationName ?? 'Acting org selected', tone: 'neutral' }]}
      />

      <EncounterCreateForm
        personId={person.id}
        caseId={caseId && !Number.isNaN(caseId) ? caseId : null}
        programContext={programContext?.title ?? null}
        locationContext={programContext?.location ?? null}
        defaultEncounterType={defaultEncounterType}
      />
    </div>
  );
}

async function loadPerson(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select('id, first_name, last_name')
    .eq('id', personId)
    .maybeSingle();

  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}
