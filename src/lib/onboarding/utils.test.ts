import { describe, expect, it } from 'vitest';
import { composeContactContext, resolveOnboardingActor, type OnboardingActor } from './utils';
import type { PortalAccess } from '@/lib/portal-access';

const baseAccess: PortalAccess = {
  userId: 'user',
  email: 'user@example.com',
  profile: {} as PortalAccess['profile'],
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
  canManageWebsiteContent: false,
  canManageSiteFooter: false,
  canManageConsents: false,
  canManageOrgUsers: false,
  canManageOrgInvites: false,
  canAccessStaffWorkspace: false,
  canReviewProfiles: false,
  canViewMetrics: false,
};

describe('resolveOnboardingActor', () => {
  it.each([
    ['client when no access', null, 'client'],
    ['staff when staff workspace allowed', { ...baseAccess, canAccessStaffWorkspace: true }, 'staff'],
    ['staff when can manage consents', { ...baseAccess, canManageConsents: true }, 'staff'],
    ['partner when org workspace allowed', { ...baseAccess, canAccessOrgWorkspace: true }, 'partner'],
  ])('%s', (_label, access, expected) => {
    expect(resolveOnboardingActor(access as PortalAccess | null)).toBe(expected as OnboardingActor);
  });
});

describe('composeContactContext', () => {
  it('returns null when nothing is provided', () => {
    expect(composeContactContext({})).toBeNull();
  });

  it('summarizes channels, window, postal code, and dob', () => {
    expect(
      composeContactContext({
        safeCall: true,
        safeText: false,
        safeVoicemail: true,
        contactWindow: 'Weekdays 9-5',
        postalCode: 'K9A 3L3',
        dobMonth: 5,
        dobYear: 1990,
      }),
    ).toBe('Safe contact: voice, voicemail • Contact window: Weekdays 9-5 • Postal code: K9A 3L3 • Birth month/year: 05/1990');
  });

  it('includes extra note when present', () => {
    expect(composeContactContext({ extraNote: 'No messages after 8pm' })).toBe('No messages after 8pm');
  });
});
