import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCfsCallAction, triageCfsAction } from '@/app/(ops)/ops/cfs/actions';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PortalAccess } from '@/lib/portal-access';

const mockCreateSupabaseServerClient = vi.fn();
const mockLoadPortalAccess = vi.fn();
const mockQueuePortalNotification = vi.fn();

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

vi.mock('@/lib/notifications', () => ({
  queuePortalNotification: (...args: unknown[]) => mockQueuePortalNotification(...args),
}));

function createSupabaseMock(rpcResult: { data: unknown; error: Error | null }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);

  const supabase = {
    schema: vi.fn().mockReturnValue({
      rpc,
    }),
  } as unknown as SupabaseAnyServerClient;

  return { supabase, rpc };
}

const baseAccess = {
  userId: 'user-1',
  profile: { id: 'profile-1' },
  canTriageCfs: true,
} as unknown as PortalAccess;

const createAccess = {
  userId: 'user-1',
  profile: { id: 'profile-1' },
  organizationId: 9,
  canCreateCfs: true,
} as unknown as PortalAccess;

describe('triageCfsAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('skips notification when rpc fails', async () => {
    const { supabase, rpc } = createSupabaseMock({ data: null, error: new Error('RPC failed') });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(baseAccess);

    const formData = new FormData();
    formData.set('cfs_id', '123');
    formData.set('report_priority_assessment', 'routine');

    const result = await triageCfsAction({ status: 'idle' }, formData);

    expect(rpc).toHaveBeenCalledOnce();
    expect('ok' in result).toBe(true);
    if ('ok' in result) {
      expect(result.ok).toBe(false);
    }
    expect(mockQueuePortalNotification).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid input', async () => {
    const { supabase } = createSupabaseMock({ data: null, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(baseAccess);

    const formData = new FormData();
    const result = await triageCfsAction({ status: 'idle' }, formData);

    expect('ok' in result).toBe(true);
    if ('ok' in result && !result.ok) {
      expect(result.fieldErrors?.cfs_id).toBeTruthy();
    }
  });
});

describe('createCfsCallAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns error and skips notification when rpc fails', async () => {
    const { supabase, rpc } = createSupabaseMock({ data: null, error: new Error('RPC failed') });
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);
    mockLoadPortalAccess.mockResolvedValue(createAccess);

    const formData = new FormData();
    formData.set('initial_report_narrative', 'Caller reported a concern near the downtown area.');
    formData.set('anonymous_reporter', 'false');
    formData.set('notify_opt_in', 'true');
    formData.set('notify_channel', 'email');
    formData.set('notify_target', 'reporter@example.com');
    formData.set('public_tracking_enabled', 'false');

    const result = await createCfsCallAction({ status: 'idle' }, formData);

    expect(rpc).toHaveBeenCalledOnce();
    expect('ok' in result).toBe(true);
    if ('ok' in result) {
      expect(result.ok).toBe(false);
    }
    expect(mockQueuePortalNotification).not.toHaveBeenCalled();
  });
});
