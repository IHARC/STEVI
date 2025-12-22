import { fetchOrgInvites, fetchOrgMembersWithRoles, type OrgInviteRecord, type OrgMemberRecord } from '@/lib/org/fetchers';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

export type OrgListItem = Pick<
  Database['core']['Tables']['organizations']['Row'],
  'id' | 'name' | 'status' | 'is_active' | 'partnership_type' | 'organization_type' | 'updated_at'
>;

export type OrgDetailRecord = Pick<
  Database['core']['Tables']['organizations']['Row'],
  | 'id'
  | 'name'
  | 'status'
  | 'partnership_type'
  | 'organization_type'
  | 'website'
  | 'contact_email'
  | 'contact_phone'
  | 'contact_person'
  | 'contact_title'
  | 'is_active'
  | 'updated_at'
>;

export async function loadOrgSelection(supabase: SupabaseServerClient): Promise<OrgListItem[]> {
  const { data: orgRows, error: orgListError } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, status, is_active, partnership_type, organization_type, updated_at')
    .eq('is_active', true)
    .order('name')
    .limit(50);

  if (orgListError) {
    throw orgListError;
  }

  return (orgRows ?? []) as OrgListItem[];
}

export type OrgDetail = {
  organization: OrgDetailRecord | null;
  members: OrgMemberRecord[];
  invites: OrgInviteRecord[];
  approvedMembers: OrgMemberRecord[];
  adminCount: number;
  repCount: number;
  pendingInvites: number;
};

export async function loadOrgDetail(supabase: SupabaseServerClient, organizationId: number): Promise<OrgDetail> {
  const [members, invites, organizationResult] = await Promise.all(
    [
      fetchOrgMembersWithRoles(supabase, organizationId),
      fetchOrgInvites(supabase, organizationId, 30),
      supabase
        .schema('core')
        .from('organizations')
        .select(
          'id, name, status, partnership_type, organization_type, website, contact_email, contact_phone, contact_person, contact_title, is_active, updated_at',
        )
        .eq('id', organizationId)
        .maybeSingle(),
    ] as const,
  );

  if (organizationResult.error) {
    throw organizationResult.error;
  }

  const organization = (organizationResult.data ?? null) as OrgDetailRecord | null;
  const approvedMembers = members.filter((member: OrgMemberRecord) => member.affiliation_status === 'approved');
  const adminCount = members.filter((member: OrgMemberRecord) => member.org_roles.some((role) => role.name === 'org_admin')).length;
  const repCount = members.filter((member: OrgMemberRecord) => member.org_roles.some((role) => role.name === 'org_rep')).length;
  const pendingInvites = invites.filter((invite: OrgInviteRecord) => invite.status === 'pending').length;

  return {
    organization,
    members,
    invites,
    approvedMembers,
    adminCount,
    repCount,
    pendingInvites,
  };
}
