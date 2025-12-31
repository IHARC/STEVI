import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PersonRelationshipRow, RelationshipSummary } from '@/lib/relationships/types';

const CORE_SCHEMA = 'core';
const RELATIONSHIPS_TABLE = 'person_relationships';

function toRelationshipSummary(
  row: PersonRelationshipRow & { organizations?: { name?: string | null }; related_person?: { first_name?: string | null; last_name?: string | null } },
): RelationshipSummary {
  const relatedNameParts = [row.related_person?.first_name ?? '', row.related_person?.last_name ?? ''].filter(Boolean);
  return {
    id: row.id,
    relationshipType: row.relationship_type,
    relationshipSubtype: row.relationship_subtype ?? null,
    relationshipStatus: row.relationship_status ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    relatedPersonId: row.related_person_id ?? null,
    relatedPersonName: relatedNameParts.join(' ').trim() || null,
    contactName: row.contact_name ?? null,
    contactPhone: row.contact_phone ?? null,
    contactEmail: row.contact_email ?? null,
    contactAddress: row.contact_address ?? null,
    isPrimary: row.is_primary,
    isEmergency: row.is_emergency,
    safeToContact: row.safe_to_contact,
    safeContactNotes: row.safe_contact_notes ?? null,
    notes: row.notes ?? null,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
    verificationStatus: row.verification_status,
    source: row.source,
    recordedAt: row.recorded_at,
    updatedAt: row.updated_at ?? null,
    createdByOrg: row.organizations?.name ?? null,
  };
}

export async function fetchRelationshipsForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 25,
): Promise<RelationshipSummary[]> {
  const { data, error } = await supabase
    .schema(CORE_SCHEMA)
    .from(RELATIONSHIPS_TABLE)
    .select(
      'id, relationship_type, relationship_subtype, relationship_status, start_date, end_date, related_person_id, contact_name, contact_phone, contact_email, contact_address, is_primary, is_emergency, safe_to_contact, safe_contact_notes, notes, visibility_scope, sensitivity_level, verification_status, source, recorded_at, updated_at, organizations(name), related_person:people!person_relationships_related_person_id_fkey(first_name,last_name)',
    )
    .eq('person_id', personId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load relationships', { personId, error });
    throw new Error('Unable to load relationships right now.');
  }

  return (data ?? []).map(
    (
      row: PersonRelationshipRow & {
        organizations?: { name?: string | null };
        related_person?: { first_name?: string | null; last_name?: string | null };
      },
    ) => toRelationshipSummary(row),
  );
}
