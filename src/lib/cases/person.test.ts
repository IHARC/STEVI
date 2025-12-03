import { describe, expect, it, vi } from 'vitest';
import { findPersonForUser, requirePersonForUser } from './person';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

type QueryResult<T> = { data: T | null; error: Error | null };

const mockGetGrantScopes = vi.fn().mockResolvedValue(['case_view']);

vi.mock('@/lib/enum-values', () => ({
  getGrantScopes: (...args: unknown[]) => mockGetGrantScopes(...args),
}));

function createQuery<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function createSupabaseMock(tableResults: Record<string, QueryResult<unknown>>): SupabaseAnyServerClient {
  return {
    schema: vi.fn().mockReturnValue({
      from: (table: string) => createQuery(tableResults[table] ?? { data: null, error: null }),
    }),
  } as unknown as SupabaseAnyServerClient;
}

describe('findPersonForUser', () => {
  it('returns the person linked directly via user_people', async () => {
    const supabase = createSupabaseMock({
      user_people: { data: { person_id: 99 }, error: null },
      people: { data: { id: 99, first_name: 'Pat' }, error: null },
    });

    const person = await findPersonForUser(supabase, 'user-1');
    expect(person).toEqual({ id: 99, first_name: 'Pat' });
  });

  it('returns the person linked via grant when no direct link exists', async () => {
    const supabase = createSupabaseMock({
      user_people: { data: null, error: null },
      person_access_grants: { data: { person_id: 42 }, error: null },
      people: { data: { id: 42, first_name: 'Casey' }, error: null },
    });

    const person = await findPersonForUser(supabase, 'user-1');
    expect(person).toEqual({ id: 42, first_name: 'Casey' });
  });

  it('throws a stable error when grant lookup fails', async () => {
    const supabase = createSupabaseMock({
      person_access_grants: { data: null, error: new Error('grant failure') },
    });

    await expect(findPersonForUser(supabase, 'user-1')).rejects.toThrow(
      'Unable to resolve access grants right now.',
    );
  });

  it('throws when no person record can be resolved', async () => {
    const supabase = createSupabaseMock({
      person_access_grants: { data: null, error: null },
      people: { data: null, error: null },
    });

    await expect(requirePersonForUser(supabase, 'user-1')).rejects.toThrow(
      'Your profile has not been onboarded to case management yet.',
    );
  });
});
