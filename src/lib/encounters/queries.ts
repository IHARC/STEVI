import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { EncounterSummary, EncounterRow } from '@/lib/encounters/types';

const CASE_SCHEMA = 'case_mgmt';
const ENCOUNTERS_TABLE = 'encounters';

function toEncounterSummary(row: EncounterRow): EncounterSummary {
  return {
    id: row.id,
    personId: row.person_id,
    caseId: row.case_id ?? null,
    owningOrgId: row.owning_org_id,
    encounterType: row.encounter_type,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    locationContext: row.location_context ?? null,
    programContext: row.program_context ?? null,
    summary: row.summary ?? null,
    notes: row.notes ?? null,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
  };
}

export async function fetchEncounterById(
  supabase: SupabaseAnyServerClient,
  encounterId: string,
): Promise<EncounterSummary | null> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(ENCOUNTERS_TABLE)
    .select('*')
    .eq('id', encounterId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load encounter', { encounterId, error });
    throw new Error('Unable to load that encounter.');
  }

  return data ? toEncounterSummary(data as EncounterRow) : null;
}

export async function fetchEncountersForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 50,
): Promise<EncounterSummary[]> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(ENCOUNTERS_TABLE)
    .select('*')
    .eq('person_id', personId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load encounters', { personId, error });
    throw new Error('Unable to load encounters right now.');
  }

  return (data ?? []).map((row: EncounterRow) => toEncounterSummary(row));
}
