import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUserMenuLinks, loadPortalAccess } from './portal-access';
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
    orgResult = { data: { name: 'Org' }, error: null },
    accessibleOrgsResult = { data: [{ id: 10, name: 'Org', is_active: true }], error: null },
    userPeopleResult = { data: [{ person_id: 77 }], error: null },
    orgPeopleResult = { data: [{ organization_id: 10, end_date: null }], error: null },
  }: {
    user?: Record<string, unknown> | null;
    rpcResult?: { data: unknown; error: Error | null };
    orgResult?: { data: unknown; error: Error | null };
    accessibleOrgsResult?: { data: unknown; error: Error | null };
    userPeopleResult?: { data: unknown; error: Error | null };
    orgPeopleResult?: { data: unknown; error: Error | null };
  },
): SupabaseAnyServerClient =>
  ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue(rpcResult),
    schema: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'user_people') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(userPeopleResult),
            }),
          };
        }

        if (table === 'organization_people') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue(orgPeopleResult),
              }),
            }),
          };
        }

        if (table === 'organizations') {
          const orgQuery = {
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue(accessibleOrgsResult),
            maybeSingle: vi.fn().mockResolvedValue(orgResult),
          };

          return {
            select: vi.fn().mockReturnValue(orgQuery),
          };
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue(orgResult) }),
          }),
        };
      }),
    }),
  } as unknown as SupabaseAnyServerClient);

afterEach(() => {
  vi.clearAllMocks();
});

describe('loadPortalAccess', () => {
  it('derives capability flags from Supabase roles', async () => {
    const supabase = createSupabase({
      rpcResult: {
        data: [{ role_name: 'iharc_admin' }, { role_name: 'iharc_staff' }, 'portal_org_admin'],
        error: null,
      },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    const access = await loadPortalAccess(supabase);

    expect(access?.portalRoles).toEqual(['portal_org_admin']);
    expect(access?.iharcRoles).toEqual(['iharc_admin', 'iharc_staff']);
    expect(access?.canAccessOpsAdmin).toBe(true);
    expect(access?.canAccessOpsHq).toBe(true);
    expect(access?.canAccessOpsOrg).toBe(true);
    expect(access?.canAccessOpsFrontline).toBe(true);
    expect(access?.canAccessInventoryOps).toBe(true);
    expect(access?.profile.id).toBe('profile-42');
    expect(access?.organizationId).toBe(10);
    expect(access?.organizationName).toBe('Org');
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

describe('buildUserMenuLinks', () => {
  it('includes client preview for staff/admin users', async () => {
    const supabase = createSupabase({
      rpcResult: {
        data: [{ role_name: 'iharc_staff' }],
        error: null,
      },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    const access = await loadPortalAccess(supabase);
    const links = buildUserMenuLinks(access!);
    expect(links.some((link) => link.href === '/home?preview=1')).toBe(true);
    expect(links.find((link) => link.label === 'Profile')?.href).toBe('/ops/profile');
  });

  it('omits client preview for client-only users', async () => {
    const supabase = createSupabase({
      rpcResult: {
        data: [],
        error: null,
      },
    });
    mockEnsurePortalProfile.mockResolvedValue({ ...baseProfile, affiliation_status: 'approved' });

    const access = await loadPortalAccess(supabase);
    const links = buildUserMenuLinks(access!);
    expect(links.some((link) => link.href === '/home?preview=1')).toBe(false);
    expect(links.find((link) => link.label === 'Profile')?.href).toBe('/profile');
  });
});
