import { describe, expect, it } from 'vitest';
import { buildPortalNav } from './portal-navigation';
import { inferPortalAreaFromPath, requireArea, resolveLandingPath } from './portal-areas';
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
    affiliation_type: {} as PortalProfile['affiliation_type'],
    affiliation_status: 'approved' as PortalProfile['affiliation_status'],
    affiliation_requested_at: null,
    affiliation_reviewed_at: null,
    affiliation_reviewed_by: null,
    homelessness_experience: {} as PortalProfile['homelessness_experience'],
    substance_use_experience: {} as PortalProfile['substance_use_experience'],
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
  iharcRoles: [],
  portalRoles: [],
  organizationId: null,
  canAccessAdminWorkspace: false,
  canAccessOrgWorkspace: false,
  canManageResources: false,
  canManagePolicies: false,
  canAccessInventoryWorkspace: false,
  canManageNotifications: false,
  canReviewProfiles: false,
  canViewMetrics: false,
  canManageWebsiteContent: false,
  canManageSiteFooter: false,
  canManageConsents: false,
  canManageOrgUsers: false,
  canManageOrgInvites: false,
  canAccessStaffWorkspace: false,
  inventoryAllowedRoles: [],
};

describe('resolveLandingPath', () => {
  it('prefers admin when available', () => {
    const access = { ...baseAccess, canAccessAdminWorkspace: true };
    expect(resolveLandingPath(access)).toBe('/admin/operations');
  });

  it('falls back to staff then org then client', () => {
    expect(resolveLandingPath({ ...baseAccess, canAccessStaffWorkspace: true })).toBe('/staff/overview');
    expect(resolveLandingPath({ ...baseAccess, canAccessOrgWorkspace: true, organizationId: 8 })).toBe('/org');
    expect(resolveLandingPath(baseAccess)).toBe('/home');
  });
});

describe('buildPortalNav', () => {
  it('includes all sections when access allows', () => {
    const access = {
      ...baseAccess,
      canAccessAdminWorkspace: true,
      canAccessStaffWorkspace: true,
      canAccessOrgWorkspace: true,
      organizationId: 12,
    };

    const sectionIds = buildPortalNav(access).map((section) => section.id);
    expect(sectionIds).toEqual(expect.arrayContaining(['staff-tools', 'admin', 'organization']));
  });

  it('hides sections the user cannot access', () => {
    const staffOnly = { ...baseAccess, canAccessStaffWorkspace: true };
    const sections = buildPortalNav(staffOnly).map((section) => section.id);
    expect(sections).toContain('staff-tools');
    expect(sections).not.toContain('admin');
    expect(sections).not.toContain('organization');
  });

  it('never includes client portal section (split shell)', () => {
    const access = { ...baseAccess, canAccessAdminWorkspace: true, canAccessStaffWorkspace: true };
    const sectionIds = buildPortalNav(access).map((section) => section.id);
    expect(sectionIds).not.toContain('client-portal');
  });
});

describe('requireArea guards', () => {
  it('forces preview flag for workspace users visiting client shell', () => {
    const admin = { ...baseAccess, canAccessAdminWorkspace: true };
    const landingPath = resolveLandingPath(admin);

    const noPreview = requireArea(admin, 'client', { preview: false, landingPath });
    expect(noPreview.allowed).toBe(false);
    if (!noPreview.allowed) {
      expect(noPreview.redirectPath).toBe('/admin/operations');
    }

    const withPreview = requireArea(admin, 'client', { preview: true, landingPath });
    expect(withPreview.allowed).toBe(true);
    if (withPreview.allowed) {
      expect(withPreview.isPreview).toBe(true);
    }
  });

  it('redirects non-staff users away from staff shell', () => {
    const result = requireArea(baseAccess, 'staff');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.redirectPath).toBe('/home');
    }
  });
});

describe('inferPortalAreaFromPath', () => {
  it('maps known prefixes to areas', () => {
    expect(inferPortalAreaFromPath('/admin/operations')).toBe('admin');
    expect(inferPortalAreaFromPath('/staff/cases')).toBe('staff');
    expect(inferPortalAreaFromPath('/org/settings')).toBe('org');
    expect(inferPortalAreaFromPath('/home')).toBe('client');
  });
});
