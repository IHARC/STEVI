import type { SupabaseRSCClient, SupabaseServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

export type TimeEntryRow = Database['core']['Tables']['staff_time_entries']['Row'];
export type BreakEntryRow = Database['core']['Tables']['staff_break_entries']['Row'];
export type TimeEntryWithBreaks = TimeEntryRow & {
  staff_break_entries?: Array<Pick<BreakEntryRow, 'id' | 'started_at' | 'ended_at'>> | null;
};
export type TimeEntryWithProfile = TimeEntryRow & {
  profile?: { id: string; display_name: string | null; position_title: string | null } | null;
};

type SupabaseClient = SupabaseRSCClient | SupabaseServerClient;

const TIME_ENTRY_SELECT = `
  id,
  user_id,
  organization_id,
  role_name,
  role_kind,
  shift_start,
  shift_end,
  status,
  break_minutes,
  total_minutes,
  hourly_rate_snapshot,
  cost_amount_snapshot,
  currency,
  notes,
  metadata,
  source_type,
  source_id,
  staff_break_entries ( id, started_at, ended_at )
`;

export async function fetchMyOpenShift(
  supabase: SupabaseClient,
  orgId: number,
  userId: string,
): Promise<TimeEntryWithBreaks | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('staff_time_entries')
    .select(TIME_ENTRY_SELECT)
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .is('shift_end', null)
    .order('shift_start', { ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load your open shift.');
  }

  return (data as TimeEntryWithBreaks | null) ?? null;
}

type TimeRange = {
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function fetchMyTimecards(
  supabase: SupabaseClient,
  orgId: number,
  userId: string,
  range: TimeRange = {},
): Promise<TimeEntryWithBreaks[]> {
  const limit = range.limit ?? 25;
  let query = supabase
    .schema('core')
    .from('staff_time_entries')
    .select(TIME_ENTRY_SELECT)
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .order('shift_start', { ascending: false })
    .limit(limit);

  if (range.from) {
    query = query.gte('shift_start', range.from);
  }
  if (range.to) {
    query = query.lte('shift_start', range.to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Unable to load your timecards.');
  }

  return (data ?? []) as TimeEntryWithBreaks[];
}

type OrgTimecardFilters = {
  from?: string | null;
  to?: string | null;
  status?: string | null;
  userId?: string | null;
  limit?: number;
};

export async function fetchOrgTimecards(
  supabase: SupabaseClient,
  orgId: number,
  filters: OrgTimecardFilters = {},
): Promise<TimeEntryWithProfile[]> {
  const limit = filters.limit ?? 100;
  let query = supabase
    .schema('core')
    .from('staff_time_entries')
    .select(TIME_ENTRY_SELECT)
    .eq('organization_id', orgId)
    .order('shift_start', { ascending: false })
    .limit(limit);

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.from) {
    query = query.gte('shift_start', filters.from);
  }
  if (filters.to) {
    query = query.lte('shift_start', filters.to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Unable to load organization timecards.');
  }

  const rows = (data ?? []) as TimeEntryWithProfile[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const profileMap = await fetchProfilesForUsers(supabase, userIds);

  return rows.map((row) => ({
    ...row,
    profile: profileMap.get(row.user_id) ?? null,
  }));
}

async function fetchProfilesForUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { id: string; display_name: string | null; position_title: string | null }>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .schema('portal')
    .from('profiles')
    .select('id, user_id, display_name, position_title')
    .in('user_id', userIds);

  if (error) {
    throw new Error('Unable to load staff profiles for timecards.');
  }

  const map = new Map<string, { id: string; display_name: string | null; position_title: string | null }>();
  const rows = (data ?? []) as Array<{
    id: string | number;
    user_id: string | null;
    display_name: string | null;
    position_title: string | null;
  }>;
  rows.forEach((entry) => {
    if (!entry?.user_id) return;
    map.set(String(entry.user_id), {
      id: String(entry.id),
      display_name: entry.display_name ?? null,
      position_title: entry.position_title ?? null,
    });
  });
  return map;
}
