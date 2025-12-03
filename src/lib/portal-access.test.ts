import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPortalAccess } from './portal-access';
import type { PortalProfile } from '@/lib/profile';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

const mockEnsurePortalProfile = vi.fn();
const mockGetInventoryRoles = vi.fn().mockResolvedValue(['iharc_staff']);

vi.mock('@/lib/profile', () => ({
  ensurePortalProfile: (...args: unknown[]) => mockEnsurePortalProfile(...args),
}));

vi.mock('@/lib/enum-values', () => ({
  getInventoryRoles: (...args: unknown[]) => mockGetInventoryRoles(...args),
}));

const baseProfile: PortalProfile = {
  id: 'profile-42',
  user_id: 'user-1',
  display_name: 'Taylor Tester',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  affiliation_status: 'approved',
  affiliation_type: 'community_member',
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
  organization_id: 10,
  petition_signed_at: null,
  position_title: 'Member',
  requested_government_level: null,
  requested_government_name: null,
  requested_government_role: null,
  requested_organization_name: null,
  rules_acknowledged_at: null,
  government_role_type: null,
};

const createSupabase = (
  {
    user = { id: 'user-1', email: 'taylor@example.com' },
    rpcResult = { data: [], error: null },
  }: {
    user?: Record<string, unknown> | null;
    rpcResult?: { data: unknown; error: Error | null };
  },
): SupabaseAnyServerClient =>
  ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as SupabaseAnyServerClient);

afterEach(() => {
  vi.clearAllMocks();
});

describe('loadPortalAccess', () => {
  it('derives capability flags from Supabase roles', async () => {
    const supabase = createSupabase({
      rpcResult: {
        data: [{ role_name: 'portal_admin' }, { role_name: 'iharc_staff' }, 'portal_org_admin'],
        error: null,
      },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    const access = await loadPortalAccess(supabase);

    expect(access?.portalRoles).toEqual(['portal_admin', 'portal_org_admin']);
    expect(access?.iharcRoles).toEqual(['iharc_staff']);
    expect(access?.canAccessAdminWorkspace).toBe(true);
    expect(access?.canAccessOrgWorkspace).toBe(true);
    expect(access?.canAccessInventoryWorkspace).toBe(true);
    expect(access?.profile.id).toBe('profile-42');
    expect(access?.organizationId).toBe(10);
  });

  it('returns null when no authenticated user is present', async () => {
    const supabase = createSupabase({ user: null });
    const access = await loadPortalAccess(supabase);
    expect(access).toBeNull();
  });

  it('surfaces a friendly error when get_user_roles fails', async () => {
    const supabase = createSupabase({
      rpcResult: { data: null, error: new Error('rpc failure') },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    await expect(loadPortalAccess(supabase)).rejects.toThrow('Unable to load your roles right now.');
  });
});
