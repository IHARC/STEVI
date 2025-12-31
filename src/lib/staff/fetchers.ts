import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import { fetchTasksForAssignee } from '@/lib/tasks/queries';

export type StaffCase = {
  id: string;
  clientName: string;
  status: string;
  nextStep: string | null;
  nextAt: string | null;
};

export type StaffShift = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
};

export type OutreachLog = {
  id: string;
  title: string;
  summary: string | null;
  location: string | null;
  occurredAt: string;
};

const CORE_SCHEMA = 'core';
const SHIFTS_RPC = 'staff_shifts_today';
const OUTREACH_RPC = 'staff_outreach_logs';

export async function fetchStaffCaseload(
  supabase: SupabaseAnyServerClient,
  staffProfileId: string,
): Promise<StaffCase[]> {
  if (!staffProfileId) return [];

  try {
    const tasks = await fetchTasksForAssignee(supabase, staffProfileId, 200);
    const seen = new Set<number>();
    const caseload: StaffCase[] = [];

    for (const task of tasks) {
      if (seen.has(task.personId)) continue;
      seen.add(task.personId);
      caseload.push({
        id: String(task.personId),
        clientName: task.clientName ?? 'Client',
        status: task.status,
        nextStep: task.title,
        nextAt: task.dueAt ?? null,
      });
      if (caseload.length >= 50) break;
    }

    return caseload;
  } catch (error) {
    console.error('Failed to load staff caseload', error);
    throw new Error('Unable to load caseload right now.');
  }
}

export async function fetchStaffShifts(
  supabase: SupabaseAnyServerClient,
  staffUserId: string,
): Promise<StaffShift[]> {
  const core = supabase.schema(CORE_SCHEMA);
  const { data, error } = await core.rpc(SHIFTS_RPC, {
    staff_uuid: staffUserId,
  });

  if (error) {
    console.error('Failed to load staff shifts', error);
    throw new Error('Unable to load today’s shifts right now.');
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: (row.title as string | undefined) ?? 'Shift',
    location: (row.location as string | undefined) ?? 'Location pending',
    startsAt: (row.starts_at as string | undefined) ?? '',
    endsAt: (row.ends_at as string | undefined) ?? '',
  }));
}

export async function fetchOutreachLogs(
  supabase: SupabaseAnyServerClient,
  staffUserId: string,
  limit = 20,
): Promise<OutreachLog[]> {
  const core = supabase.schema(CORE_SCHEMA);
  const { data, error } = await core.rpc(OUTREACH_RPC, {
    staff_uuid: staffUserId,
    limit_rows: limit,
  });

  if (error) {
    console.error('Failed to load staff outreach logs', error);
    throw new Error('Unable to load outreach logs right now.');
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: (row.title as string | undefined) ?? 'Outreach interaction',
    summary: (row.summary as string | null | undefined) ?? null,
    location: (row.location as string | null | undefined) ?? null,
    occurredAt: (row.occurred_at as string | undefined) ?? '',
  }));
}
