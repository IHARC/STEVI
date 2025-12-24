import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchPersonConsents } from './fetchers';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

const mockFindPersonForUser = vi.fn();
const mockGetEffectiveConsent = vi.fn();
const mockListParticipatingOrganizations = vi.fn();
const mockListConsentOrgs = vi.fn();
const mockResolveConsentOrgSelections = vi.fn();

vi.mock('@/lib/cases/person', () => ({
  findPersonForUser: (...args: unknown[]) => mockFindPersonForUser(...args),
}));

vi.mock('@/lib/consents', () => ({
  getEffectiveConsent: (...args: unknown[]) => mockGetEffectiveConsent(...args),
  listParticipatingOrganizations: (...args: unknown[]) => mockListParticipatingOrganizations(...args),
  listConsentOrgs: (...args: unknown[]) => mockListConsentOrgs(...args),
  resolveConsentOrgSelections: (...args: unknown[]) => mockResolveConsentOrgSelections(...args),
}));

type QueryResult<T> = { data: T | null; error: Error | null };

function createQuery<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
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

describe('fetchPersonConsents', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns snapshot and consent history', async () => {
    mockFindPersonForUser.mockResolvedValue({
      id: 12,
      preferred_contact_method: 'email',
      privacy_restrictions: 'No voicemail.',
    });

    mockGetEffectiveConsent.mockResolvedValue({
      consent: {
        id: 'consent-1',
        personId: 12,
        consentType: 'data_sharing',
        scope: 'selected_orgs',
        status: 'active',
        capturedBy: null,
        capturedMethod: 'portal',
        policyVersion: null,
        notes: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
        revokedAt: null,
        revokedBy: null,
        expiresAt: '2025-03-01T00:00:00Z',
        restrictions: null,
      },
      scope: 'selected_orgs',
      status: 'active',
      effectiveStatus: 'active',
      expiresAt: '2025-03-01T00:00:00Z',
      isExpired: false,
    });

    mockListParticipatingOrganizations.mockResolvedValue([
      { id: 1, name: 'Alpha Org', organization_type: null, partnership_type: null, is_active: true },
    ]);
    mockListConsentOrgs.mockResolvedValue([
      {
        id: 'org-1',
        consentId: 'consent-1',
        organizationId: 1,
        allowed: true,
        setBy: null,
        setAt: '2025-01-01T00:00:00Z',
        reason: null,
      },
    ]);
    mockResolveConsentOrgSelections.mockReturnValue({
      allowedOrgIds: [1],
      blockedOrgIds: [],
      selections: [{ id: 1, name: 'Alpha Org', allowed: true }],
    });

    const supabase = createSupabaseMock({
      'core.person_consents': {
        data: [
          {
            id: 'consent-1',
            scope: 'selected_orgs',
            status: 'active',
            captured_method: 'portal',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            revoked_at: null,
            expires_at: '2025-03-01T00:00:00Z',
          },
        ],
        error: null,
      },
    });

    const result = await fetchPersonConsents(supabase, { userId: 'user-1', iharcOrgId: 99 });

    expect(result?.personId).toBe(12);
    expect(result?.snapshot.createdAt).toBe('2025-01-01T00:00:00Z');
    expect(result?.snapshot.allowedOrgIds).toEqual([1]);
    expect(result?.history).toHaveLength(1);
    expect(result?.history[0]).toMatchObject({
      id: 'consent-1',
      scope: 'selected_orgs',
      status: 'active',
      capturedMethod: 'portal',
      createdAt: '2025-01-01T00:00:00Z',
    });
  });

  it('returns null when no person is linked', async () => {
    mockFindPersonForUser.mockResolvedValue(null);
    const supabase = createSupabaseMock({});

    const result = await fetchPersonConsents(supabase, { userId: 'user-2', iharcOrgId: 99 });

    expect(result).toBeNull();
    expect(mockGetEffectiveConsent).not.toHaveBeenCalled();
  });
});
