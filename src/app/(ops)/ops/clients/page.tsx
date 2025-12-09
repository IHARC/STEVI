import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffCaseload } from '@/lib/staff/fetchers';
import { fetchStaffCases } from '@/lib/cases/fetchers';
import { getOnboardingStatusForPeople, type OnboardingStatus } from '@/lib/onboarding/status';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

type PeopleListItem = {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
  person_type: string;
  data_sharing_consent: boolean;
  phone: string | null;
  email: string | null;
};

type PersonWithOnboarding = PeopleListItem & { onboarding?: OnboardingStatus | null };

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

const VIEWS = ['directory', 'caseload', 'activity'] as const;
type ViewId = (typeof VIEWS)[number];

export default async function OpsClientsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const viewParam = resolvedSearchParams?.view;
  const activeView: ViewId = VIEWS.includes((Array.isArray(viewParam) ? viewParam[0] : viewParam) as ViewId)
    ? ((Array.isArray(viewParam) ? viewParam[0] : viewParam) as ViewId)
    : 'directory';

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/clients');
  }

  if (!access.canAccessOpsFrontline && !access.canManageConsents && !access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const canStartVisit = access.canAccessOpsFrontline || access.canAccessOpsAdmin;
  const orgMissing = canStartVisit && !access.organizationId;
  const visitAction = canStartVisit
    ? { label: orgMissing ? 'Select org to start Visit' : 'New Visit', href: orgMissing ? '/ops/org' : '/ops/visits/new' }
    : { label: 'Find or create person', href: '/ops/clients?view=directory' };

  const [people, onboardingMap, caseload, cases] = await Promise.all([
    loadDirectory(supabase),
    loadOnboardingStatuses(supabase),
    access.canAccessOpsFrontline ? fetchStaffCaseload(supabase, access.userId) : Promise.resolve([]),
    access.canAccessOpsFrontline ? fetchStaffCases(supabase, 60) : Promise.resolve([]),
  ]);

  const peopleWithOnboarding: PersonWithOnboarding[] = people.map((person) => ({
    ...person,
    onboarding: onboardingMap[person.id],
  }));

  const statusCounts = peopleWithOnboarding.reduce<Record<string, number>>((acc, person) => {
    const status = person.onboarding?.status ?? 'NOT_STARTED';
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, { COMPLETED: 0, NEEDS_CONSENTS: 0, NOT_STARTED: 0 });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Operations"
        title="Clients"
        description="Directory, caseload, and recent activity in one hub. Start Visits and keep referrals or supplies within the Visit context."
        primaryAction={visitAction}
        secondaryAction={{ label: 'Find or create person', href: '/ops/clients?view=directory' }}
        helperLink={{ label: 'View acting org', href: '/ops/org' }}
        meta={[{ label: 'Visit-first', tone: 'info' }, { label: 'Journey timeline', tone: 'neutral' }]}
      />

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((view) => (
          <Button
            key={view}
            asChild
            size="sm"
            variant={activeView === view ? 'secondary' : 'outline'}
            className="rounded-full"
          >
            <Link href={`/ops/clients?view=${view}`}>{labelForView(view)}</Link>
          </Button>
        ))}
      </div>

      {activeView === 'directory' ? (
        <DirectoryView people={peopleWithOnboarding} statusCounts={statusCounts} />
      ) : null}

      {activeView === 'caseload' ? (
        <CaseloadView caseload={caseload} />
      ) : null}

      {activeView === 'activity' ? (
        <ActivityView cases={cases} />
      ) : null}
    </div>
  );
}

async function loadDirectory(supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>): Promise<PeopleListItem[]> {
  const core = supabase.schema('core');
  const { data, error } = await core.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: 80,
    p_person_types: null,
    p_status: null,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as PeopleListItem[];
}

async function loadOnboardingStatuses(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
): Promise<Record<number, OnboardingStatus | null | undefined>> {
  const core = supabase.schema('core');
  const { data, error } = await core.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: 80,
    p_person_types: null,
    p_status: null,
  });

  if (error) {
    throw error;
  }

  const ids = ((data ?? []) as PeopleListItem[]).map((person) => person.id);
  return getOnboardingStatusForPeople(ids, supabase);
}

function DirectoryView({ people, statusCounts }: { people: PersonWithOnboarding[]; statusCounts: Record<string, number> }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">Onboarded: {statusCounts.COMPLETED}</Badge>
        <Badge variant="secondary">Needs consents: {statusCounts.NEEDS_CONSENTS}</Badge>
        <Badge variant="outline">Not started: {statusCounts.NOT_STARTED}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {people.map((person) => (
          <Card key={person.id} className="h-full">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">{person.first_name ?? 'Person'} {person.last_name ?? ''}</CardTitle>
                <CardDescription>Person ID: {person.id}</CardDescription>
                <p className="text-sm text-muted-foreground">Type: {person.person_type ?? 'unspecified'}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={person.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {person.status ?? 'active'}
                </Badge>
                <Badge variant={resolveOnboardingVariant(person.onboarding)} className="capitalize">
                  {person.onboarding ? person.onboarding.status.toLowerCase() : 'status n/a'}
                </Badge>
                <Badge variant={person.data_sharing_consent ? 'outline' : 'secondary'} className="capitalize">
                  {person.data_sharing_consent ? 'Sharing: org/partners' : 'Sharing: restricted'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-foreground/80">
              <p>Email: {person.email ?? '—'}</p>
              <p>Phone: {person.phone ?? '—'}</p>
              <p className="text-muted-foreground">{describeOnboarding(person.onboarding)}</p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={`/ops/clients/${person.id}`}>Open profile</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {people.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No clients visible</CardTitle>
              <CardDescription>RLS may limit what you can see. Ask an admin to adjust access or switch org.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function CaseloadView({ caseload }: { caseload: Awaited<ReturnType<typeof fetchStaffCaseload>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {caseload.map((item) => (
        <Card key={item.id} className="h-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">{item.clientName}</CardTitle>
            <CardDescription>Status: {item.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p>Next step: {item.nextStep ?? 'Add next step from Visit'}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/ops/clients/${item.id}`}>Open profile</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
      {caseload.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">No assigned caseload</CardTitle>
            <CardDescription>Assign clients to yourself from a Visit to build your caseload.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}

function ActivityView({ cases }: { cases: Awaited<ReturnType<typeof fetchStaffCases>> }) {
  return (
    <div className="space-y-3">
      {cases.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">No recent activity</CardTitle>
            <CardDescription>Log outreach, tasks, or Visits to populate the feed.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        cases.map((item: Awaited<ReturnType<typeof fetchStaffCases>>[number]) => (
          <Card key={item.id} className="border-border/60">
            <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{item.caseType ?? 'Support case'}</CardTitle>
                <CardDescription>Person #{item.personId}</CardDescription>
              </div>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {item.status ?? 'active'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              <p>Manager: {item.caseManagerName}</p>
              <p>Priority: {item.priority ?? 'unspecified'}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Created by org</Badge>
                <Badge variant="secondary">Visible to org</Badge>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/ops/clients/${item.personId}?case=${item.id}`}>Open client</Link>
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function resolveOnboardingVariant(status?: OnboardingStatus | null) {
  if (!status) return 'secondary';
  if (status.status === 'COMPLETED') return 'default';
  if (status.status === 'NEEDS_CONSENTS') return 'secondary';
  return 'outline';
}

function describeOnboarding(status?: OnboardingStatus | null) {
  if (!status) return 'Onboarding status unavailable.';
  if (status.status === 'COMPLETED') return 'Onboarding complete; consents and sharing recorded.';

  const missing: string[] = [];
  if (!status.hasServiceAgreementConsent) missing.push('service agreement');
  if (!status.hasPrivacyAcknowledgement) missing.push('privacy notice');
  if (!status.hasDataSharingPreference) missing.push('sharing choice');

  return missing.length ? `Missing: ${missing.join(', ')}.` : 'Awaiting onboarding steps.';
}

function labelForView(view: ViewId) {
  if (view === 'directory') return 'Directory';
  if (view === 'caseload') return 'My caseload';
  return 'Activity feed';
}
