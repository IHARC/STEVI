import { describe, expect, it, vi } from 'vitest';
import { getOnboardingStatus } from './status';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

type QueryResult<T> = { data: T | null; error: Error | null };

function createQuery<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function createSupabaseMock(tableResults: Record<string, QueryResult<unknown>>): SupabaseAnyServerClient {
  return {
    schema: vi.fn().mockImplementation((schema: string) => ({
      from: (table: string) =>
        createQuery(tableResults[`${schema}.${table}`] ?? { data: null, error: null }),
    })),
  } as unknown as SupabaseAnyServerClient;
}

describe('getOnboardingStatus', () => {
  it('returns completed when the person is active and all consents exist', async () => {
    const supabase = createSupabaseMock({
      'portal.profiles': { data: { id: 'profile-1' }, error: null },
      'core.user_people': {
        data: { person_id: 10, profile_id: 'profile-1', linked_at: '2025-01-02T10:00:00Z' },
        error: null,
      },
      'core.people': {
        data: {
          id: 10,
          status: 'active',
          updated_at: '2025-01-02T12:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
        },
        error: null,
      },
      'core.person_consents': {
        data: {
          id: 'consent-1',
          person_id: 10,
          status: 'active',
          scope: 'all_orgs',
          expires_at: '2026-01-02T00:00:00Z',
          created_at: '2025-01-02T08:00:00Z',
          updated_at: null,
        },
        error: null,
      },
      'case_mgmt.client_intakes': {
        data: {
          id: 5,
          consent_confirmed: true,
          privacy_acknowledged: true,
          created_at: '2025-01-03T00:00:00Z',
        },
        error: null,
      },
    });

    const status = await getOnboardingStatus({ userId: 'user-1' }, supabase);

    expect(status.status).toBe('COMPLETED');
    expect(status.hasPerson).toBe(true);
    expect(status.hasIntake).toBe(true);
    expect(status.hasDataSharingPreference).toBe(true);
    expect(status.personId).toBe(10);
    expect(status.profileId).toBe('profile-1');
    expect(status.lastUpdatedAt).toBe('2025-01-03T00:00:00Z');
  });

  it('flags missing consent fields as needs consents', async () => {
    const supabase = createSupabaseMock({
      'portal.profiles': { data: { id: 'profile-2' }, error: null },
      'core.user_people': {
        data: { person_id: 22, profile_id: 'profile-2', linked_at: '2025-01-01T00:00:00Z' },
        error: null,
      },
      'core.people': {
        data: {
          id: 22,
          status: 'active',
          updated_at: '2025-01-02T00:00:00Z',
          created_at: '2024-12-31T00:00:00Z',
        },
        error: null,
      },
      'core.person_consents': { data: null, error: null },
      'case_mgmt.client_intakes': {
        data: {
          id: 8,
          consent_confirmed: false,
          privacy_acknowledged: true,
          created_at: '2025-01-02T12:00:00Z',
        },
        error: null,
      },
    });

    const status = await getOnboardingStatus({ userId: 'user-2' }, supabase);

    expect(status.status).toBe('NEEDS_CONSENTS');
    expect(status.hasServiceAgreementConsent).toBe(false);
    expect(status.hasPrivacyAcknowledgement).toBe(true);
    expect(status.hasDataSharingPreference).toBe(false);
    expect(status.hasPerson).toBe(true);
    expect(status.personId).toBe(22);
  });

  it('returns not started when no person link exists and surfaces latest registration flow timestamp', async () => {
    const supabase = createSupabaseMock({
      'portal.profiles': { data: null, error: null },
      'core.user_people': { data: null, error: null },
      'core.people': { data: null, error: null },
      'case_mgmt.client_intakes': { data: null, error: null },
      'portal.registration_flows': {
        data: {
          id: 'flow-1',
          updated_at: '2025-01-05T15:00:00Z',
          created_at: '2025-01-04T10:00:00Z',
        },
        error: null,
      },
    });

    const status = await getOnboardingStatus({ userId: 'user-3' }, supabase);

    expect(status.status).toBe('NOT_STARTED');
    expect(status.hasPerson).toBe(false);
    expect(status.personId).toBeNull();
    expect(status.lastUpdatedAt).toBe('2025-01-05T15:00:00Z');
  });

  it('treats inactive people as not started even when consents exist', async () => {
    const supabase = createSupabaseMock({
      'portal.profiles': { data: { id: 'profile-3' }, error: null },
      'core.user_people': {
        data: { person_id: 33, profile_id: 'profile-3', linked_at: '2025-01-02T00:00:00Z' },
        error: null,
      },
      'core.people': {
        data: {
          id: 33,
          status: 'inactive',
          updated_at: '2025-01-03T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
        },
        error: null,
      },
      'core.person_consents': {
        data: {
          id: 'consent-2',
          person_id: 33,
          status: 'active',
          scope: 'all_orgs',
          expires_at: '2026-01-02T00:00:00Z',
          created_at: '2025-01-02T08:00:00Z',
          updated_at: null,
        },
        error: null,
      },
      'case_mgmt.client_intakes': {
        data: {
          id: 11,
          consent_confirmed: true,
          privacy_acknowledged: true,
          created_at: '2025-01-02T00:00:00Z',
        },
        error: null,
      },
    });

    const status = await getOnboardingStatus({ userId: 'user-4' }, supabase);

    expect(status.status).toBe('NOT_STARTED');
    expect(status.hasPerson).toBe(false);
    expect(status.hasIntake).toBe(true);
  });

  it('throws when neither a user id nor person id is provided', async () => {
    await expect(getOnboardingStatus({})).rejects.toThrow('Onboarding status requires a user id or person id.');
  });
});
