import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUserMenuLinks, loadPortalAccess } from './portal-access';
import type { PortalProfile } from '@/lib/profile';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

const mockEnsurePortalProfile = vi.fn();

vi.mock('@/lib/profile', () => ({
  ensurePortalProfile: (...args: unknown[]) => mockEnsurePortalProfile(...args),
}));

const baseProfile: PortalProfile = {
  id: 'profile-42',
  user_id: 'user-1',
  display_name: 'Taylor Tester',
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
    rpcResults = {},
    orgResult = { data: { name: 'Org' }, error: null },
    iharcOrgResult = { data: { id: 99, name: 'IHARC', is_active: true }, error: null },
    accessibleOrgsResult = { data: [{ id: 10, name: 'Org', is_active: true }], error: null },
    userOrgRolesResult = { data: [{ organization_id: 10 }], error: null },
    userPeopleResult = { data: [{ person_id: 77 }], error: null },
    orgPeopleResult = { data: [{ organization_id: 10, end_date: null }], error: null },
    profileUpdateResult = { error: null },
  }: {
    user?: Record<string, unknown> | null;
    rpcResult?: { data: unknown; error: Error | null };
    rpcResults?: Record<string, { data: unknown; error: Error | null }>;
    orgResult?: { data: unknown; error: Error | null };
    iharcOrgResult?: { data: unknown; error: Error | null };
    accessibleOrgsResult?: { data: unknown; error: Error | null };
    userOrgRolesResult?: { data: unknown; error: Error | null };
    userPeopleResult?: { data: unknown; error: Error | null };
    orgPeopleResult?: { data: unknown; error: Error | null };
    profileUpdateResult?: { error: Error | null };
  },
): SupabaseAnyServerClient =>
  (() => {
    const profileUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(profileUpdateResult),
    });

    let orgIlikeActive = false;
    const orgQuery: Record<string, unknown> = {};
    Object.assign(orgQuery, {
      ilike: vi.fn().mockImplementation(() => {
        orgIlikeActive = true;
        return orgQuery;
      }),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(accessibleOrgsResult),
      maybeSingle: vi.fn().mockImplementation(() => {
        const result = orgIlikeActive ? iharcOrgResult : orgResult;
        orgIlikeActive = false;
        return Promise.resolve(result);
      }),
    });

    return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    rpc: vi.fn().mockImplementation((fnName: string) => {
      if (rpcResults && fnName in rpcResults) {
        return Promise.resolve(rpcResults[fnName]);
      }
      return Promise.resolve(rpcResult);
    }),
    schema: vi.fn().mockReturnValue({
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (rpcResults && fnName in rpcResults) {
          return Promise.resolve(rpcResults[fnName]);
        }
        return Promise.resolve(rpcResult);
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            update: profileUpdate,
          };
        }

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
          return {
            select: vi.fn().mockReturnValue(orgQuery),
          };
        }

        if (table === 'user_org_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(userOrgRolesResult),
            }),
          };
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue(orgResult) }),
          }),
        };
      }),
    }),
      __profileUpdate: profileUpdate,
    } as unknown as SupabaseAnyServerClient;
  })();

afterEach(() => {
  vi.clearAllMocks();
});

describe('loadPortalAccess', () => {
  it('derives capability flags from Supabase roles', async () => {
    const supabase = createSupabase({
      rpcResults: {
        get_actor_global_roles: { data: [{ role_name: 'iharc_admin' }], error: null },
        get_actor_permissions_summary: { data: ['portal.manage_org_users'], error: null },
        get_actor_org_roles: { data: [{ role_id: 'role-1', role_name: 'org_admin', role_display_name: 'Org Admin' }], error: null },
        get_actor_org_permissions: {
          data: [
            'portal.manage_org_users',
            'portal.manage_org_invites',
            'portal.access_frontline',
            'portal.access_org',
            'inventory.admin',
          ],
          error: null,
        },
      },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    const access = await loadPortalAccess(supabase);

    expect(access?.isGlobalAdmin).toBe(true);
    expect(access?.orgRoles.map((role) => role.name)).toEqual(['org_admin']);
    expect(access?.canAccessOpsAdmin).toBe(true);
    expect(access?.canAccessOpsSteviAdmin).toBe(true);
    expect(access?.canAccessOpsOrg).toBe(true);
    expect(access?.canAccessOpsFrontline).toBe(true);
    expect(access?.canAccessInventoryOps).toBe(true);
    expect(access?.profile.id).toBe('profile-42');
    expect(access?.organizationId).toBe(10);
    expect(access?.organizationName).toBe('Org');
  });

  it('grants inventory access to IHARC admins when inventory permissions are present', async () => {
    const supabase = createSupabase({
      rpcResults: {
        get_actor_global_roles: { data: [{ role_name: 'iharc_admin' }], error: null },
        get_actor_permissions_summary: { data: [], error: null },
        get_actor_org_roles: { data: [], error: null },
        get_actor_org_permissions: { data: ['inventory.admin'], error: null },
      },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    const access = await loadPortalAccess(supabase);
    expect(access?.canAccessInventoryOps).toBe(true);
  });

  it('defaults IHARC admins to the IHARC organization when no acting org is selected', async () => {
    const supabase = createSupabase({
      rpcResults: {
        get_actor_global_roles: { data: [{ role_name: 'iharc_admin' }], error: null },
        get_actor_permissions_summary: { data: ['portal.manage_org_users'], error: null },
        get_actor_org_roles: { data: [], error: null },
        get_actor_org_permissions: { data: [], error: null },
      },
      userPeopleResult: { data: [], error: null },
    }) as SupabaseAnyServerClient & { __profileUpdate: ReturnType<typeof vi.fn> };

    mockEnsurePortalProfile.mockResolvedValue({ ...baseProfile, organization_id: null });

    const access = await loadPortalAccess(supabase);

    expect(access?.organizationId).toBe(99);
    expect(access?.organizationName).toBe('IHARC');
    expect(access?.actingOrgChoices).toEqual([{ id: 99, name: 'IHARC' }]);
    expect(supabase.__profileUpdate).toHaveBeenCalledWith({ organization_id: 99, requested_organization_name: null });
  });

  it('returns null when no authenticated user is present', async () => {
    const supabase = createSupabase({ user: null });
    const access = await loadPortalAccess(supabase);
    expect(access).toBeNull();
  });

  it('surfaces a friendly error when role lookup fails', async () => {
    const supabase = createSupabase({
      rpcResults: { get_actor_global_roles: { data: null, error: new Error('rpc failure') } },
    });
    mockEnsurePortalProfile.mockResolvedValue(baseProfile);

    await expect(loadPortalAccess(supabase)).rejects.toThrow('Unable to load your roles right now.');
  });
});

describe('buildUserMenuLinks', () => {
  it('includes client preview for staff/admin users', async () => {
    const supabase = createSupabase({
      rpcResults: {
        get_actor_global_roles: { data: [], error: null },
        get_actor_permissions_summary: { data: ['portal.access_frontline'], error: null },
        get_actor_org_roles: { data: [], error: null },
        get_actor_org_permissions: { data: ['portal.access_frontline'], error: null },
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
      rpcResults: {
        get_actor_global_roles: { data: [], error: null },
        get_actor_permissions_summary: { data: [], error: null },
        get_actor_org_roles: { data: [], error: null },
        get_actor_org_permissions: { data: [], error: null },
      },
    });
    mockEnsurePortalProfile.mockResolvedValue({ ...baseProfile, affiliation_status: 'approved' });

    const access = await loadPortalAccess(supabase);
    const links = buildUserMenuLinks(access!);
    expect(links.some((link) => link.href === '/home?preview=1')).toBe(false);
    expect(links.find((link) => link.label === 'Profile')?.href).toBe('/profile');
  });
});
