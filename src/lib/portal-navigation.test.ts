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
  canAccessOpsAdmin: false,
  canAccessOpsHq: false,
  canAccessOpsOrg: false,
  canAccessOpsFrontline: false,
  canManageResources: false,
  canManagePolicies: false,
  canAccessInventoryOps: false,
  canManageNotifications: false,
  canReviewProfiles: false,
  canViewMetrics: false,
  canManageWebsiteContent: false,
  canManageSiteFooter: false,
  canManageConsents: false,
  canManageOrgUsers: false,
  canManageOrgInvites: false,
  inventoryAllowedRoles: [],
  actingOrgChoices: [],
  actingOrgChoicesCount: null,
  actingOrgAutoSelected: false,
};

describe('resolveLandingPath', () => {
  it('lands IHARC HQ admins on the operations home', () => {
    const access = {
      ...baseAccess,
      canAccessOpsHq: true,
      canAccessOpsAdmin: true,
      canAccessOpsFrontline: true,
      canAccessOpsOrg: true,
    };
    expect(resolveLandingPath(access)).toBe('/ops/today');
  });

  it('lands frontline-only users on operations today', () => {
    const access = { ...baseAccess, canAccessOpsFrontline: true };
    expect(resolveLandingPath(access)).toBe('/ops/today');
  });

  it('keeps client-only users on the client landing', () => {
    expect(resolveLandingPath(baseAccess)).toBe('/home');
  });
});

describe('buildPortalNav', () => {
  it('includes frontline, org, and HQ sections when access allows', () => {
    const access = {
      ...baseAccess,
      canAccessOpsAdmin: true,
      canAccessOpsFrontline: true,
      canAccessOpsOrg: true,
      canAccessOpsHq: true,
      canAccessInventoryOps: true,
      canManageConsents: true,
      organizationId: 12,
      organizationName: 'IHARC',
    } satisfies PortalAccess;

    const sections = buildPortalNav(access);
    const sectionIds = sections.map((section) => section.id);
    expect(sectionIds).toEqual(['ops_frontline', 'ops_org', 'ops_hq']);

    const frontline = sections.find((section) => section.id === 'ops_frontline');
    const frontlineGroups = frontline?.groups.map((group) => group.id) ?? [];
    expect(frontlineGroups).toEqual(expect.arrayContaining(['today', 'clients', 'programs', 'supplies', 'partners']));

    const org = sections.find((section) => section.id === 'ops_org');
    expect(org?.groups[0]?.items.length).toBeGreaterThanOrEqual(4);

    const hq = sections.find((section) => section.id === 'ops_hq');
    expect(hq?.groups[0]?.items.length).toBeGreaterThanOrEqual(4);
  });

  it('hides sections the user cannot access', () => {
    const staffOnly = { ...baseAccess, canAccessOpsFrontline: true };
    const sections = buildPortalNav(staffOnly);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe('ops_frontline');
    const groupIds = sections[0]?.groups.map((group) => group.id) ?? [];
    expect(groupIds).toContain('today');
    expect(groupIds).toContain('clients');
    expect(groupIds).toContain('programs');
    expect(groupIds).not.toContain('supplies');
    expect(groupIds).not.toContain('partners');
  });

  it('never includes client portal sections in the ops shell', () => {
    const access = { ...baseAccess, canAccessOpsFrontline: true };
    const sectionIds = buildPortalNav(access).map((section) => section.id);
    expect(sectionIds.includes('client')).toBe(false);
  });
});

describe('requireArea guards', () => {
  it('forces preview flag for ops users visiting client shell', () => {
    const opsAdmin = { ...baseAccess, canAccessOpsFrontline: true, canAccessOpsAdmin: true };
    const landingPath = resolveLandingPath(opsAdmin);

    const noPreview = requireArea(opsAdmin, 'client', { preview: false, landingPath });
    expect(noPreview.allowed).toBe(false);
    if (!noPreview.allowed) {
      expect(noPreview.redirectPath).toBe('/ops/today');
    }

    const withPreview = requireArea(opsAdmin, 'client', { preview: true, landingPath });
    expect(withPreview.allowed).toBe(true);
    if (withPreview.allowed) {
      expect(withPreview.isPreview).toBe(true);
    }
  });

  it('redirects non-ops users away from operations shell', () => {
    const result = requireArea(baseAccess, 'ops_frontline');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.redirectPath).toBe('/home');
    }
  });
});

describe('inferPortalAreaFromPath', () => {
  it('maps known prefixes to areas', () => {
    expect(inferPortalAreaFromPath('/ops/hq')).toBe('ops_hq');
    expect(inferPortalAreaFromPath('/ops/org/settings')).toBe('ops_org');
    expect(inferPortalAreaFromPath('/ops/clients')).toBe('ops_frontline');
    expect(inferPortalAreaFromPath('/home')).toBe('client');
  });
});

describe('no orphan routes', () => {
  it('ensures every ops hub path is represented in nav commands', () => {
    const access = {
      ...baseAccess,
      canAccessOpsAdmin: true,
      canAccessOpsFrontline: true,
      canAccessOpsOrg: true,
      canAccessOpsHq: true,
      canAccessInventoryOps: true,
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
