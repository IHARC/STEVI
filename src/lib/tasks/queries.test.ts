import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTasksForAssignee, fetchTasksForEncounter } from '@/lib/tasks/queries';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { TaskRow } from '@/lib/tasks/types';

type QueryResult<T> = { data: T | null; error: Error | null };

function createQuery<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
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

const baseTaskRow: TaskRow = {
  id: 'task-1',
  person_id: 101,
  case_id: null,
  encounter_id: null,
  owning_org_id: 22,
  assigned_to_profile_id: 'profile-1',
  status: 'open',
  priority: 'normal',
  due_at: null,
  title: 'Follow up',
  description: null,
  source_type: null,
  source_id: null,
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
  completed_at: null,
};

describe('task queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns assignee tasks with display names', async () => {
    const rows: TaskRow[] = [
      {
        ...baseTaskRow,
        id: 'task-1',
        person_id: 101,
      },
      {
        ...baseTaskRow,
        id: 'task-2',
        person_id: 202,
      },
    ];

    const supabase = createSupabaseMock({
      'case_mgmt.tasks': { data: rows, error: null },
      'core.people': {
        data: [
          { id: 101, first_name: 'Pat', last_name: 'Lee' },
          { id: 202, first_name: null, last_name: null },
        ],
        error: null,
      },
    });

    const result = await fetchTasksForAssignee(supabase, 'profile-1', 200);

    expect(result).toHaveLength(2);
    expect(result[0].clientName).toBe('Pat Lee');
    expect(result[1].clientName).toBe('Person 202');
  });

  it('throws when assignee query fails', async () => {
    const supabase = createSupabaseMock({
      'case_mgmt.tasks': { data: null, error: new Error('fail') },
    });

    await expect(fetchTasksForAssignee(supabase, 'profile-1', 200)).rejects.toThrow('Unable to load tasks right now.');
  });

  it('returns encounter tasks', async () => {
    const rows = [{ ...baseTaskRow, id: 'task-3', encounter_id: 'enc-1' }];
    const supabase = createSupabaseMock({
      'case_mgmt.tasks': { data: rows, error: null },
    });

    const result = await fetchTasksForEncounter(supabase, 'enc-1', 10);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task-3');
    expect(result[0].encounterId).toBe('enc-1');
  });
});
