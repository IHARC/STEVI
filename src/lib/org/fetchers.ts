import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

export type OrgMemberRecord = Pick<
  Database['portal']['Tables']['profiles']['Row'],
  'id' | 'user_id' | 'display_name' | 'position_title' | 'organization_id' | 'last_seen_at' | 'affiliation_status'
> & {
  org_roles: Array<{ id: string; name: string; displayName: string | null }>;
};

export type OrgInviteRecord = Pick<
  Database['portal']['Tables']['profile_invites']['Row'],
  'id' | 'email' | 'display_name' | 'status' | 'created_at' | 'position_title' | 'invited_by_profile_id'
>;

export type OrgRoleRecord = {
  id: string;
  name: string;
  display_name: string | null;
};

async function buildRoleMap(
  supabase: SupabaseAnyServerClient,
  userIds: string[],
  organizationId: number,
): Promise<Map<string, Array<{ id: string; name: string; displayName: string | null }>>> {
  const map = new Map<string, Array<{ id: string; name: string; displayName: string | null }>>();

  if (!userIds.length) return map;

  const { data: roleRows, error } = await supabase
    .schema('core')
    .from('user_org_roles')
    .select('user_id, org_roles:org_roles!inner(id, name, display_name)')
    .eq('organization_id', organizationId)
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  (roleRows ?? []).forEach((row: { user_id: string; org_roles: { id: string; name: string; display_name: string | null } | null }) => {
    const role = row.org_roles;
    if (!role) return;
    const list = map.get(row.user_id) ?? [];
    list.push({ id: role.id, name: role.name, displayName: role.display_name ?? null });
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
  const roleMap = await buildRoleMap(supabase, userIds, organizationId);

  return users.map((member) => ({
    ...member,
    org_roles: roleMap.get(member.user_id ?? '') ?? [],
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

export async function fetchOrgRoles(
  supabase: SupabaseAnyServerClient,
  organizationId: number,
): Promise<OrgRoleRecord[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('org_roles')
    .select('id, name, display_name')
    .eq('organization_id', organizationId)
    .order('display_name');

  if (error) {
    throw error;
  }

  return (data ?? []) as OrgRoleRecord[];
}
