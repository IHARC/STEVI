import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { JusticeEpisodeRow, JusticeEpisodeSummary } from '@/lib/justice/types';

const CORE_SCHEMA = 'core';
const JUSTICE_TABLE = 'justice_episodes';

function toJusticeEpisodeSummary(
  row: JusticeEpisodeRow & { organizations?: { name?: string | null } },
): JusticeEpisodeSummary {
  return {
    id: row.id,
    episodeType: row.episode_type,
    eventDate: row.event_date,
    eventTime: row.event_time ?? null,
    agency: row.agency ?? null,
    caseNumber: row.case_number ?? null,
    charges: row.charges ?? null,
    disposition: row.disposition ?? null,
    location: row.location ?? null,
    bailAmount: row.bail_amount ?? null,
    bookingNumber: row.booking_number ?? null,
    courtDate: row.court_date ?? null,
    releaseDate: row.release_date ?? null,
    releaseType: row.release_type ?? null,
    checkInDate: typeof row.metadata === 'object' && row.metadata !== null ? (row.metadata as { check_in_date?: string | null }).check_in_date ?? null : null,
    supervisionAgency: row.supervision_agency ?? null,
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

export async function fetchJusticeEpisodesForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 25,
): Promise<JusticeEpisodeSummary[]> {
  const { data, error } = await supabase
    .schema(CORE_SCHEMA)
    .from(JUSTICE_TABLE)
    .select(
      'id, episode_type, event_date, event_time, agency, case_number, charges, disposition, location, bail_amount, booking_number, court_date, release_date, release_type, supervision_agency, notes, metadata, visibility_scope, sensitivity_level, verification_status, source, recorded_at, updated_at, organizations(name)',
    )
    .eq('person_id', personId)
    .order('event_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load justice episodes', { personId, error });
    throw new Error('Unable to load justice history right now.');
  }

  return (data ?? []).map((row: JusticeEpisodeRow & { organizations?: { name?: string | null } }) =>
    toJusticeEpisodeSummary(row),
  );
}
