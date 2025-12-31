import type { Database } from '@/types/supabase';

export type EncounterType = Database['case_mgmt']['Enums']['encounter_type_enum'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];

export type EncounterRow = Database['case_mgmt']['Tables']['encounters']['Row'];

export type EncounterSummary = {
  id: string;
  personId: number;
  caseId: number | null;
  owningOrgId: number;
  encounterType: EncounterType;
  startedAt: string;
  endedAt: string | null;
  locationContext: string | null;
  programContext: string | null;
  summary: string | null;
  notes: string | null;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
};
