import { filterTimelineEvent, TIMELINE_FILTERS, type TimelineFilterId } from '@/lib/timeline/filters';
import type { TimelineEvent } from '@/lib/timeline/types';
import { resolveConsentOrgSelections, type ConsentOrgSelection } from '@/lib/consents';
import { formatTimelineFilterLabel } from '@/lib/formatters/timeline';
import type { ClientDetailContext, ClientDetailTab } from './loaders';

export type ConsentMeta = {
  label: string;
  tone: 'warning' | 'info' | 'neutral';
};

export type ClientTabLink = {
  label: string;
  href: string;
};

export type TimelineFilterLink = {
  id: TimelineFilterId;
  label: string;
  href: string;
};

export type ClientDetailViewModel = {
  personDisplayName: string;
  tabs: ClientTabLink[];
  activeTabHref: string;
  timelineHref: string | null;
  activeTab: ClientDetailTab;
  timelineFilters: TimelineFilterLink[];
  activeFilter: TimelineFilterId;
  isOverview: boolean;
  isTimeline: boolean;
  isMedical: boolean;
  isJustice: boolean;
  isRelationships: boolean;
  isCharacteristics: boolean;
  isConsents: boolean;
  isCosts: boolean;
  recentEvents: TimelineEvent[];
  filteredEvents: TimelineEvent[];
  consentMeta: ConsentMeta;
  consentSelections: ConsentOrgSelection[];
  orgLabel: string;
  orgMissing: boolean;
  newEncounterHref: string;
  staffRoleOptions: string[];
  costTotals: { total: number; cost30: number; cost90: number; cost365: number };
  showCostInputs: boolean;
  canLogOutreach: boolean;
  canEditRecord: boolean;
  caseIdFromQuery: number | null;
};

const TAB_LABELS: Record<ClientDetailTab, string> = {
  overview: 'Overview',
  timeline: 'Timeline',
  medical: 'Medical',
  justice: 'Justice',
  relationships: 'Relationships',
  characteristics: 'Characteristics',
  consents: 'Consents',
  costs: 'Costs',
};

export function buildClientDetailViewModel(context: ClientDetailContext): ClientDetailViewModel {
  const { personId, caseIdFromQuery, tab, tabOptions, activeFilter, baseParams, access, data } = context;
  const { person, timelineEvents, consentSummary, costRollups, staffRates, consentOrgs, participatingOrgs } = data;

  const isOverview = tab === 'overview';
  const isTimeline = tab === 'timeline';
  const isMedical = tab === 'medical';
  const isJustice = tab === 'justice';
  const isRelationships = tab === 'relationships';
  const isCharacteristics = tab === 'characteristics';
  const isConsents = tab === 'consents';
  const isCosts = tab === 'costs';

  const tabs = tabOptions.map((tabId) => ({
    label: TAB_LABELS[tabId],
    href: buildTabHref(personId, baseParams, tabId),
  }));
  const activeTabHref = buildTabHref(personId, baseParams, tab);
  const timelineHref = tabOptions.includes('timeline') ? buildTabHref(personId, baseParams, 'timeline') : null;

  const timelineFilters: TimelineFilterLink[] = isTimeline
    ? TIMELINE_FILTERS.map((filter) => ({
        id: filter,
        label: formatTimelineFilterLabel(filter),
        href: buildTimelineFilterHref(personId, baseParams, filter),
      }))
    : [];

  const recentEvents = timelineEvents.slice(0, 6);
  const filteredEvents = isTimeline ? timelineEvents.filter((event) => filterTimelineEvent(event, activeFilter)) : [];

  const consentMeta = buildConsentMeta(consentSummary);
  const consentSelections = isConsents
    ? resolveConsentOrgSelections(consentSummary.scope ?? null, participatingOrgs, consentOrgs).selections
    : [];

  const staffRoleOptions = Array.from(new Set(staffRates.map((rate) => rate.role_name).filter(Boolean)));
  const costTotals = (costRollups ?? []).reduce(
    (acc, row) => {
      acc.total += Number(row.total_cost ?? 0);
      acc.cost30 += Number(row.cost_30d ?? 0);
      acc.cost90 += Number(row.cost_90d ?? 0);
      acc.cost365 += Number(row.cost_365d ?? 0);
      return acc;
    },
    { total: 0, cost30: 0, cost90: 0, cost365: 0 },
  );

  const encounterParams = new URLSearchParams();
  encounterParams.set('personId', String(personId));
  if (caseIdFromQuery) encounterParams.set('caseId', String(caseIdFromQuery));
  const newEncounterHref = `/ops/encounters/new?${encounterParams.toString()}`;

  const personName = `${person?.first_name ?? 'Person'} ${person?.last_name ?? ''}`.trim() || 'Client profile';

  return {
    personDisplayName: personName,
    tabs,
    activeTabHref,
    timelineHref,
    activeTab: tab,
    timelineFilters,
    activeFilter,
    isOverview,
    isTimeline,
    isMedical,
    isJustice,
    isRelationships,
    isCharacteristics,
    isConsents,
    isCosts,
    recentEvents,
    filteredEvents,
    consentMeta,
    consentSelections,
    orgLabel: access.orgLabel,
    orgMissing: access.orgMissing,
    newEncounterHref,
    staffRoleOptions,
    costTotals,
    showCostInputs: access.showCostInputs,
    canLogOutreach: access.canLogOutreach,
    canEditRecord: access.canEditRecord,
    caseIdFromQuery,
  };
}

export function resolveTimelineEventDetail(event: TimelineEvent): string | null {
  const meta = event.metadata ?? {};
  const candidates = [meta.description, meta.notes, meta.message, meta.summary, meta.subject_description, meta.last_seen_location];
  for (const entry of candidates) {
    if (typeof entry === 'string' && entry.trim().length > 0) return entry;
  }
  return null;
}

export function buildConsentMeta(consent: ClientDetailContext['data']['consentSummary']): ConsentMeta {
  if (!consent.consent || !consent.effectiveStatus) {
    return { label: 'Consent not recorded', tone: 'warning' };
  }

  if (consent.effectiveStatus === 'expired') {
    return { label: 'Consent expired', tone: 'warning' };
  }

  if (consent.effectiveStatus === 'revoked') {
    return { label: 'Consent revoked', tone: 'warning' };
  }

  if (consent.scope === 'all_orgs') {
    return { label: 'Sharing: all partner orgs', tone: 'info' };
  }

  if (consent.scope === 'selected_orgs') {
    return { label: 'Sharing: selected orgs', tone: 'info' };
  }

  return { label: 'Sharing: IHARC only', tone: 'neutral' };
}

function buildTabHref(personId: number, baseParams: URLSearchParams, tabId: ClientDetailTab): string {
  const params = new URLSearchParams(baseParams);
  params.set('tab', tabId);
  if (tabId !== 'timeline') {
    params.delete('filter');
  }
  return `/ops/clients/${personId}?${params.toString()}`;
}

function buildTimelineFilterHref(personId: number, baseParams: URLSearchParams, filter: TimelineFilterId): string {
  const params = new URLSearchParams(baseParams);
  params.set('tab', 'timeline');
  params.set('filter', filter);
  return `/ops/clients/${personId}?${params.toString()}`;
}
