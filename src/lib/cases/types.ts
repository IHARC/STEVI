import type { Database } from '@/types/supabase';
import type { ConsentMethod, ConsentOrgSelection, ConsentScope, ConsentStatus } from '@/lib/consents';

// Narrow case record shape to fields used in the UI. Keeps typecheck light while aligning to Supabase schema.
export type CaseRecord = {
  id: number;
  person_id: number;
  case_number: string | null;
  case_type: string | null;
  status: string | null;
  priority: string | null;
  case_manager_name: string;
  case_manager_contact: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type PersonRecord = Database['core']['Tables']['people']['Row'];

export type CaseSummary = {
  id: number;
  caseNumber: string | null;
  caseType: string | null;
  status: string | null;
  priority: string | null;
  caseManagerName: string;
  caseManagerContact: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type ConsentSnapshot = {
  consentId: string | null;
  scope: ConsentScope | null;
  status: ConsentStatus | null;
  effectiveStatus: ConsentStatus | null;
  createdAt: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  orgSelections: ConsentOrgSelection[];
  allowedOrgIds: number[];
  blockedOrgIds: number[];
  preferredContactMethod: string | null;
  privacyRestrictions: string | null;
};

export type ConsentHistoryEntry = {
  id: string;
  scope: ConsentScope;
  status: ConsentStatus;
  capturedMethod: ConsentMethod;
  createdAt: string;
  updatedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

export type ClientCaseDetail = CaseSummary & {
  personId: number;
};

export type CaseActivity = {
  id: string;
  title: string;
  description: string | null;
  activityDate: string;
  activityTime: string | null;
  activityType: string;
  createdByOrg: string | null;
  sharedWithClient: boolean;
  visibility: 'client' | 'internal';
};

export type IntakeSubmission = {
  id: string;
  chosenName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  supabaseUserId: string | null;
  profileId: string | null;
  consentContact: boolean | null;
};
