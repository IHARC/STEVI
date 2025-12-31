import type { Database } from '@/types/supabase';

export type ClientPersonSummary = Pick<
  Database['core']['Tables']['people']['Row'],
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'created_at'
  | 'created_by'
  | 'date_of_birth'
  | 'age'
  | 'gender'
  | 'preferred_pronouns'
  | 'preferred_contact_method'
  | 'housing_status'
  | 'risk_level'
  | 'updated_at'
  | 'updated_by'
>;

export type ClientAliasSummary = Pick<
  Database['core']['Tables']['people_aliases']['Row'],
  'id' | 'alias_name' | 'is_active' | 'created_at' | 'updated_at' | 'deactivated_at'
>;

export type ClientIntakeSummary = Pick<
  Database['case_mgmt']['Tables']['client_intakes']['Row'],
  | 'id'
  | 'housing_status'
  | 'risk_level'
  | 'health_concerns'
  | 'immediate_needs'
  | 'risk_factors'
  | 'intake_date'
  | 'created_at'
  | 'situation_notes'
  | 'general_notes'
>;
