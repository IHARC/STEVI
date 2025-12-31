'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import type { TaskPriority, TaskStatus, TaskSummary } from '@/lib/tasks/types';

export type TaskFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  taskId?: string;
};

const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];
const STATUSES: TaskStatus[] = ['open', 'in_progress', 'blocked', 'done', 'canceled'];

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Provide a valid due date.');
  }
  return parsed.toISOString();
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export async function createTask(input: {
  personId: number;
  caseId?: number | null;
  encounterId?: string | null;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: TaskPriority;
  assignedToProfileId?: string | null;
  visibilityScope?: string;
  sensitivityLevel?: string;
  sourceType?: string | null;
  sourceId?: string | null;
}): Promise<TaskSummary> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You need staff access to create tasks.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before creating tasks.');

  const priority = parseEnum(input.priority ?? null, PRIORITIES, 'normal');
  const visibilityScope = parseEnum(
    input.visibilityScope ?? null,
    ['internal_to_org', 'shared_via_consent'] as const,
    'internal_to_org',
  );
  const sensitivityLevel = parseEnum(
    input.sensitivityLevel ?? null,
    ['standard', 'sensitive', 'high', 'restricted'] as const,
    'standard',
  );

  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('tasks')
    .insert({
      person_id: input.personId,
      case_id: input.caseId ?? null,
      encounter_id: input.encounterId ?? null,
      owning_org_id: access.organizationId,
      assigned_to_profile_id: input.assignedToProfileId ?? access.profile.id,
      status: 'open',
      priority,
      due_at: input.dueAt ?? null,
      title: input.title,
      description: input.description ?? null,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      recorded_by_profile_id: access.profile.id,
      recorded_at: new Date().toISOString(),
      visibility_scope: visibilityScope,
      sensitivity_level: sensitivityLevel,
      created_by: access.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Failed to create task', error);
    throw new Error('Unable to create the task right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'task_created',
    entityType: 'case_mgmt.tasks',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'tasks', id: data.id }),
    meta: {
      person_id: data.person_id,
      case_id: data.case_id,
      encounter_id: data.encounter_id,
      owning_org_id: data.owning_org_id,
      due_at: data.due_at,
    },
  });

  return {
    id: data.id,
    personId: data.person_id,
    caseId: data.case_id ?? null,
    encounterId: data.encounter_id ?? null,
    owningOrgId: data.owning_org_id,
    assignedToProfileId: data.assigned_to_profile_id ?? null,
    status: data.status,
    priority: data.priority,
    dueAt: data.due_at ?? null,
    title: data.title,
    description: data.description ?? null,
    visibilityScope: data.visibility_scope,
    sensitivityLevel: data.sensitivity_level,
  };
}

export async function createTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) return { status: 'error', message: 'Select a person for this task.' };

    const title = parseOptionalString(formData.get('title')) ?? '';
    if (!title || title.length < 3) return { status: 'error', message: 'Add a short task title.' };

    const description = parseOptionalString(formData.get('description'));
    const dueAt = parseOptionalDate(formData.get('due_at'));
    const priority = parseEnum(parseOptionalString(formData.get('priority')), PRIORITIES, 'normal');
    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));
    const assignedToProfileId = parseOptionalString(formData.get('assigned_to_profile_id'));
    const visibilityScope = parseOptionalString(formData.get('visibility_scope')) ?? 'internal_to_org';
    const sensitivityLevel = parseOptionalString(formData.get('sensitivity_level')) ?? 'standard';

    const task = await createTask({
      personId,
      caseId,
      encounterId,
      title,
      description: description ?? null,
      dueAt: dueAt ?? null,
      priority,
      assignedToProfileId: assignedToProfileId ?? undefined,
      visibilityScope,
      sensitivityLevel,
    });

    revalidatePath(`/ops/clients/${personId}?tab=overview`);
    revalidatePath('/ops/clients?view=activity');
    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }

    return { status: 'success', taskId: task.id };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to create task.' };
  }
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You need staff access to update tasks.');
  }

  const nextStatus = parseEnum(status, STATUSES, 'open');
  const updatePayload: Record<string, string | null> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
    updated_by: access.userId,
    completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .select('id, person_id, case_id')
    .single();

  if (error || !data) {
    throw new Error('Unable to update this task right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'task_status_updated',
    entityType: 'case_mgmt.tasks',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'tasks', id: taskId }),
    meta: {
      person_id: data.person_id,
      case_id: data.case_id,
      status: nextStatus,
    },
  });

  revalidatePath(`/ops/clients/${data.person_id}?tab=overview`);
  revalidatePath('/ops/clients?view=activity');
}
