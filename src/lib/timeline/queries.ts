import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { TimelineEvent, TimelineEventRow } from '@/lib/timeline/types';

const CORE_SCHEMA = 'core';
const TIMELINE_TABLE = 'timeline_events';

function toTimelineEvent(
  row: TimelineEventRow & { organizations?: { name?: string | null } },
): TimelineEvent {
  return {
    id: row.id,
    personId: row.person_id,
    caseId: row.case_id ?? null,
    encounterId: row.encounter_id ?? null,
    owningOrgId: row.owning_org_id,
    eventCategory: row.event_category,
    eventAt: row.event_at,
    summary: row.summary ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
    createdByOrg: row.organizations?.name ?? null,
  };
}

export async function fetchTimelineEventsForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  {
    limit = 100,
    visibilityScope,
  }: { limit?: number; visibilityScope?: 'internal_to_org' | 'shared_via_consent' } = {},
): Promise<TimelineEvent[]> {
  let query = supabase
    .schema(CORE_SCHEMA)
    .from(TIMELINE_TABLE)
    .select('id, person_id, case_id, encounter_id, owning_org_id, event_category, event_at, summary, metadata, visibility_scope, sensitivity_level, organizations(name)')
    .eq('person_id', personId);

  if (visibilityScope) {
    query = query.eq('visibility_scope', visibilityScope);
  }

  const { data, error } = await query.order('event_at', { ascending: false }).limit(limit);

  if (error) {
    console.error('Failed to load timeline events', { personId, error });
    throw new Error('Unable to load timeline events right now.');
  }

  return (data ?? []).map((row: TimelineEventRow & { organizations?: { name?: string | null } }) =>
    toTimelineEvent(row),
  );
}
