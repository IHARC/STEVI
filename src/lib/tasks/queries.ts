import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { TaskRow, TaskSummary } from '@/lib/tasks/types';

const CASE_SCHEMA = 'case_mgmt';
const TASKS_TABLE = 'tasks';
const CORE_SCHEMA = 'core';
const PEOPLE_TABLE = 'people';

type PersonNameRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
};

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

async function fetchPeopleForTasks(
  supabase: SupabaseAnyServerClient,
  personIds: number[],
): Promise<Map<number, PersonNameRow>> {
  if (personIds.length === 0) return new Map();

  const { data, error } = await supabase
    .schema(CORE_SCHEMA)
    .from(PEOPLE_TABLE)
    .select('id, first_name, last_name')
    .in('id', personIds)
    .limit(personIds.length);

  if (error) {
    console.error('Failed to load people for tasks', { personIds, error });
    throw new Error('Unable to load tasks right now.');
  }

  const byId = new Map<number, PersonNameRow>();
  const rows = (data ?? []) as PersonNameRow[];
  rows.forEach((person) => {
    byId.set(person.id, person);
  });

  return byId;
}

function resolveClientName(person: PersonNameRow | undefined, personId: number): string {
  const nameParts = [person?.first_name ?? '', person?.last_name ?? ''].filter(Boolean);
  return nameParts.join(' ').trim() || `Person ${personId}`;
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
    .select('*')
    .eq('assigned_to_profile_id', profileId)
    .in('status', ['open', 'in_progress', 'blocked'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load assignee tasks', { profileId, error });
    throw new Error('Unable to load tasks right now.');
  }

  const rows = (data ?? []) as TaskRow[];
  const personIds = Array.from(new Set(rows.map((row) => row.person_id)));
  const peopleById = await fetchPeopleForTasks(supabase, personIds);

  return rows.map((row) => {
    const task = toTaskSummary(row);
    const clientName = resolveClientName(peopleById.get(row.person_id), row.person_id);
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
    .select('*')
    .eq('owning_org_id', owningOrgId)
    .in('status', ['open', 'in_progress', 'blocked'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load org tasks', { owningOrgId, error });
    throw new Error('Unable to load tasks right now.');
  }

  const rows = (data ?? []) as TaskRow[];
  const personIds = Array.from(new Set(rows.map((row) => row.person_id)));
  const peopleById = await fetchPeopleForTasks(supabase, personIds);

  return rows.map((row) => {
    const task = toTaskSummary(row);
    const clientName = resolveClientName(peopleById.get(row.person_id), row.person_id);
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
