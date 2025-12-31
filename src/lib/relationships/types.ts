import type { Database } from '@/types/supabase';

export type PersonRelationshipRow = Database['core']['Tables']['person_relationships']['Row'];
export type VisibilityScope = Database['core']['Enums']['visibility_scope_enum'];
export type SensitivityLevel = Database['core']['Enums']['sensitivity_level_enum'];
export type VerificationStatus = Database['core']['Enums']['verification_status_enum'];
export type RecordSource = Database['core']['Enums']['record_source_enum'];

export type RelationshipSummary = {
  id: string;
  relationshipType: string;
  relationshipSubtype: string | null;
  relationshipStatus: string | null;
  relatedPersonId: number | null;
  relatedPersonName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  isPrimary: boolean;
  isEmergency: boolean;
  safeToContact: boolean;
  safeContactNotes: string | null;
  notes: string | null;
  visibilityScope: VisibilityScope;
  sensitivityLevel: SensitivityLevel;
  verificationStatus: VerificationStatus;
  source: RecordSource;
  recordedAt: string;
  createdByOrg: string | null;
};
