import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

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
const CASELOAD_RPC = 'staff_caseload';
const SHIFTS_RPC = 'staff_shifts_today';
const OUTREACH_RPC = 'staff_outreach_logs';

export async function fetchStaffCaseload(
  supabase: SupabaseAnyServerClient,
  staffUserId: string,
): Promise<StaffCase[]> {
  const core = supabase.schema(CORE_SCHEMA);
  const { data, error } = await core.rpc(CASELOAD_RPC, { staff_uuid: staffUserId });

  if (error) {
    console.error('Failed to load staff caseload', error);
    throw new Error('Unable to load caseload right now.');
  }

  return (data ?? []).map((entry: Record<string, unknown>) => ({
    id: String(entry.person_id),
    clientName: (entry.client_name as string | undefined) ?? 'Client',
    status: (entry.status as string | undefined) ?? 'active',
    nextStep: (entry.next_step as string | null | undefined) ?? null,
    nextAt: entry.next_at ? String(entry.next_at) : null,
  }));
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
