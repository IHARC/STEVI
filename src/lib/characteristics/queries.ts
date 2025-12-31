import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PersonCharacteristicRow, CharacteristicSummary } from '@/lib/characteristics/types';

const CORE_SCHEMA = 'core';
const CHARACTERISTICS_TABLE = 'person_characteristics';

function toCharacteristicSummary(
  row: PersonCharacteristicRow & { organizations?: { name?: string | null } },
): CharacteristicSummary {
  return {
    id: row.id,
    characteristicType: row.characteristic_type,
    observedAt: row.observed_at,
    observedBy: row.observed_by ?? null,
    valueText: row.value_text ?? null,
    valueNumber: row.value_number ?? null,
    valueUnit: row.value_unit ?? null,
    bodyLocation: row.body_location ?? null,
    notes: row.notes ?? null,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
    verificationStatus: row.verification_status,
    source: row.source,
    updatedAt: row.updated_at ?? null,
    createdByOrg: row.organizations?.name ?? null,
  };
}

export async function fetchCharacteristicsForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 25,
): Promise<CharacteristicSummary[]> {
  const { data, error } = await supabase
    .schema(CORE_SCHEMA)
    .from(CHARACTERISTICS_TABLE)
    .select(
      'id, characteristic_type, observed_at, observed_by, value_text, value_number, value_unit, body_location, notes, visibility_scope, sensitivity_level, verification_status, source, updated_at, organizations(name)',
    )
    .eq('person_id', personId)
    .order('observed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load characteristics', { personId, error });
    throw new Error('Unable to load characteristics right now.');
  }

  return (data ?? []).map((row: PersonCharacteristicRow & { organizations?: { name?: string | null } }) =>
    toCharacteristicSummary(row),
  );
}
