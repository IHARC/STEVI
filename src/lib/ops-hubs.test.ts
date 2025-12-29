import { describe, expect, it } from 'vitest';
import { buildPortalNav } from './portal-navigation';
import { buildOpsHubNav } from './ops-hubs';
import type { PortalAccess } from './portal-access';
import type { PortalProfile } from './profile';

function buildProfile(overrides: Partial<PortalProfile> = {}): PortalProfile {
  const baseProfile: PortalProfile = {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: 'user-id',
    display_name: 'Test User',
    avatar_url: null,
    bio: null,
    rules_acknowledged_at: null,
    last_seen_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    display_name_confirmed_at: null,
    position_title: null,
    affiliation_type: 'client',
    affiliation_status: 'approved' as PortalProfile['affiliation_status'],
    affiliation_requested_at: null,
    affiliation_reviewed_at: null,
    affiliation_reviewed_by: null,
    homelessness_experience: 'none',
    substance_use_experience: 'none',
    has_signed_petition: false,
    petition_signed_at: null,
    government_role_type: null,
    requested_organization_name: null,
    requested_government_name: null,
    requested_government_level: null,
    requested_government_role: null,
    organization_id: null,
  };

  return { ...baseProfile, ...overrides };
}

const baseAccess: PortalAccess = {
  userId: 'user-id',
  email: 'user@example.com',
  profile: buildProfile(),
  isProfileApproved: true,
  isGlobalAdmin: false,
  iharcOrganizationId: null,
  isIharcMember: false,
  orgRoles: [],
  orgPermissions: [],
  organizationId: null,
  organizationName: null,
  organizationFeatures: [],
  canAccessOpsAdmin: false,
  canAccessOpsSteviAdmin: false,
  canAccessOpsOrg: false,
  canAccessOpsFrontline: false,
  canManageResources: false,
  canManagePolicies: false,
  canAccessInventoryOps: false,
  canManageInventoryLocations: false,
  canManageNotifications: false,
  canReviewProfiles: false,
  canViewMetrics: false,
  canViewCosts: false,
  canManageCosts: false,
  canReportCosts: false,
  canAdminCosts: false,
  canTrackTime: false,
  canViewOwnTime: false,
  canViewAllTime: false,
  canManageTime: false,
  canManageWebsiteContent: false,
  canManageSiteFooter: false,
  canManageConsents: false,
  canManageOrgUsers: false,
  canManageOrgInvites: false,
  actingOrgChoices: [],
  actingOrgChoicesCount: null,
  actingOrgAutoSelected: false,
};

describe('buildOpsHubNav', () => {
  it('builds a capped, ordered hub list for ops users', () => {
    const access = {
      ...baseAccess,
      canAccessOpsAdmin: true,
      canAccessOpsFrontline: true,
      canAccessOpsOrg: true,
      canAccessOpsSteviAdmin: true,
      canAccessInventoryOps: true,
      canManageConsents: true,
      organizationId: 12,
      organizationName: 'IHARC',
    } satisfies PortalAccess;

    const sections = buildPortalNav(access);
    const hubs = buildOpsHubNav(sections);

    expect(hubs.map((hub) => hub.label)).toEqual([
      'Today',
      'Clients',
      'Programs',
      'Inventory',
      'Fundraising',
      'Organizations',
    ]);
    expect(hubs).toHaveLength(6);
  });

  it('keeps organizations as the primary hub for org-scoped users', () => {
    const access = {
      ...baseAccess,
      profile: buildProfile({ affiliation_type: 'agency_partner' }),
      canAccessOpsOrg: true,
      organizationId: 12,
      organizationName: 'IHARC',
    } satisfies PortalAccess;

    const sections = buildPortalNav(access);
    const hubs = buildOpsHubNav(sections);

    expect(hubs.map((hub) => hub.label)).toEqual(['Organizations', 'Consents']);
  });
});
