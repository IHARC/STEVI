import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeAppointment } from '@/lib/appointments/actions';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PortalAccess } from '@/lib/portal-access';

const mockCreateSupabaseServerClient = vi.fn();
const mockLoadPortalAccess = vi.fn();
const mockEnsurePortalProfile = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockBuildEntityRef = vi.fn();
const mockResolveStaffRate = vi.fn();
const mockResolveCostCategoryIdByName = vi.fn();

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

vi.mock('@/lib/profile', () => ({
  ensurePortalProfile: (...args: unknown[]) => mockEnsurePortalProfile(...args),
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
  buildEntityRef: (...args: unknown[]) => mockBuildEntityRef(...args),
}));

vi.mock('@/lib/costs/queries', () => ({
  resolveStaffRate: (...args: unknown[]) => mockResolveStaffRate(...args),
  resolveCostCategoryIdByName: (...args: unknown[]) => mockResolveCostCategoryIdByName(...args),
}));

type AppointmentScopeRow = {
  id: string;
  client_profile_id: string;
  organization_id: number | null;
  staff_profile_id: string | null;
  staff_role?: string | null;
  duration_minutes?: number | null;
  occurs_at?: string | null;
};

function createSupabaseMock({
  appointmentRow,
  personLink,
  rpcResult,
}: {
  appointmentRow: AppointmentScopeRow;
  personLink: { person_id: number } | null;
  rpcResult: { data: Array<{ appointment_id: string; cost_event_id: string }> | null; error: Error | null };
}) {
  const appointmentQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: appointmentRow, error: null }),
  };

  const peopleQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: personLink, error: null }),
  };

  const portalRpc = vi.fn().mockResolvedValue(rpcResult);

  const supabase = {
    schema: vi.fn().mockImplementation((schema: string) => {
      if (schema === 'portal') {
        return {
          from: () => appointmentQuery,
          rpc: portalRpc,
        };
      }
      if (schema === 'core') {
        return {
          from: () => peopleQuery,
        };
      }
      return {};
    }),
  } as unknown as SupabaseAnyServerClient;

  return { supabase, portalRpc };
}

const baseAccess = {
  userId: 'user-1',
  profile: { id: 'profile-1' },
  organizationId: 9,
  canAccessOpsFrontline: true,
  canAccessOpsAdmin: false,
  canAccessOpsOrg: false,
} as unknown as PortalAccess;

const baseAppointment: AppointmentScopeRow = {
  id: 'appt-1',
  client_profile_id: 'client-1',
  organization_id: 9,
  staff_profile_id: 'staff-1',
  staff_role: 'outreach',
  duration_minutes: 120,
  occurs_at: '2025-01-01T10:00:00Z',
};

describe('completeAppointment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('completes appointment via rpc and logs audit entries', async () => {
    const { supabase, portalRpc } = createSupabaseMock({
      appointmentRow: baseAppointment,
      personLink: { person_id: 55 },
      rpcResult: { data: [{ appointment_id: 'appt-1', cost_event_id: 'cost-1' }], error: null },
    });

    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(baseAccess);
    mockEnsurePortalProfile.mockResolvedValue({ id: 'profile-1' });
    mockResolveStaffRate.mockResolvedValue({ hourly_rate: 75 });
    mockResolveCostCategoryIdByName.mockResolvedValue('cat-1');
    mockBuildEntityRef.mockReturnValue('ref');

    const formData = new FormData();
    formData.set('appointment_id', 'appt-1');
    formData.set('outcome_notes', 'Completed successfully.');

    const result = await completeAppointment(formData);

    expect(result.ok).toBe(true);
    expect(portalRpc).toHaveBeenCalledWith(
      'complete_appointment_with_costs',
      expect.objectContaining({ p_appointment_id: 'appt-1' }),
    );
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(2);
  });

  it('returns error and skips audit when rpc fails', async () => {
    const { supabase } = createSupabaseMock({
      appointmentRow: baseAppointment,
      personLink: { person_id: 55 },
      rpcResult: { data: null, error: new Error('RPC failed') },
    });

    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(baseAccess);
    mockEnsurePortalProfile.mockResolvedValue({ id: 'profile-1' });
    mockResolveStaffRate.mockResolvedValue({ hourly_rate: 75 });
    mockResolveCostCategoryIdByName.mockResolvedValue('cat-1');

    const formData = new FormData();
    formData.set('appointment_id', 'appt-1');
    formData.set('outcome_notes', 'Completed successfully.');

    const result = await completeAppointment(formData);

    expect(result.ok).toBe(false);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });
});
