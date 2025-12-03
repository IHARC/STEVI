import { describe, expect, it } from 'vitest';
import {
  buildPortalNav,
  inferPortalAreaFromPath,
  isClientPreview,
  resolveLandingPath,
} from './portal-navigation';
import type { PortalAccess } from './portal-access';

const baseAccess: PortalAccess = {
  userId: 'user-id',
  email: 'user@example.com',
  profile: { id: 1, affiliation_status: 'approved' } as PortalAccess['profile'],
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
    expect(sectionIds).toEqual(expect.arrayContaining(['client-portal', 'staff-tools', 'admin', 'organization']));
  });

  it('hides sections the user cannot access', () => {
    const staffOnly = { ...baseAccess, canAccessStaffWorkspace: true };
    const sections = buildPortalNav(staffOnly).map((section) => section.id);
    expect(sections).toContain('staff-tools');
    expect(sections).not.toContain('admin');
    expect(sections).not.toContain('organization');
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
