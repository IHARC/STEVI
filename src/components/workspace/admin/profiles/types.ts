import type { Database } from '@/types/supabase';

export type AffiliationType = Database['portal']['Enums']['affiliation_type'];
export type AffiliationStatus = Database['portal']['Enums']['affiliation_status'];
export type GovernmentLevel = Database['portal']['Enums']['government_level'];
export type GovernmentRoleType = Database['portal']['Enums']['government_role_type'];
export type OrganizationCategory = Database['portal']['Enums']['organization_category'];
export type InviteStatus = Database['portal']['Enums']['invite_status'];

export type OrganizationOption = {
  id: string; // stored as string for form controls; underlying core.organizations id (bigint)
  name: string;
  governmentLevel?: GovernmentLevel | null;
};

export type PendingAffiliation = {
  id: string;
  displayName: string;
  positionTitle: string | null;
  affiliationType: AffiliationType;
  affiliationStatus: AffiliationStatus;
  affiliationRequestedAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  requestedOrganizationName: string | null;
  requestedGovernmentName: string | null;
  requestedGovernmentLevel: GovernmentLevel | null;
  requestedGovernmentRole: GovernmentRoleType | null;
  governmentRoleType: GovernmentRoleType | null;
};

export type ProfileInviteSummary = {
  id: string;
  email: string;
  displayName: string | null;
  positionTitle: string | null;
  affiliationType: AffiliationType;
  status: InviteStatus;
  createdAt: string;
  organizationName: string | null;
};
