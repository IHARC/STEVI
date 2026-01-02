import type {
  ObservationCategory,
  ObservationLeadStatus,
  ObservationSubject,
  RecordSource,
  VerificationStatus,
} from '@/lib/observations/types';

export const OBSERVATION_CATEGORIES: ObservationCategory[] = [
  'health_concern',
  'safety_concern',
  'welfare_check',
  'housing_basic_needs',
  'relationship_social',
  'other',
];

export const OBSERVATION_SUBJECTS: ObservationSubject[] = [
  'this_client',
  'known_person',
  'named_unlinked',
  'unidentified',
];

export const OBSERVATION_LEAD_STATUSES: ObservationLeadStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'archived',
];

export const OBSERVATION_SOURCE_OPTIONS: RecordSource[] = [
  'staff_observed',
  'client_reported',
];

export const OBSERVATION_VERIFICATION_OPTIONS: VerificationStatus[] = [
  'unverified',
  'verified',
  'disputed',
  'stale',
];
