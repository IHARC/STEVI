import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type {
  ObservationCategory,
  ObservationLeadStatus,
  ObservationPromotion,
  ObservationPromotionRow,
  ObservationSummary,
  ObservationTaskSummary,
  ObservationRow,
} from '@/lib/observations/types';
import type { TaskRow } from '@/lib/tasks/types';
import type { Database } from '@/types/supabase';

const CASE_SCHEMA = 'case_mgmt';
const OBSERVATIONS_TABLE = 'observations';
const PROMOTIONS_TABLE = 'observation_promotions';
const TASKS_TABLE = 'tasks';
const CORE_SCHEMA = 'core';
const PEOPLE_TABLE = 'people';

type OrgRow = { name?: string | null };
type PersonNameRow = Pick<Database['core']['Tables']['people']['Row'], 'id' | 'first_name' | 'last_name'>;

function resolvePersonName(person: PersonNameRow | undefined, personId: number): string {
  const nameParts = [person?.first_name ?? '', person?.last_name ?? ''].filter(Boolean);
  return nameParts.join(' ').trim() || `Person ${personId}`;
}

async function fetchPeopleByIds(
  supabase: SupabaseAnyServerClient,
  personIds: number[],
): Promise<Map<number, PersonNameRow>> {
  if (personIds.length === 0) return new Map();

  const { data, error } = await supabase
    .schema(CORE_SCHEMA)
    .from(PEOPLE_TABLE)
    .select('id, first_name, last_name')
    .in('id', personIds)
    .limit(personIds.length);

  if (error) {
    console.error('Failed to load people for observations', { personIds, error });
    throw new Error('Unable to load observation data right now.');
  }

  const byId = new Map<number, PersonNameRow>();
  const rows = (data ?? []) as PersonNameRow[];
  rows.forEach((person) => {
    byId.set(person.id, person);
  });
  return byId;
}

function toObservationSummary(
  row: ObservationRow & { organizations?: OrgRow },
  subjectNameOverride?: string | null,
): ObservationSummary {
  return {
    id: row.id,
    personId: row.person_id ?? null,
    caseId: row.case_id ?? null,
    encounterId: row.encounter_id ?? null,
    owningOrgId: row.owning_org_id,
    category: row.category,
    summary: row.summary,
    details: row.details ?? null,
    subjectType: row.subject_type,
    subjectPersonId: row.subject_person_id ?? null,
    subjectName: row.subject_name ?? subjectNameOverride ?? null,
    subjectDescription: row.subject_description ?? null,
    lastSeenAt: row.last_seen_at ?? null,
    lastSeenLocation: row.last_seen_location ?? null,
    reporterPersonId: row.reporter_person_id ?? null,
    leadStatus: row.lead_status ?? null,
    leadExpiresAt: row.lead_expires_at ?? null,
    source: row.source,
    verificationStatus: row.verification_status,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
    recordedAt: row.recorded_at,
    createdByOrg: row.organizations?.name ?? null,
  };
}

export async function fetchObservationsForEncounter(
  supabase: SupabaseAnyServerClient,
  encounterId: string,
  limit = 50,
): Promise<ObservationSummary[]> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(OBSERVATIONS_TABLE)
    .select(
      'id, person_id, case_id, encounter_id, owning_org_id, category, summary, details, subject_type, subject_person_id, subject_name, subject_description, last_seen_at, last_seen_location, reporter_person_id, lead_status, lead_expires_at, source, verification_status, visibility_scope, sensitivity_level, recorded_at, organizations(name)',
    )
    .eq('encounter_id', encounterId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load encounter observations', { encounterId, error });
    throw new Error('Unable to load observations right now.');
  }

  const rows = (data ?? []) as Array<ObservationRow & { organizations?: OrgRow }>;
  const subjectIds = rows
    .filter((row) => row.subject_type === 'known_person' && row.subject_person_id && !row.subject_name)
    .map((row) => row.subject_person_id as number);
  const uniqueSubjectIds = Array.from(new Set(subjectIds));
  const peopleById = await fetchPeopleByIds(supabase, uniqueSubjectIds);

  return rows.map((row) =>
    toObservationSummary(
      row,
      row.subject_person_id ? resolvePersonName(peopleById.get(row.subject_person_id), row.subject_person_id) : null,
    ),
  );
}

export async function fetchObservationLeadsForOrg(
  supabase: SupabaseAnyServerClient,
  owningOrgId: number,
  {
    statuses = ['open', 'in_progress'],
    limit = 200,
  }: { statuses?: ObservationLeadStatus[]; limit?: number } = {},
): Promise<ObservationSummary[]> {
  const statusFilter = statuses.filter(Boolean) as string[];
  const query = supabase
    .schema(CASE_SCHEMA)
    .from(OBSERVATIONS_TABLE)
    .select(
      'id, person_id, case_id, encounter_id, owning_org_id, category, summary, details, subject_type, subject_person_id, subject_name, subject_description, last_seen_at, last_seen_location, reporter_person_id, lead_status, lead_expires_at, source, verification_status, visibility_scope, sensitivity_level, recorded_at, organizations(name)',
    )
    .eq('owning_org_id', owningOrgId)
    .in('subject_type', ['named_unlinked', 'unidentified'])
    .order('recorded_at', { ascending: false })
    .limit(limit);

  const { data, error } = statusFilter.length ? await query.in('lead_status', statusFilter) : await query;

  if (error) {
    console.error('Failed to load observation leads', { owningOrgId, error });
    throw new Error('Unable to load observation leads right now.');
  }

  return (data ?? []).map((row: ObservationRow & { organizations?: OrgRow }) => toObservationSummary(row));
}

export async function fetchObservationPromotions(
  supabase: SupabaseAnyServerClient,
  observationIds: string[],
): Promise<Map<string, ObservationPromotion[]>> {
  if (observationIds.length === 0) return new Map();

  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(PROMOTIONS_TABLE)
    .select('id, observation_id, promotion_type, target_id, target_label, created_at')
    .in('observation_id', observationIds);

  if (error) {
    console.error('Failed to load observation promotions', { observationIds, error });
    throw new Error('Unable to load observation promotions right now.');
  }

  const byObservation = new Map<string, ObservationPromotion[]>();
  const rows = (data ?? []) as ObservationPromotionRow[];
  rows.forEach((row) => {
    const promotion: ObservationPromotion = {
      id: row.id,
      promotionType: row.promotion_type,
      targetId: row.target_id,
      targetLabel: row.target_label ?? null,
      createdAt: row.created_at,
    };
    const existing = byObservation.get(row.observation_id) ?? [];
    existing.push(promotion);
    byObservation.set(row.observation_id, existing);
  });

  return byObservation;
}

export async function fetchOverdueWelfareObservationTasks(
  supabase: SupabaseAnyServerClient,
  owningOrgId: number,
  limit = 50,
): Promise<ObservationTaskSummary[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(TASKS_TABLE)
    .select('id, person_id, encounter_id, status, priority, due_at, title, source_type, source_id')
    .eq('owning_org_id', owningOrgId)
    .in('status', ['open', 'in_progress', 'blocked'])
    .not('due_at', 'is', null)
    .lt('due_at', now)
    .eq('source_type', 'observation')
    .order('due_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to load overdue observation tasks', { owningOrgId, error });
    throw new Error('Unable to load observation tasks right now.');
  }

  const tasks = (data ?? []) as TaskRow[];
  const observationIds = tasks.map((task) => task.source_id).filter((id): id is string => Boolean(id));
  if (observationIds.length === 0) return [];

  const { data: observationRows, error: observationError } = await supabase
    .schema(CASE_SCHEMA)
    .from(OBSERVATIONS_TABLE)
    .select('id, category')
    .in('id', observationIds);

  if (observationError) {
    console.error('Failed to load observation categories for tasks', { owningOrgId, observationError });
    throw new Error('Unable to load observation tasks right now.');
  }

  const categoryByObservation = new Map<string, ObservationCategory>();
  const observationCategoryRows = (observationRows ?? []) as Array<Pick<ObservationRow, 'id' | 'category'>>;
  observationCategoryRows.forEach((row) => {
    categoryByObservation.set(row.id, row.category);
  });

  const welfareTasks = tasks.filter((task) => {
    const category = task.source_id ? categoryByObservation.get(task.source_id) : null;
    return category === 'welfare_check';
  });

  if (welfareTasks.length === 0) return [];

  const personIds = Array.from(new Set(welfareTasks.map((task) => task.person_id)));
  const peopleById = await fetchPeopleByIds(supabase, personIds);

  return welfareTasks.map((task) => ({
    id: task.id,
    personId: task.person_id,
    clientName: resolvePersonName(peopleById.get(task.person_id), task.person_id),
    title: task.title,
    dueAt: task.due_at ?? null,
    status: task.status,
    priority: task.priority,
    observationId: task.source_id ?? null,
    encounterId: task.encounter_id ?? null,
  }));
}

export function buildLeadDuplicateMap(
  leads: ObservationSummary[],
): Map<string, ObservationSummary[]> {
  const normalized = (value: string | null) =>
    (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const byKey = new Map<string, ObservationSummary[]>();

  leads.forEach((lead) => {
    const base =
      lead.subjectType === 'named_unlinked'
        ? normalized(lead.subjectName)
        : normalized(lead.subjectDescription);

    if (!base || base.length < 6) return;
    const location = normalized(lead.lastSeenLocation);
    const key = `${base.slice(0, 60)}::${location.slice(0, 40)}`;
    const entries = byKey.get(key) ?? [];
    entries.push(lead);
    byKey.set(key, entries);
  });

  const duplicates = new Map<string, ObservationSummary[]>();
  byKey.forEach((entries, _key) => {
    if (entries.length > 1) {
      entries.forEach((lead) => {
        duplicates.set(lead.id, entries.filter((item) => item.id !== lead.id));
      });
    }
  });

  return duplicates;
}
