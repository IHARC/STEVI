import type { Database } from '@/types/supabase';

export type PersonCharacteristicRow = Database['core']['Tables']['person_characteristics']['Row'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];
export type VerificationStatus = Database['core']['Enums']['verification_status_enum'];
export type RecordSource = Database['core']['Enums']['record_source_enum'];

export type CharacteristicSummary = {
  id: string;
  characteristicType: string;
  observedAt: string;
  observedBy: string | null;
  valueText: string | null;
  valueNumber: number | null;
  valueUnit: string | null;
  bodyLocation: string | null;
  notes: string | null;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
  verificationStatus: VerificationStatus;
  source: RecordSource;
  updatedAt: string | null;
  createdByOrg: string | null;
};
