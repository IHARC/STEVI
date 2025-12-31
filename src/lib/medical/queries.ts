import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { MedicalEpisodeRow, MedicalEpisodeSummary } from '@/lib/medical/types';

const CORE_SCHEMA = 'core';
const MEDICAL_TABLE = 'medical_episodes';

function toMedicalEpisodeSummary(
  row: MedicalEpisodeRow & { organizations?: { name?: string | null } },
): MedicalEpisodeSummary {
  return {
    id: row.id,
    episodeType: row.episode_type,
    primaryCondition: row.primary_condition,
    episodeDate: row.episode_date,
    episodeEndDate: row.episode_end_date ?? null,
    severityLevel: row.severity_level ?? null,
    assessmentSummary: row.assessment_summary ?? null,
    planSummary: row.plan_summary ?? null,
    followUpNeeded: row.follow_up_needed ?? null,
    followUpTimeline: (row.follow_up_timeline as MedicalEpisodeSummary['followUpTimeline']) ?? null,
    outcome: row.outcome ?? null,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
    verificationStatus: row.verification_status,
    source: row.source,
    recordedAt: row.recorded_at,
    createdByOrg: row.organizations?.name ?? null,
  };
}

export async function fetchMedicalEpisodesForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 25,
): Promise<MedicalEpisodeSummary[]> {
  const { data, error } = await supabase
    .schema(CORE_SCHEMA)
    .from(MEDICAL_TABLE)
    .select(
      'id, episode_type, primary_condition, episode_date, episode_end_date, severity_level, assessment_summary, plan_summary, follow_up_needed, follow_up_timeline, outcome, visibility_scope, sensitivity_level, verification_status, source, recorded_at, organizations(name)',
    )
    .eq('person_id', personId)
    .order('episode_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load medical episodes', { personId, error });
    throw new Error('Unable to load medical history right now.');
  }

  return (data ?? []).map((row: MedicalEpisodeRow & { organizations?: { name?: string | null } }) =>
    toMedicalEpisodeSummary(row),
  );
}
