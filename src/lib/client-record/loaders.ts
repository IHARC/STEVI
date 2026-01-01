import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess, type PortalAccess } from '@/lib/portal-access';
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
import { getEffectiveConsent, listConsentOrgs, listParticipatingOrganizations } from '@/lib/consents';
import { fetchMedicalEpisodesForPerson } from '@/lib/medical/queries';
import { fetchJusticeEpisodesForPerson } from '@/lib/justice/queries';
import { fetchRelationshipsForPerson } from '@/lib/relationships/queries';
import { fetchCharacteristicsForPerson } from '@/lib/characteristics/queries';
import { TIMELINE_FILTERS, type TimelineFilterId } from '@/lib/timeline/filters';
import type { TimelineEvent } from '@/lib/timeline/types';
import type { ClientAliasSummary, ClientIntakeSummary, ClientPersonSummary } from '@/lib/client-record/types';
import type { Database } from '@/types/supabase';

export const CLIENT_DETAIL_TABS = ['overview', 'timeline', 'medical', 'justice', 'relationships', 'characteristics', 'consents', 'costs'] as const;
export const CLIENT_DETAIL_CORE_TABS = ['overview', 'timeline', 'medical', 'justice', 'relationships', 'characteristics', 'consents'] as const;

export type ClientDetailTab = (typeof CLIENT_DETAIL_TABS)[number];

export type PersonCostRollupRow = Database['analytics']['Views']['person_cost_rollups_secure']['Row'];
export type CostCategoryRow = Database['core']['Tables']['cost_categories']['Row'];
export type ServiceCatalogRow = Database['core']['Tables']['service_catalog']['Row'];
export type StaffRateRow = Database['core']['Tables']['staff_rates']['Row'];

export type ClientDetailData = {
  person: ClientPersonSummary;
  timelineEvents: TimelineEvent[];
  consentSummary: Awaited<ReturnType<typeof getEffectiveConsent>>;
  costRollups: PersonCostRollupRow[] | null;
  costEvents: CostEventWithCategory[] | null;
  costCategories: CostCategoryRow[];
  serviceCatalog: ServiceCatalogRow[];
  staffRates: StaffRateRow[];
  medicalEpisodes: Awaited<ReturnType<typeof fetchMedicalEpisodesForPerson>>;
  justiceEpisodes: Awaited<ReturnType<typeof fetchJusticeEpisodesForPerson>>;
  relationships: Awaited<ReturnType<typeof fetchRelationshipsForPerson>>;
  characteristics: Awaited<ReturnType<typeof fetchCharacteristicsForPerson>>;
  aliases: ClientAliasSummary[];
  latestIntake: ClientIntakeSummary | null;
  consentOrgs: Awaited<ReturnType<typeof listConsentOrgs>>;
  participatingOrgs: Awaited<ReturnType<typeof listParticipatingOrganizations>>;
};

export type ClientDetailAccess = {
  access: PortalAccess;
  canLogOutreach: boolean;
  showCostInputs: boolean;
  canEditRecord: boolean;
  orgLabel: string;
  orgMissing: boolean;
};

export type ClientDetailContext = {
  personId: number;
  caseIdFromQuery: number | null;
  tab: ClientDetailTab;
  tabOptions: ClientDetailTab[];
  activeFilter: TimelineFilterId;
  baseParams: URLSearchParams;
  access: ClientDetailAccess;
  data: ClientDetailData;
};

export async function loadClientDetailContext({
  id,
  searchParams,
}: {
  id: string;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<ClientDetailContext> {
  const canonicalParams = toSearchParams(searchParams);
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

  const tabOptions = access.canViewCosts ? CLIENT_DETAIL_TABS : CLIENT_DETAIL_CORE_TABS;
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

  return {
    personId,
    caseIdFromQuery,
    tab: activeTab,
    tabOptions: [...tabOptions],
    activeFilter,
    baseParams: canonicalParams,
    access: {
      access,
      canLogOutreach,
      showCostInputs,
      canEditRecord,
      orgLabel: access.organizationName ?? 'Unassigned org',
      orgMissing: !access.organizationId && (access.canAccessOpsFrontline || access.canAccessOpsAdmin),
    },
    data: {
      person: person as ClientPersonSummary,
      timelineEvents,
      consentSummary,
      costRollups: (costRollups ?? null) as PersonCostRollupRow[] | null,
      costEvents: (costEvents ?? null) as CostEventWithCategory[] | null,
      costCategories: costCategories as CostCategoryRow[],
      serviceCatalog: serviceCatalog as ServiceCatalogRow[],
      staffRates: staffRates as StaffRateRow[],
      medicalEpisodes,
      justiceEpisodes,
      relationships,
      characteristics,
      aliases,
      latestIntake: latestIntake as ClientIntakeSummary | null,
      consentOrgs,
      participatingOrgs,
    },
  };
}

async function loadPerson(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<ClientPersonSummary | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select(
      'id, first_name, last_name, email, phone, created_at, created_by, date_of_birth, age, gender, preferred_pronouns, preferred_contact_method, housing_status, risk_level, updated_at, updated_by',
    )
    .eq('id', personId)
    .maybeSingle();

  if (error) throw error;
  return (data as ClientPersonSummary | null) ?? null;
}

async function loadLatestIntake(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<ClientIntakeSummary | null> {
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
  return (data as ClientIntakeSummary | null) ?? null;
}

async function loadAliases(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  personId: number,
): Promise<ClientAliasSummary[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('people_aliases')
    .select('id, alias_name, is_active, created_at, updated_at, deactivated_at')
    .eq('person_id', personId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as ClientAliasSummary[] | null) ?? [];
}
