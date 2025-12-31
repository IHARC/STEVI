import type { Database } from '@/types/supabase';

export type MedicalEpisodeRow = Database['core']['Tables']['medical_episodes']['Row'];
export type FollowUpTimeline = Database['core']['Enums']['follow_up_plan_enum'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];
export type VerificationStatus = Database['core']['Enums']['verification_status_enum'];
export type RecordSource = Database['core']['Enums']['record_source_enum'];

export type MedicalEpisodeSummary = {
  id: string;
  episodeType: string;
  primaryCondition: string;
  episodeDate: string;
  episodeEndDate: string | null;
  severityLevel: string | null;
  assessmentSummary: string | null;
  planSummary: string | null;
  followUpNeeded: boolean | null;
  followUpTimeline: FollowUpTimeline | null;
  outcome: string | null;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
  verificationStatus: VerificationStatus;
  source: RecordSource;
  recordedAt: string;
  createdByOrg: string | null;
};
