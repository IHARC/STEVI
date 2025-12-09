import { describe, expect, it } from 'vitest';
import { buildPortalNav, flattenNavItemsForCommands } from './portal-navigation';
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
  organizationName: null,
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
  it('sends any workspace user to the unified today rail', () => {
    const access = { ...baseAccess, canAccessAdminWorkspace: true };
    expect(resolveLandingPath(access)).toBe('/workspace/today');
    expect(resolveLandingPath({ ...baseAccess, canAccessStaffWorkspace: true })).toBe('/workspace/today');
  });

  it('keeps client-only users on the client landing', () => {
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
      organizationName: 'IHARC',
      canAccessInventoryWorkspace: true,
      canManagePolicies: true,
      canManageResources: true,
      canManageNotifications: true,
      canManageWebsiteContent: true,
      canViewMetrics: true,
    };

    const sections = buildPortalNav(access);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe('workspace');
    const groupIds = sections[0]?.groups.map((group) => group.id);
    expect(groupIds).toEqual(expect.arrayContaining(['today', 'clients', 'programs', 'supplies', 'partners', 'organization', 'reports']));
  });

  it('hides sections the user cannot access', () => {
    const staffOnly = { ...baseAccess, canAccessStaffWorkspace: true };
    const sections = buildPortalNav(staffOnly);
    expect(sections).toHaveLength(1);
    const groupIds = sections[0]?.groups.map((group) => group.id) ?? [];
    expect(groupIds).toContain('today');
    expect(groupIds).toContain('clients');
    expect(groupIds).toContain('programs');
    expect(groupIds).not.toContain('supplies');
    expect(groupIds).not.toContain('partners');
    expect(groupIds).not.toContain('organization');
  });

  it('never includes client portal section (split shell)', () => {
    const access = { ...baseAccess, canAccessAdminWorkspace: true, canAccessStaffWorkspace: true };
    const sectionIds = buildPortalNav(access).map((section) => section.id);
    expect(sectionIds).toEqual(['workspace']);
  });
});

describe('requireArea guards', () => {
  it('forces preview flag for workspace users visiting client shell', () => {
    const admin = { ...baseAccess, canAccessAdminWorkspace: true };
    const landingPath = resolveLandingPath(admin);

    const noPreview = requireArea(admin, 'client', { preview: false, landingPath });
    expect(noPreview.allowed).toBe(false);
    if (!noPreview.allowed) {
      expect(noPreview.redirectPath).toBe('/workspace/today');
    }

    const withPreview = requireArea(admin, 'client', { preview: true, landingPath });
    expect(withPreview.allowed).toBe(true);
    if (withPreview.allowed) {
      expect(withPreview.isPreview).toBe(true);
    }
  });

  it('redirects non-workspace users away from workspace shell', () => {
    const result = requireArea(baseAccess, 'workspace');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.redirectPath).toBe('/home');
    }
  });
});

describe('inferPortalAreaFromPath', () => {
  it('maps known prefixes to areas', () => {
    expect(inferPortalAreaFromPath('/admin/operations')).toBe('workspace');
    expect(inferPortalAreaFromPath('/staff/cases')).toBe('workspace');
    expect(inferPortalAreaFromPath('/org/settings')).toBe('workspace');
    expect(inferPortalAreaFromPath('/workspace/today')).toBe('workspace');
    expect(inferPortalAreaFromPath('/home')).toBe('client');
  });
});

describe('no orphan routes', () => {
  it('ensures every workspace hub path is represented in nav commands', () => {
    const access = {
      ...baseAccess,
      canAccessAdminWorkspace: true,
      canAccessStaffWorkspace: true,
      canAccessOrgWorkspace: true,
      canAccessInventoryWorkspace: true,
      canManagePolicies: true,
      canManageResources: true,
      canManageNotifications: true,
      canManageWebsiteContent: true,
      canManageConsents: true,
      canViewMetrics: true,
      organizationName: 'IHARC',
    } satisfies PortalAccess;

    const navSections = buildPortalNav(access);
    const commands = flattenNavItemsForCommands(navSections);
    expect(commands.length).toBeGreaterThan(0);
    commands.forEach((cmd) => {
      expect(cmd.href).toBeTruthy();
      expect(cmd.label).toBeTruthy();
    });

    const duplicateHrefs = commands.filter((cmd, index) => commands.findIndex((c) => c.href === cmd.href) !== index);
    expect(duplicateHrefs.length).toBe(0);
  });
});
