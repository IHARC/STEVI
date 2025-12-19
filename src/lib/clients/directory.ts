import type { Database } from '@/types/supabase';

export type PersonType = Database['core']['Enums']['person_type'];
export type PersonStatus = Database['core']['Enums']['person_status'];
export type PersonCategory = Database['core']['Enums']['person_category'];

export const PERSON_TYPE_VALUES: PersonType[] = [
  'client',
  'former_client',
  'potential_client',
  'resident',
  'concerned_citizen',
  'agency_contact',
  'case_worker',
  'healthcare_provider',
  'emergency_contact',
  'family_member',
  'support_person',
];

export const PERSON_STATUS_VALUES: PersonStatus[] = [
  'active',
  'inactive',
  'deceased',
  'archived',
  'pending_verification',
  'do_not_contact',
  'merged',
];

export const PERSON_CATEGORY_VALUES: PersonCategory[] = ['service_recipient', 'community', 'professional', 'support'];

export function formatEnumLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');
}

export function requiresPrivacySearch(personTypes: PersonType[]) {
  return personTypes.includes('client') || personTypes.includes('potential_client');
}
