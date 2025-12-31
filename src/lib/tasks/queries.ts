import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { TaskRow, TaskSummary } from '@/lib/tasks/types';

const CASE_SCHEMA = 'case_mgmt';
const TASKS_TABLE = 'tasks';

function toTaskSummary(row: TaskRow): TaskSummary {
  return {
    id: row.id,
    personId: row.person_id,
    caseId: row.case_id ?? null,
    encounterId: row.encounter_id ?? null,
    owningOrgId: row.owning_org_id,
    assignedToProfileId: row.assigned_to_profile_id ?? null,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at ?? null,
    title: row.title,
    description: row.description ?? null,
    visibilityScope: row.visibility_scope,
    sensitivityLevel: row.sensitivity_level,
  };
}

export async function fetchTasksForPerson(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 50,
): Promise<TaskSummary[]> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(TASKS_TABLE)
    .select('*')
    .eq('person_id', personId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load tasks for person', { personId, error });
    throw new Error('Unable to load tasks right now.');
  }

  return (data ?? []).map((row: TaskRow) => toTaskSummary(row));
}

export async function fetchTasksForAssignee(
  supabase: SupabaseAnyServerClient,
  profileId: string,
  limit = 100,
): Promise<Array<TaskSummary & { clientName: string }>> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(TASKS_TABLE)
    .select('*, people:people (first_name, last_name)')
    .eq('assigned_to_profile_id', profileId)
    .in('status', ['open', 'in_progress', 'blocked'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load assignee tasks', { profileId, error });
    throw new Error('Unable to load tasks right now.');
  }

  return (data ?? []).map((row: TaskRow & { people?: { first_name?: string | null; last_name?: string | null } }) => {
    const task = toTaskSummary(row as TaskRow);
    const nameParts = [row.people?.first_name ?? '', row.people?.last_name ?? ''].filter(Boolean);
    const clientName = nameParts.join(' ').trim() || `Person ${task.personId}`;
    return { ...task, clientName };
  });
}

export async function fetchTasksForOrg(
  supabase: SupabaseAnyServerClient,
  owningOrgId: number,
  limit = 100,
): Promise<Array<TaskSummary & { clientName: string }>> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(TASKS_TABLE)
    .select('*, people:people (first_name, last_name)')
    .eq('owning_org_id', owningOrgId)
    .in('status', ['open', 'in_progress', 'blocked'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load org tasks', { owningOrgId, error });
    throw new Error('Unable to load tasks right now.');
  }

  return (data ?? []).map((row: TaskRow & { people?: { first_name?: string | null; last_name?: string | null } }) => {
    const task = toTaskSummary(row as TaskRow);
    const nameParts = [row.people?.first_name ?? '', row.people?.last_name ?? ''].filter(Boolean);
    const clientName = nameParts.join(' ').trim() || `Person ${task.personId}`;
    return { ...task, clientName };
  });
}

export async function fetchTasksForEncounter(
  supabase: SupabaseAnyServerClient,
  encounterId: string,
  limit = 50,
): Promise<TaskSummary[]> {
  const { data, error } = await supabase
    .schema(CASE_SCHEMA)
    .from(TASKS_TABLE)
    .select('*')
    .eq('encounter_id', encounterId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load tasks for encounter', { encounterId, error });
    throw new Error('Unable to load encounter tasks right now.');
  }

  return (data ?? []).map((row: TaskRow) => toTaskSummary(row));
}
