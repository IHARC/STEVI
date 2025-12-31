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
    charges: row.charges ?? null,
    disposition: row.disposition ?? null,
    location: row.location ?? null,
    courtDate: row.court_date ?? null,
    releaseDate: row.release_date ?? null,
    supervisionAgency: row.supervision_agency ?? null,
    notes: row.notes ?? null,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
    verificationStatus: row.verification_status,
    source: row.source,
    recordedAt: row.recorded_at,
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
      'id, episode_type, event_date, event_time, agency, charges, disposition, location, court_date, release_date, supervision_agency, notes, visibility_scope, sensitivity_level, verification_status, source, recorded_at, organizations(name)',
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
