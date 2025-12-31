import type { Database } from '@/types/supabase';

export type TaskStatus = Database['case_mgmt']['Enums']['task_status_enum'];
export type TaskPriority = Database['case_mgmt']['Enums']['task_priority_enum'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];

export type TaskRow = Database['case_mgmt']['Tables']['tasks']['Row'];

export type TaskSummary = {
  id: string;
  personId: number;
  caseId: number | null;
  encounterId: string | null;
  owningOrgId: number;
  assignedToProfileId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  title: string;
  description: string | null;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
};

export type TaskAssigneeSummary = {
  personId: number;
  clientName: string;
  status: string;
  nextStep: string | null;
  nextAt: string | null;
};
