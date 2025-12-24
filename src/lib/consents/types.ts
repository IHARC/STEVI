export const CONSENT_TYPES = ['data_sharing'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_SCOPES = ['all_orgs', 'selected_orgs', 'none'] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const CONSENT_STATUSES = ['active', 'revoked', 'expired'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const CONSENT_METHODS = ['portal', 'staff_assisted', 'verbal', 'documented', 'migration'] as const;
export type ConsentMethod = (typeof CONSENT_METHODS)[number];

export type ConsentRecord = {
  id: string;
  personId: number;
  consentType: ConsentType;
  scope: ConsentScope;
  status: ConsentStatus;
  capturedBy: string | null;
  capturedMethod: ConsentMethod;
  policyVersion: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  expiresAt: string | null;
  restrictions: Record<string, unknown> | null;
};

export type ConsentOrgRow = {
  id: string;
  consentId: string;
  organizationId: number;
  allowed: boolean;
  setBy: string | null;
  setAt: string;
  reason: string | null;
  organizationName?: string | null;
};

export type ConsentOrgSelection = {
  id: number;
  name: string | null;
  organizationType?: string | null;
  partnershipType?: string | null;
  allowed: boolean;
};

export type ParticipatingOrganization = {
  id: number;
  name: string | null;
  organization_type: string | null;
  partnership_type: string | null;
  is_active: boolean | null;
};

export type EffectiveConsent = {
  consent: ConsentRecord | null;
  scope: ConsentScope | null;
  status: ConsentStatus | null;
  effectiveStatus: ConsentStatus | null;
  expiresAt: string | null;
  isExpired: boolean;
};

export type ConsentOrgResolution = {
  allowedOrgIds: number[];
  blockedOrgIds: number[];
  selections: ConsentOrgSelection[];
};
