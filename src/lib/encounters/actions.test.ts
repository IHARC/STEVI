import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEncounter } from '@/lib/encounters/actions';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PortalAccess } from '@/lib/portal-access';
import type { Database } from '@/types/supabase';

const mockCreateSupabaseServerClient = vi.fn();
const mockLoadPortalAccess = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockBuildEntityRef = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
}));

vi.mock('@/lib/portal-access', async () => {
  const actual = await vi.importActual<typeof import('@/lib/portal-access')>('@/lib/portal-access');
  return {
    ...actual,
    loadPortalAccess: (...args: unknown[]) => mockLoadPortalAccess(...args),
  };
});

vi.mock('@/lib/audit', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
  buildEntityRef: (...args: unknown[]) => mockBuildEntityRef(...args),
}));

type EncounterRow = Database['case_mgmt']['Tables']['encounters']['Row'];

function createSupabaseMock(result: { data: EncounterRow | null; error: Error | null }) {
  const query = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };

  const supabase = {
    schema: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    }),
  } as unknown as SupabaseAnyServerClient;

  return { supabase, query };
}

const baseAccess = {
  userId: 'user-1',
  profile: { id: 'profile-1' },
  organizationId: 45,
  canAccessOpsFrontline: true,
} as unknown as PortalAccess;

const baseEncounterRow: EncounterRow = {
  id: 'enc-1',
  person_id: 12,
  case_id: 34,
  owning_org_id: 45,
  encounter_type: 'outreach',
  started_at: '2025-01-01T00:00:00Z',
  ended_at: null,
  location_context: null,
  program_context: null,
  summary: null,
  notes: null,
  recorded_by_profile_id: 'profile-1',
  recorded_at: '2025-01-01T00:00:00Z',
  source: 'staff_observed',
  verification_status: 'unverified',
  sensitivity_level: 'standard',
  visibility_scope: 'internal_to_org',
  created_at: '2025-01-01T00:00:00Z',
  created_by: 'user-1',
  updated_at: null,
  updated_by: null,
};

describe('createEncounter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates encounters with defaults and logs audit', async () => {
    const { supabase, query } = createSupabaseMock({ data: baseEncounterRow, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(baseAccess);
    mockBuildEntityRef.mockReturnValue('case_mgmt.encounters:enc-1');

    const result = await createEncounter({
      personId: 12,
      caseId: 34,
      encounterType: 'invalid',
      summary: 'Initial intake',
    });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        person_id: 12,
        case_id: 34,
        owning_org_id: 45,
        encounter_type: 'outreach',
        summary: 'Initial intake',
        visibility_scope: 'internal_to_org',
        sensitivity_level: 'standard',
      }),
    );
    expect(result).toMatchObject({
      id: 'enc-1',
      personId: 12,
      caseId: 34,
      owningOrgId: 45,
      encounterType: 'outreach',
    });
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
  });

  it('throws when staff access is missing', async () => {
    const { supabase } = createSupabaseMock({ data: baseEncounterRow, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(null);

    await expect(
      createEncounter({
        personId: 12,
        caseId: null,
        encounterType: 'outreach',
      }),
    ).rejects.toThrow('You need staff access to create encounters.');
  });
});
