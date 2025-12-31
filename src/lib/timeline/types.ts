import type { Database } from '@/types/supabase';

export type TimelineEventCategory = Database['core']['Enums']['timeline_event_category_enum'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];

export type TimelineEventRow = Database['core']['Tables']['timeline_events']['Row'];

export type TimelineEvent = {
  id: string;
  personId: number;
  caseId: number | null;
  encounterId: string | null;
  owningOrgId: number;
  eventCategory: TimelineEventCategory;
  eventAt: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
  createdByOrg: string | null;
};
