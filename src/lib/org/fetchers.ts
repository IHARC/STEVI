import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

export type OrgMemberRecord = Pick<
  Database['portal']['Tables']['profiles']['Row'],
  'id' | 'user_id' | 'display_name' | 'position_title' | 'organization_id' | 'last_seen_at' | 'affiliation_status'
> & {
  portal_roles: string[];
};

export type OrgInviteRecord = Pick<
  Database['portal']['Tables']['profile_invites']['Row'],
  'id' | 'email' | 'display_name' | 'status' | 'created_at' | 'position_title' | 'invited_by_profile_id'
>;

async function buildRoleMap(supabase: SupabaseAnyServerClient, userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();

  if (!userIds.length) return map;

  const { data: roleRows, error } = await supabase
    .schema('core')
    .from('user_roles')
    .select('user_id, roles:roles!inner(name)')
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  (roleRows ?? []).forEach((row: { user_id: string; roles: { name: string } | null }) => {
    const name = row.roles?.name;
    if (!name) return;
    const list = map.get(row.user_id) ?? [];
    list.push(name);
    map.set(row.user_id, list);
  });

  return map;
}

export async function fetchOrgMembersWithRoles(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<OrgMemberRecord[]> {
  const portal = supabase.schema('portal');
  const { data: memberProfiles, error } = await portal
    .from('profiles')
    .select('id, user_id, display_name, position_title, organization_id, last_seen_at, affiliation_status')
    .eq('organization_id', organizationId)
    .order('display_name');

  if (error) {
    throw error;
  }

  const users = (memberProfiles ?? []) as OrgMemberRecord[];
  const userIds = users.map((u) => u.user_id).filter((id): id is string => Boolean(id));
  const roleMap = await buildRoleMap(supabase, userIds);

  return users.map((member) => ({
    ...member,
    portal_roles: roleMap.get(member.user_id ?? '') ?? [],
  }));
}

export async function fetchOrgInvites(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
  limit = 50,
): Promise<OrgInviteRecord[]> {
  const portal = supabase.schema('portal');
  const { data, error } = await portal
    .from('profile_invites')
    .select('id, email, display_name, status, created_at, position_title, invited_by_profile_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as OrgInviteRecord[];
}
