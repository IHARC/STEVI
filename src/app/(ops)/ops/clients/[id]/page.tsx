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
import { getEffectiveConsent, listConsentOrgs, listParticipatingOrganizations, resolveConsentOrgSelections } from '@/lib/consents';
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
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@shared/ui/tabs';
import { CostSnapshotCard } from '@workspace/costs/cost-snapshot-card';
import { CostTimelineTable } from '@workspace/costs/cost-timeline-table';
import { OutreachQuickLogCard } from '@workspace/staff/outreach-quick-log-card';
import { MedicalEpisodesCard } from '@workspace/client-record/medical-episodes-card';
import { JusticeEpisodesCard } from '@workspace/client-record/justice-episodes-card';
import { RelationshipsCard } from '@workspace/client-record/relationships-card';
import { CharacteristicsCard } from '@workspace/client-record/characteristics-card';
import { IdentityCard } from '@workspace/client-record/identity-card';
import { SituationCard } from '@workspace/client-record/situation-card';
import { ProfileCard } from '@workspace/client-record/profile-card';
import type { ClientAliasSummary, ClientIntakeSummary, ClientPersonSummary } from '@/lib/client-record/types';
import type { Database } from '@/types/supabase';
import { ChevronDown } from 'lucide-react';

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = 'force-dynamic';

type PersonRow = ClientPersonSummary;
type PersonCostRollupRow = Database['analytics']['Views']['person_cost_rollups_secure']['Row'];
type CostCategoryRow = Database['core']['Tables']['cost_categories']['Row'];
type ServiceCatalogRow = Database['core']['Tables']['service_catalog']['Row'];
type StaffRateRow = Database['core']['Tables']['staff_rates']['Row'];
type PersonAliasRow = ClientAliasSummary;
type IntakeRow = ClientIntakeSummary;

const TAB_IDS = ['overview', 'timeline', 'medical', 'justice', 'relationships', 'characteristics', 'consents', 'costs'] as const;
const CORE_TAB_IDS = ['overview', 'timeline', 'medical', 'justice', 'relationships', 'characteristics', 'consents'] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  timeline: 'Timeline',
  medical: 'Medical',
  justice: 'Justice',
  relationships: 'Relationships',
  characteristics: 'Characteristics',
  consents: 'Consents',
  costs: 'Costs',
};


export default async function OpsClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const filterParam = searchParams ? await searchParams : undefined;
  const canonicalParams = toSearchParams(filterParam);
  canonicalParams.delete('view');
  const caseParam = canonicalParams.get('case');
  const caseIdFromQuery = caseParam && /^\d+$/.test(caseParam) ? Number.parseInt(caseParam, 10) : null;

  const personId = Number.parseInt(id, 10);
  if (!personId || Number.isNaN(personId)) notFound();

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/auth/start?next=${encodeURIComponent(`/ops/clients/${id}?tab=overview`)}`);
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsAdmin && !access.canManageConsents) {
    redirect(resolveLandingPath(access));
  }

  const tabOptions = access.canViewCosts ? TAB_IDS : CORE_TAB_IDS;
  const { value: activeTab, redirected } = normalizeEnumParam(canonicalParams, 'tab', tabOptions, 'overview');
  if (redirected) {
    redirect(`/ops/clients/${id}?${canonicalParams.toString()}`);
  }
  const filterValue = canonicalParams.get('filter');
  const activeFilter: TimelineFilterId = TIMELINE_FILTERS.includes(filterValue as TimelineFilterId)
    ? (filterValue as TimelineFilterId)
    : 'all';

  const canLogOutreach = access.canAccessOpsFrontline;
  const showCostInputs = access.canManageCosts && Boolean(access.organizationId);
  const canEditRecord = (access.canAccessOpsFrontline || access.canAccessOpsAdmin) && Boolean(access.organizationId);
  const isOverview = activeTab === 'overview';
  const isTimeline = activeTab === 'timeline';
  const isMedical = activeTab === 'medical';
  const isJustice = activeTab === 'justice';
  const isRelationships = activeTab === 'relationships';
  const isCharacteristics = activeTab === 'characteristics';
  const isConsents = activeTab === 'consents';
  const isCosts = activeTab === 'costs';
  const shouldLoadTimeline = isTimeline || isOverview;
  const shouldLoadMedical = isMedical || isOverview;
  const shouldLoadJustice = isJustice || isOverview;
  const shouldLoadRelationships = isRelationships || isOverview;
  const shouldLoadCharacteristics = isCharacteristics || isOverview;
  const shouldLoadCosts = isCosts && access.canViewCosts;
  const shouldLoadConsents = isConsents;
  const shouldLoadAliases = isOverview;
  const shouldLoadIntake = isOverview;

  const previewLimit = 6;
  const timelineLimit = isTimeline ? 120 : previewLimit;
  const episodeLimit = isMedical || isJustice ? 12 : previewLimit;
  const relationshipLimit = isRelationships ? 12 : previewLimit;
  const characteristicsLimit = isCharacteristics ? 12 : previewLimit;

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
    aliases,
    latestIntake,
  ] = await Promise.all([
    loadPerson(supabase, personId),
    shouldLoadTimeline ? fetchStaffTimelineEvents(supabase, personId, timelineLimit) : Promise.resolve([]),
    getEffectiveConsent(supabase, personId),
    shouldLoadCosts ? fetchPersonCostRollups(supabase, personId) : Promise.resolve(null),
    shouldLoadCosts ? fetchPersonCostEvents(supabase, personId, 120) : Promise.resolve(null),
    showCostInputs ? fetchCostCategories(supabase) : Promise.resolve([]),
    showCostInputs ? fetchServiceCatalog(supabase) : Promise.resolve([]),
    showCostInputs && access.organizationId ? fetchStaffRates(supabase, access.organizationId) : Promise.resolve([]),
    shouldLoadMedical ? fetchMedicalEpisodesForPerson(supabase, personId, episodeLimit) : Promise.resolve([]),
    shouldLoadJustice ? fetchJusticeEpisodesForPerson(supabase, personId, episodeLimit) : Promise.resolve([]),
    shouldLoadRelationships ? fetchRelationshipsForPerson(supabase, personId, relationshipLimit) : Promise.resolve([]),
    shouldLoadCharacteristics ? fetchCharacteristicsForPerson(supabase, personId, characteristicsLimit) : Promise.resolve([]),
    shouldLoadAliases ? loadAliases(supabase, personId) : Promise.resolve([]),
    shouldLoadIntake ? loadLatestIntake(supabase, personId) : Promise.resolve(null),
  ]);

  if (!person) notFound();

  const [consentOrgs, participatingOrgs] = shouldLoadConsents
    ? await Promise.all([
        consentSummary.consent ? listConsentOrgs(supabase, consentSummary.consent.id) : Promise.resolve([]),
        listParticipatingOrganizations(supabase),
      ])
    : [[], []];

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

  const filteredEvents = isTimeline ? timelineEvents.filter((event) => filterTimelineEvent(event, activeFilter)) : [];
  const consentMeta = buildConsentMeta(consentSummary);
  const consentSelections = shouldLoadConsents
    ? resolveConsentOrgSelections(consentSummary.scope ?? null, participatingOrgs, consentOrgs).selections
    : [];
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
  const baseParams = new URLSearchParams(canonicalParams);
  const buildTabHref = (tab: TabId) => {
    const params = new URLSearchParams(baseParams);
    params.set('tab', tab);
    if (tab !== 'timeline') {
      params.delete('filter');
    }
    return `/ops/clients/${person.id}?${params.toString()}`;
  };

  const tabs: PageTab[] = tabOptions.map((tab) => ({
    label: TAB_LABELS[tab],
    href: buildTabHref(tab as TabId),
  }));
  const activeTabHref = buildTabHref(activeTab as TabId);
  const recentEvents = timelineEvents.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${person.first_name ?? 'Person'} ${person.last_name ?? ''}`.trim() || 'Client profile'}
        density="compact"
        primaryAction={{ label: orgMissing ? 'Select acting org to start Encounter' : 'New Encounter', href: newEncounterHref }}
        breadcrumbs={[{ label: 'Clients', href: '/ops/clients?view=directory' }, { label: 'Profile' }]}
        titleAddon={
          <Alert className="w-full border-primary/20 bg-primary/5 px-3 py-2 text-xs shadow-sm sm:w-auto">
            <AlertTitle className="mb-0 text-xs font-semibold uppercase tracking-wide text-primary">
              Active alerts
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">None reported</AlertDescription>
          </Alert>
        }
      />

      <PageTabNav
        tabs={tabs}
        activeHref={activeTabHref}
        variant="primary"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Actions
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {canLogOutreach ? (
                  <OutreachQuickLogCard
                    variant="sheet"
                    trigger={
                      <DropdownMenuItem disabled={orgMissing}>
                        Log outreach
                      </DropdownMenuItem>
                    }
                    personId={person.id}
                    orgMissing={orgMissing}
                    showCostFields={showCostInputs}
                    staffRoles={staffRoleOptions}
                    costCategories={costCategories as CostCategoryRow[]}
                    serviceCatalog={serviceCatalog as ServiceCatalogRow[]}
                  />
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href={newEncounterHref}>Add note</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={newEncounterHref}>Add referral</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/ops/clients?view=directory">Find another client</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {isOverview ? (
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <IdentityCard person={person} aliases={aliases} canEdit={canEditRecord} />
            <SituationCard person={person} intake={latestIntake} canEdit={canEditRecord} />
            <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Recent activity</CardTitle>
                <CardDescription>Latest encounters, tasks, and updates tied to this person.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={buildTabHref('timeline')}>View timeline</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline events yet. Start an encounter to log the next step.</p>
              ) : (
                recentEvents.map((event) => <TimelineEventItem key={event.id} event={event} />)
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {isTimeline ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl">Journey timeline</CardTitle>
                <CardDescription>All encounters, tasks, referrals, supplies, and appointments tied to this person.</CardDescription>
              </div>
              <Tabs value={activeFilter} className="w-full">
                <TabsList className="h-auto w-full flex-wrap justify-end gap-1 bg-transparent p-0">
                  {TIMELINE_FILTERS.map((filter) => {
                    const filterParams = new URLSearchParams(baseParams);
                    filterParams.set('tab', 'timeline');
                    filterParams.set('filter', filter);
                    return (
                      <TabsTrigger key={filter} value={filter} className="rounded-full border px-3 py-1 text-xs capitalize">
                        <Link href={`/ops/clients/${person.id}?${filterParams.toString()}`}>{labelForFilter(filter)}</Link>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </CardHeader>
          <CardContent className="space-y-3">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet. Start an encounter to log the next step.</p>
            ) : (
              filteredEvents.map((event) => <TimelineEventItem key={event.id} event={event} />)
            )}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} />
          </div>
        </section>
      ) : null}

      {isMedical ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <MedicalEpisodesCard personId={person.id} caseId={caseIdFromQuery} episodes={medicalEpisodes} formVariant="sheet" canEdit={canEditRecord} />
          <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
        </section>
      ) : null}

      {isJustice ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <JusticeEpisodesCard personId={person.id} caseId={caseIdFromQuery} episodes={justiceEpisodes} formVariant="sheet" canEdit={canEditRecord} />
          <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
        </section>
      ) : null}

      {isRelationships ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <RelationshipsCard personId={person.id} caseId={caseIdFromQuery} relationships={relationships} formVariant="sheet" canEdit={canEditRecord} />
          <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
        </section>
      ) : null}

      {isCharacteristics ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <CharacteristicsCard personId={person.id} caseId={caseIdFromQuery} characteristics={characteristics} formVariant="sheet" canEdit={canEditRecord} />
          <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
        </section>
      ) : null}

      {isConsents ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Consent status</CardTitle>
                <CardDescription>Current sharing scope and consent state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={consentSummary.effectiveStatus === 'active' ? 'secondary' : 'outline'}>
                    {formatConsentStatus(consentSummary.effectiveStatus)}
                  </Badge>
                  <Badge variant="outline">{formatConsentScope(consentSummary.scope)}</Badge>
                  {consentSummary.expiresAt ? (
                    <Badge variant="outline">Expires {formatDate(consentSummary.expiresAt)}</Badge>
                  ) : null}
                </div>
                {consentSummary.consent ? (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Captured method</dt>
                      <dd className="font-medium text-foreground">{formatEnum(consentSummary.consent.capturedMethod)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Policy version</dt>
                      <dd className="font-medium text-foreground">{consentSummary.consent.policyVersion ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Attested</dt>
                      <dd className="font-medium text-foreground">
                        {consentSummary.consent.attestedByStaff ? 'Staff' : '—'} / {consentSummary.consent.attestedByClient ? 'Client' : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Last updated</dt>
                      <dd className="font-medium text-foreground">
                        {formatDate(consentSummary.consent.updatedAt ?? consentSummary.consent.createdAt)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No consent record on file.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Organization access</CardTitle>
                <CardDescription>Which participating orgs can view shared data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {consentSelections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No participating organizations found.</p>
                ) : (
                  <div className="space-y-2">
                    {consentSelections.map((org) => (
                      <div key={org.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{org.name ?? `Org ${org.id}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {org.partnershipType ?? org.organizationType ?? 'Partner org'}
                          </p>
                        </div>
                        <Badge variant={org.allowed ? 'secondary' : 'outline'}>
                          {org.allowed ? 'Shared' : 'Not shared'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
            {access.canManageConsents ? (
              <Card className="border-dashed border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg">Record consent</CardTitle>
                  <CardDescription>Capture staff-assisted consent for this client.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm">
                    <Link href={`/ops/consents/record?person=${person.id}`}>Record consent</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/70">
                <CardHeader>
                  <CardTitle className="text-lg">Consent requests</CardTitle>
                  <CardDescription>Request or review consent in Ops.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/ops/consents">Open consent requests</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ) : null}

      {isCosts ? (
        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <CostSnapshotCard totals={costTotals} />
            <CostTimelineTable events={costEventRows} />
          </div>
          <ProfileCard person={person} consentLabel={consentMeta.label} orgLabel={orgLabel} canEdit={canEditRecord} />
        </section>
      ) : null}
    </div>
  );
}

function TimelineEventItem({ event }: { event: TimelineEvent }) {
  return (
    <article className="rounded-xl border border-border/40 bg-card p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{event.summary ?? 'Timeline update'}</p>
          <p className="text-xs text-muted-foreground capitalize">{formatCategory(event.eventCategory)}</p>
          {resolveEventDetail(event) ? (
            <p className="text-xs text-foreground/80">{resolveEventDetail(event)}</p>
          ) : null}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{formatDateTime(event.eventAt)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {event.createdByOrg ? <Badge variant="outline">Created by {event.createdByOrg}</Badge> : null}
        <Badge variant={event.visibilityScope === 'shared_via_consent' ? 'secondary' : 'outline'}>
          {event.visibilityScope === 'shared_via_consent' ? 'Shared' : 'Internal'}
        </Badge>
        {event.sensitivityLevel !== 'standard' ? <Badge variant="destructive">{event.sensitivityLevel}</Badge> : null}
      </div>
    </article>
  );
}

async function loadPerson(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select(
      'id, first_name, last_name, email, phone, created_at, created_by, date_of_birth, age, gender, preferred_pronouns, preferred_contact_method, housing_status, risk_level, updated_at, updated_by',
    )
    .eq('id', personId)
    .maybeSingle();

  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}

async function loadLatestIntake(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<IntakeRow | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('client_intakes')
    .select('id, housing_status, risk_level, health_concerns, immediate_needs, risk_factors, intake_date, created_at, situation_notes, general_notes')
    .eq('person_id', personId)
    .order('intake_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as IntakeRow | null) ?? null;
}

async function loadAliases(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<PersonAliasRow[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('people_aliases')
    .select('id, alias_name, is_active, created_at, updated_at, deactivated_at')
    .eq('person_id', personId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as PersonAliasRow[] | null) ?? [];
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

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value ?? '—';
  }
}

function formatEnum(value: string) {
  const normalized = value.replaceAll('_', ' ');
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
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

function formatConsentStatus(status: Awaited<ReturnType<typeof getEffectiveConsent>>['effectiveStatus']) {
  if (!status) return 'Not recorded';
  if (status === 'active') return 'Active';
  if (status === 'expired') return 'Expired';
  if (status === 'revoked') return 'Revoked';
  return formatEnum(status);
}

function formatConsentScope(scope: Awaited<ReturnType<typeof getEffectiveConsent>>['scope']) {
  if (!scope) return 'No scope';
  if (scope === 'all_orgs') return 'All orgs';
  if (scope === 'selected_orgs') return 'Selected orgs';
  if (scope === 'none') return 'No sharing';
  return formatEnum(scope);
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
