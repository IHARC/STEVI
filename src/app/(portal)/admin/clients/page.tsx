import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { getOnboardingStatusForPeople, type OnboardingStatus } from '@/lib/onboarding/status';

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

export const dynamic = 'force-dynamic';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filterParam = resolvedSearchParams?.filter;
  const statusFilter = Array.isArray(filterParam) ? filterParam[0] : filterParam ?? 'all';

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/admin/clients');
  if (!access.canManageConsents) redirect(resolveLandingPath(access));

  const core = supabase.schema('core');
  const { data, error } = await core.rpc('get_people_list_with_types', {
    p_page: 1,
    p_page_size: 50,
    p_person_types: null,
    p_status: null,
  });

  if (error) {
    throw error;
  }

  const people = (data ?? []) as PeopleListItem[];
  const onboardingByPerson = await getOnboardingStatusForPeople(
    people.map((person) => person.id),
    supabase,
  );

  const peopleWithStatus = people.map((person) => ({
    ...person,
    onboarding: onboardingByPerson[person.id],
  }));

  const statusCounts = peopleWithStatus.reduce(
    (acc, person) => {
      const status = person.onboarding?.status ?? 'NOT_STARTED';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    { COMPLETED: 0, NEEDS_CONSENTS: 0, NOT_STARTED: 0 } as Record<string, number>,
  );

  const filteredPeople = peopleWithStatus.filter((person) => {
    if (!statusFilter || statusFilter === 'all') return true;
    if (statusFilter === 'incomplete') return person.onboarding?.status !== 'COMPLETED';
    if (statusFilter === 'needs-consents') return person.onboarding?.status === 'NEEDS_CONSENTS';
    if (statusFilter === 'not-started') return person.onboarding?.status === 'NOT_STARTED';
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Clients</p>
        <h1 className="text-xl text-foreground sm:text-2xl">Client directory</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          RLS-limited view of people records. Use consent overrides to align sharing with client wishes.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">Onboarded: {statusCounts.COMPLETED}</Badge>
          <Badge variant="secondary">Needs consents: {statusCounts.NEEDS_CONSENTS}</Badge>
          <Badge variant="outline">Not started: {statusCounts.NOT_STARTED}</Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm">
            <Link href="/admin/clients">All</Link>
          </Button>
          <Button asChild variant={statusFilter === 'incomplete' ? 'default' : 'outline'} size="sm">
            <Link href="/admin/clients?filter=incomplete">Needs onboarding</Link>
          </Button>
          <Button asChild variant={statusFilter === 'needs-consents' ? 'default' : 'outline'} size="sm">
            <Link href="/admin/clients?filter=needs-consents">Missing consents</Link>
          </Button>
          <Button asChild variant={statusFilter === 'not-started' ? 'default' : 'outline'} size="sm">
            <Link href="/admin/clients?filter=not-started">Not started</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPeople.map((person) => (
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
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-foreground/80">
              <p>Email: {person.email ?? '—'}</p>
              <p>Phone: {person.phone ?? '—'}</p>
              <p>Data sharing: {person.data_sharing_consent ? 'Yes' : 'No'}</p>
              <p className="text-muted-foreground">{describeOnboarding(person.onboarding)}</p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={`/admin/clients/${person.id}`}>Open details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {filteredPeople.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No clients visible</CardTitle>
              <CardDescription>Adjust RLS or try a different onboarding filter if you expect results.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
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
