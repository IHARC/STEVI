import type { Database } from '@/types/supabase';
import type { TaskPriority, TaskStatus } from '@/lib/tasks/types';

export type ObservationRow = Database['case_mgmt']['Tables']['observations']['Row'];
export type ObservationPromotionRow = Database['case_mgmt']['Tables']['observation_promotions']['Row'];

export type ObservationCategory = Database['case_mgmt']['Enums']['observation_category_enum'];
export type ObservationSubject = Database['case_mgmt']['Enums']['observation_subject_enum'];
export type ObservationLeadStatus = Database['case_mgmt']['Enums']['observation_lead_status_enum'];
export type ObservationPromotionType = Database['case_mgmt']['Enums']['observation_promotion_enum'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];
export type VerificationStatus = Database['core']['Enums']['verification_status_enum'];
export type RecordSource = Database['core']['Enums']['record_source_enum'];

export type ObservationSummary = {
  id: string;
  personId: number | null;
  caseId: number | null;
  encounterId: string | null;
  owningOrgId: number;
  category: ObservationCategory;
  summary: string;
  details: string | null;
  subjectType: ObservationSubject;
  subjectPersonId: number | null;
  subjectName: string | null;
  subjectDescription: string | null;
  lastSeenAt: string | null;
  lastSeenLocation: string | null;
  reporterPersonId: number | null;
  leadStatus: ObservationLeadStatus | null;
  leadExpiresAt: string | null;
  source: RecordSource;
  verificationStatus: VerificationStatus;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
  recordedAt: string;
  createdByOrg: string | null;
};

export type ObservationPromotion = {
  id: string;
  promotionType: ObservationPromotionType;
  targetId: string;
  targetLabel: string | null;
  createdAt: string;
};

export type ObservationTaskSummary = {
  id: string;
  personId: number;
  clientName: string;
  title: string;
  dueAt: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  observationId: string | null;
  encounterId: string | null;
};
