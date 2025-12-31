import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchStaffTimelineEvents } from '@/lib/cases/fetchers';
import {
  fetchCostCategories,
  fetchPersonCostEvents,
  fetchPersonCostRollups,
  fetchServiceCatalog,
  fetchStaffRates,
  type CostEventWithCategory,
} from '@/lib/costs/queries';
import { normalizeEnumParam, toSearchParams } from '@/lib/search-params';
import { getEffectiveConsent } from '@/lib/consents';
import { fetchMedicalEpisodesForPerson } from '@/lib/medical/queries';
import { fetchJusticeEpisodesForPerson } from '@/lib/justice/queries';
import { fetchRelationshipsForPerson } from '@/lib/relationships/queries';
import { fetchCharacteristicsForPerson } from '@/lib/characteristics/queries';
import { filterTimelineEvent, TIMELINE_FILTERS, type TimelineFilterId } from '@/lib/timeline/filters';
import type { TimelineEvent } from '@/lib/timeline/types';
import { PageHeader } from '@shared/layout/page-header';
import { PageTabNav, type PageTab } from '@shared/layout/page-tab-nav';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Separator } from '@shared/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { CostSnapshotCard } from '@workspace/costs/cost-snapshot-card';
import { CostTimelineTable } from '@workspace/costs/cost-timeline-table';
import { OutreachQuickLogCard } from '@workspace/staff/outreach-quick-log-card';
import { MedicalEpisodesCard } from '@workspace/client-record/medical-episodes-card';
import { JusticeEpisodesCard } from '@workspace/client-record/justice-episodes-card';
import { RelationshipsCard } from '@workspace/client-record/relationships-card';
import { CharacteristicsCard } from '@workspace/client-record/characteristics-card';
import type { Database } from '@/types/supabase';

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

type PersonRow = Pick<
  Database['core']['Tables']['people']['Row'],
  'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'created_at' | 'created_by'
>;
type PersonCostRollupRow = Database['analytics']['Views']['person_cost_rollups_secure']['Row'];
type CostCategoryRow = Database['core']['Tables']['cost_categories']['Row'];
type ServiceCatalogRow = Database['core']['Tables']['service_catalog']['Row'];
type StaffRateRow = Database['core']['Tables']['staff_rates']['Row'];

const VIEWS = ['directory', 'costs'] as const;

export default async function OpsClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const filterParam = searchParams ? await searchParams : undefined;
  const filterValue = filterParam?.filter;
  const activeFilter: TimelineFilterId = TIMELINE_FILTERS.includes(
    (Array.isArray(filterValue) ? filterValue[0] : filterValue) as TimelineFilterId,
  )
    ? ((Array.isArray(filterValue) ? filterValue[0] : filterValue) as TimelineFilterId)
    : 'all';
  const canonicalParams = toSearchParams(filterParam);
  const caseParam = canonicalParams.get('case');
  const caseIdFromQuery = caseParam && /^\d+$/.test(caseParam) ? Number.parseInt(caseParam, 10) : null;
  const { value: activeView, redirected } = normalizeEnumParam(canonicalParams, 'view', VIEWS, 'directory');
  if (redirected) {
    redirect(`/ops/clients/${id}?${canonicalParams.toString()}`);
  }

  const personId = Number.parseInt(id, 10);
  if (!personId || Number.isNaN(personId)) notFound();

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/auth/start?next=${encodeURIComponent(`/ops/clients/${id}?view=directory`)}`);
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin && !access.canManageConsents) {
    redirect(resolveLandingPath(access));
  }

  if (activeView === 'costs' && !access.canViewCosts) {
    redirect(`/ops/clients/${personId}?view=directory`);
  }

  const canLogOutreach = access.canAccessOpsFrontline;
  const showCostInputs = access.canManageCosts && Boolean(access.organizationId);
  const shouldLoadCosts = activeView === 'costs' && access.canViewCosts;

  const shouldLoadTimeline = activeView !== 'costs';

  const [
    person,
    timelineEvents,
    consentSummary,
    costRollups,
    costEvents,
    costCategories,
    serviceCatalog,
    staffRates,
    medicalEpisodes,
    justiceEpisodes,
    relationships,
    characteristics,
  ] = await Promise.all([
    loadPerson(supabase, personId),
    shouldLoadTimeline ? fetchStaffTimelineEvents(supabase, personId, 120) : Promise.resolve([]),
    getEffectiveConsent(supabase, personId),
    shouldLoadCosts ? fetchPersonCostRollups(supabase, personId) : Promise.resolve(null),
    shouldLoadCosts ? fetchPersonCostEvents(supabase, personId, 120) : Promise.resolve(null),
    showCostInputs ? fetchCostCategories(supabase) : Promise.resolve([]),
    showCostInputs ? fetchServiceCatalog(supabase) : Promise.resolve([]),
    showCostInputs && access.organizationId ? fetchStaffRates(supabase, access.organizationId) : Promise.resolve([]),
    shouldLoadTimeline ? fetchMedicalEpisodesForPerson(supabase, personId, 12) : Promise.resolve([]),
    shouldLoadTimeline ? fetchJusticeEpisodesForPerson(supabase, personId, 12) : Promise.resolve([]),
    shouldLoadTimeline ? fetchRelationshipsForPerson(supabase, personId, 12) : Promise.resolve([]),
    shouldLoadTimeline ? fetchCharacteristicsForPerson(supabase, personId, 12) : Promise.resolve([]),
  ]);

  if (!person) notFound();

  const orgLabel = access.organizationName ?? 'Unassigned org';
  const orgMissing = !access.organizationId && (access.canAccessOpsFrontline || access.canAccessOpsAdmin);
  const encounterParams = new URLSearchParams();
  encounterParams.set('personId', String(person.id));
  if (caseIdFromQuery) encounterParams.set('caseId', String(caseIdFromQuery));
  const newEncounterHref = `/ops/encounters/new?${encounterParams.toString()}`;
  const costRollupRows = (costRollups ?? []) as PersonCostRollupRow[];
  const costEventRows = (costEvents ?? []) as CostEventWithCategory[];
  const staffRoleOptions = Array.from(
    new Set((staffRates as StaffRateRow[]).map((rate) => rate.role_name).filter(Boolean)),
  );

  const filteredEvents =
    activeView === 'costs'
      ? []
      : timelineEvents.filter((event) => filterTimelineEvent(event, activeFilter));
  const consentMeta = buildConsentMeta(consentSummary);
  const costTotals = costRollupRows.reduce(
    (acc, row) => {
      acc.total += Number(row.total_cost ?? 0);
      acc.cost30 += Number(row.cost_30d ?? 0);
      acc.cost90 += Number(row.cost_90d ?? 0);
      acc.cost365 += Number(row.cost_365d ?? 0);
      return acc;
    },
    { total: 0, cost30: 0, cost90: 0, cost365: 0 },
  );
  const journeyParams = new URLSearchParams(canonicalParams);
  journeyParams.set('view', 'directory');
  journeyParams.set('filter', activeFilter);
  const costParams = new URLSearchParams(canonicalParams);
  costParams.set('view', 'costs');
  costParams.delete('filter');

  const viewTabs: PageTab[] = [
    {
      label: 'Journey',
      href: `/ops/clients/${person.id}?${journeyParams.toString()}`,
    },
  ];
  if (access.canViewCosts) {
    viewTabs.push({
      label: 'Costs',
      href: `/ops/clients/${person.id}?${costParams.toString()}`,
    });
  }
  const activeViewHref =
    activeView === 'costs' && access.canViewCosts
      ? `/ops/clients/${person.id}?${costParams.toString()}`
      : `/ops/clients/${person.id}?${journeyParams.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client"
        title={`${person.first_name ?? 'Person'} ${person.last_name ?? ''}`.trim() || 'Client profile'}
        description={
          activeView === 'costs'
            ? 'Cost summary reflects consented costs across organizations.'
            : 'Journey timeline shows everything that happened with this person. Start an encounter to add notes, supplies, tasks, or referrals in one place.'
        }
        primaryAction={{ label: orgMissing ? 'Select acting org to start Encounter' : 'New Encounter', href: newEncounterHref }}
        secondaryAction={{ label: 'Find another client', href: '/ops/clients?view=directory' }}
        breadcrumbs={[{ label: 'Clients', href: '/ops/clients?view=directory' }, { label: 'Profile' }]}
        meta={[{ label: `Created by ${orgLabel}`, tone: 'neutral' }, consentMeta]}
      />

      <PageTabNav tabs={viewTabs} activeHref={activeViewHref} variant="secondary" />

      <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
        {activeView === 'costs' ? (
          <div className="space-y-4">
            <CostSnapshotCard totals={costTotals} />
            <CostTimelineTable events={costEventRows} />
          </div>
        ) : (
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl">Journey timeline</CardTitle>
                <CardDescription>All encounters, tasks, referrals, supplies, and appointments tied to this person.</CardDescription>
              </div>
              <Tabs value={activeFilter} className="w-full">
                <TabsList className="h-auto w-full flex-wrap justify-end gap-1 bg-transparent p-0">
                  {TIMELINE_FILTERS.map((filter) => (
                    <TabsTrigger key={filter} value={filter} className="rounded-full border px-3 py-1 text-xs capitalize">
                      <Link href={`/ops/clients/${person.id}?filter=${filter}&view=directory`}>{labelForFilter(filter)}</Link>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline events yet. Start an encounter to log the next step.</p>
              ) : (
                filteredEvents.map((event) => (
                  <article key={event.id} className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">{event.summary ?? 'Timeline update'}</p>
                        <p className="text-sm text-muted-foreground capitalize">{formatCategory(event.eventCategory)}</p>
                        {resolveEventDetail(event) ? (
                          <p className="text-sm text-foreground/80">{resolveEventDetail(event)}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatDateTime(event.eventAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {event.createdByOrg ? <Badge variant="outline">Created by {event.createdByOrg}</Badge> : null}
                      <Badge variant={event.visibilityScope === 'shared_via_consent' ? 'secondary' : 'outline'}>
                        {event.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}
                      </Badge>
                      {event.sensitivityLevel !== 'standard' ? (
                        <Badge variant="destructive">{event.sensitivityLevel}</Badge>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick actions</CardTitle>
              <CardDescription>Keep actions inside an encounter to preserve provenance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href={newEncounterHref}>New Encounter</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={newEncounterHref}>Add referral</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={newEncounterHref}>Add note</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Supplies and referrals must be logged from an encounter.</p>
            </CardContent>
          </Card>

          {canLogOutreach ? (
            <OutreachQuickLogCard
              personId={person.id}
              orgMissing={orgMissing}
              showCostFields={showCostInputs}
              staffRoles={staffRoleOptions}
              costCategories={costCategories as CostCategoryRow[]}
              serviceCatalog={serviceCatalog as ServiceCatalogRow[]}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Contact and consent context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/80">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Contact</p>
                <p>Email: {person.email ?? '—'}</p>
                <p>Phone: {person.phone ?? '—'}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Sharing</p>
                <p className="text-muted-foreground">{consentMeta.label}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {activeView === 'costs' ? null : (
        <section className="grid gap-4 lg:grid-cols-2">
          <MedicalEpisodesCard personId={person.id} caseId={caseIdFromQuery} episodes={medicalEpisodes} />
          <JusticeEpisodesCard personId={person.id} caseId={caseIdFromQuery} episodes={justiceEpisodes} />
          <RelationshipsCard personId={person.id} caseId={caseIdFromQuery} relationships={relationships} />
          <CharacteristicsCard personId={person.id} caseId={caseIdFromQuery} characteristics={characteristics} />
        </section>
      )}
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
    .select('id, first_name, last_name, email, phone, created_at, created_by')
    .eq('id', personId)
    .maybeSingle();

  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}

function resolveEventDetail(event: TimelineEvent): string | null {
  const meta = event.metadata ?? {};
  const candidates = [meta.description, meta.notes, meta.message, meta.summary];
  for (const entry of candidates) {
    if (typeof entry === 'string' && entry.trim().length > 0) return entry;
  }
  return null;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Unknown date';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function labelForFilter(filter: TimelineFilterId) {
  switch (filter) {
    case 'encounters':
      return 'Encounters';
    case 'client_updates':
      return 'Client updates';
    default:
      return filter.replaceAll('_', ' ');
  }
}

function formatCategory(category: string) {
  return category.replaceAll('_', ' ');
}

function buildConsentMeta(consent: Awaited<ReturnType<typeof getEffectiveConsent>>) {
  if (!consent.consent || !consent.effectiveStatus) {
    return { label: 'Consent not recorded', tone: 'warning' as const };
  }

  if (consent.effectiveStatus === 'expired') {
    return { label: 'Consent expired', tone: 'warning' as const };
  }

  if (consent.effectiveStatus === 'revoked') {
    return { label: 'Consent revoked', tone: 'warning' as const };
  }

  if (consent.scope === 'all_orgs') {
    return { label: 'Sharing: all partner orgs', tone: 'info' as const };
  }

  if (consent.scope === 'selected_orgs') {
    return { label: 'Sharing: selected orgs', tone: 'info' as const };
  }

  return { label: 'Sharing: IHARC only', tone: 'neutral' as const };
}
