import type { Database } from '@/types/supabase';

export type JusticeEpisodeRow = Database['core']['Tables']['justice_episodes']['Row'];
export type JusticeEpisodeType = Database['core']['Enums']['justice_episode_type_enum'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];
export type VerificationStatus = Database['core']['Enums']['verification_status_enum'];
export type RecordSource = Database['core']['Enums']['record_source_enum'];

export type JusticeEpisodeSummary = {
  id: string;
  episodeType: JusticeEpisodeType;
  eventDate: string;
  eventTime: string | null;
  agency: string | null;
  caseNumber: string | null;
  charges: string | null;
  disposition: string | null;
  location: string | null;
  bailAmount: number | null;
  bookingNumber: string | null;
  courtDate: string | null;
  releaseDate: string | null;
  releaseType: string | null;
  checkInDate: string | null;
  supervisionAgency: string | null;
  notes: string | null;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
  verificationStatus: VerificationStatus;
  source: RecordSource;
  recordedAt: string;
  updatedAt: string | null;
  createdByOrg: string | null;
};
