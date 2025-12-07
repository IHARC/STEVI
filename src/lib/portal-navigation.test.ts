import { describe, expect, it } from 'vitest';
import { buildPortalNav, inferPortalAreaFromPath, isClientPreview, resolveLandingPath } from './portal-navigation';
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

    const sectionIds = buildPortalNav(access, { activeArea: 'client' }).map((section) => section.id);
    expect(sectionIds).toEqual(expect.arrayContaining(['client-portal', 'staff-tools', 'admin', 'organization']));
  });

  it('hides sections the user cannot access', () => {
    const staffOnly = { ...baseAccess, canAccessStaffWorkspace: true };
    const sections = buildPortalNav(staffOnly).map((section) => section.id);
    expect(sections).toContain('staff-tools');
    expect(sections).not.toContain('admin');
    expect(sections).not.toContain('organization');
  });

  it('hides client portal section for non-client area when user has higher access', () => {
    const access = {
      ...baseAccess,
      canAccessAdminWorkspace: true,
      canAccessStaffWorkspace: true,
    };

    const sections = buildPortalNav(access, { activeArea: 'admin' }).map((section) => section.id);
    expect(sections).toContain('admin');
    expect(sections).toContain('staff-tools');
    expect(sections).not.toContain('client-portal');
  });

  it('keeps client portal when explicitly in client area (preview)', () => {
    const access = {
      ...baseAccess,
      canAccessAdminWorkspace: true,
    };

    const sections = buildPortalNav(access, { activeArea: 'client' }).map((section) => section.id);
    expect(sections).toContain('client-portal');
  });
});

describe('isClientPreview', () => {
  const adminAndStaff = { ...baseAccess, canAccessAdminWorkspace: true, canAccessStaffWorkspace: true };

  it('treats client paths as preview when user has elevated access', () => {
    expect(isClientPreview(adminAndStaff, '/home')).toBe(true);
  });

  it('returns false for client-only users', () => {
    expect(isClientPreview(baseAccess, '/home')).toBe(false);
  });

  it('returns false for non-client paths', () => {
    expect(isClientPreview(adminAndStaff, '/staff/overview')).toBe(false);
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
