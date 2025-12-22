import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureInventoryActor, InventoryAccessError, requireInventoryAdmin } from './auth';
import type { PortalAccess } from '@/lib/portal-access';
import type { PortalProfile } from '@/lib/profile';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    const error = new Error(`redirect:${path}`);
    error.name = 'NextRedirect';
    throw error;
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

const { loadPortalAccess } = vi.hoisted(() => ({
  loadPortalAccess: vi.fn(),
}));

vi.mock('@/lib/portal-access', () => ({
  loadPortalAccess: (...args: unknown[]) => loadPortalAccess(...args),
}));

const mockProfile: PortalProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  display_name: 'Casey Client',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  affiliation_status: 'approved',
  affiliation_type: 'client',
  has_signed_petition: false,
  homelessness_experience: 'none',
  substance_use_experience: 'none',
  avatar_url: null,
  bio: null,
  display_name_confirmed_at: null,
  affiliation_requested_at: null,
  affiliation_reviewed_at: null,
  affiliation_reviewed_by: null,
  last_seen_at: null,
  organization_id: 1,
  petition_signed_at: null,
  position_title: 'Member',
  requested_government_level: null,
  requested_government_name: null,
  requested_government_role: null,
  requested_organization_name: null,
  rules_acknowledged_at: null,
  government_role_type: null,
};

const baseAccess: PortalAccess = {
  userId: 'user-1',
  email: 'casey@example.com',
  profile: mockProfile,
  isProfileApproved: true,
  isGlobalAdmin: true,
  iharcOrganizationId: 1,
  isIharcMember: true,
  orgRoles: [{ id: 'role-1', name: 'iharc_staff', displayName: 'IHARC Staff' }],
  orgPermissions: ['inventory.admin'],
  organizationId: 1,
  organizationName: 'IHARC',
  canAccessOpsAdmin: true,
  canAccessOpsSteviAdmin: true,
  canAccessOpsOrg: true,
  canAccessOpsFrontline: true,
  canManageResources: true,
  canManagePolicies: true,
  canAccessInventoryOps: true,
  canManageInventoryLocations: true,
  canManageNotifications: true,
  canReviewProfiles: true,
  canViewMetrics: true,
  canManageWebsiteContent: true,
  canManageSiteFooter: true,
  canManageConsents: true,
  canManageOrgUsers: true,
  canManageOrgInvites: true,
  actingOrgChoices: [],
  actingOrgChoicesCount: null,
  actingOrgAutoSelected: false,
};

const createSupabase = (user: Record<string, unknown> | null, error: Error | null = null): SupabaseAnyServerClient =>
  ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    },
  } as unknown as SupabaseAnyServerClient);

afterEach(() => {
  vi.clearAllMocks();
});

describe('ensureInventoryActor', () => {
  it('throws when the user is not signed in', async () => {
    const supabase = createSupabase(null);
    await expect(ensureInventoryActor(supabase)).rejects.toBeInstanceOf(InventoryAccessError);
    expect(loadPortalAccess).not.toHaveBeenCalled();
  });

  it('throws when no portal access could be loaded', async () => {
    const supabase = createSupabase({ id: 'user-1' });
    loadPortalAccess.mockResolvedValue(null);

    await expect(ensureInventoryActor(supabase)).rejects.toBeInstanceOf(InventoryAccessError);
  });

  it('throws when the user lacks inventory roles', async () => {
    const supabase = createSupabase({ id: 'user-2' });
    loadPortalAccess.mockResolvedValue({
      ...baseAccess,
      canAccessInventoryOps: false,
      canManageInventoryLocations: false,
      isGlobalAdmin: false,
    });

    await expect(ensureInventoryActor(supabase)).rejects.toBeInstanceOf(InventoryAccessError);
  });

  it('returns the profile and roles when authorized', async () => {
    const supabase = createSupabase({ id: 'user-1' });
    loadPortalAccess.mockResolvedValue(baseAccess);

    const actor = await ensureInventoryActor(supabase);
    expect(actor.profile.id).toBe('profile-1');
    expect(actor.canManageLocations).toBe(true);
    expect(actor.isGlobalAdmin).toBe(true);
  });

  it('redirects to login when configured to redirect on failure', async () => {
    const supabase = createSupabase(null);

    await expect(ensureInventoryActor(supabase, true)).rejects.toThrow('redirect:/login?next=%2Fops%2Finventory%3Fview%3Ddashboard');
    expect(redirectMock).toHaveBeenCalledWith('/login?next=%2Fops%2Finventory%3Fview%3Ddashboard');
  });
});

describe('requireInventoryAdmin', () => {
  it('throws when the caller is not an IHARC admin', () => {
    expect(() => requireInventoryAdmin(false)).toThrow(InventoryAccessError);
  });

  it('allows IHARC admins', () => {
    expect(() => requireInventoryAdmin(true)).not.toThrow();
  });
});
