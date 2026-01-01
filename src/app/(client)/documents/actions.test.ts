import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDocumentLinkAction } from '@/app/(client)/documents/actions';

const mockCreateSupabaseServerClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
}));

vi.mock('@/lib/portal-access', () => ({
  loadPortalAccess: vi.fn(),
}));

vi.mock('@/lib/onboarding/guard', () => ({
  assertOnboardingComplete: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  queuePortalNotification: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
  buildEntityRef: vi.fn(),
}));

describe('requestDocumentLinkAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns field errors when path is missing', async () => {
    const formData = new FormData();

    const result = await requestDocumentLinkAction({ status: 'idle' }, formData);

    expect('ok' in result).toBe(true);
    if ('ok' in result && !result.ok) {
      expect(result.fieldErrors?.path).toBeTruthy();
    }
  });

  it('returns field errors when reason is too long', async () => {
    const formData = new FormData();
    formData.set('path', 'documents/example.pdf');
    formData.set('reason', 'x'.repeat(501));

    const result = await requestDocumentLinkAction({ status: 'idle' }, formData);

    expect('ok' in result).toBe(true);
    if ('ok' in result && !result.ok) {
      expect(result.fieldErrors?.reason).toBeTruthy();
    }
  });
});
