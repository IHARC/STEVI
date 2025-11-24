import { logAuditEvent } from '@/lib/audit';
import type { SupabaseServerClient } from '@/lib/supabase/types';

export const GRANT_SCOPES = [
  'view',
  'update_contact',
  'timeline_client',
  'timeline_full',
  'write_notes',
  'manage_consents',
] as const;

export type GrantScope = (typeof GRANT_SCOPES)[number];

export type PersonGrant = {
  id: string;
  personId: number;
  scope: GrantScope;
  granteeUserId: string | null;
  granteeOrgId: number | null;
  grantedAt: string;
  grantedBy: string | null;
  orgName: string | null;
};

const GRANTS_TABLE = 'person_access_grants';
type GrantRow = {
  id: string;
  person_id: number;
  scope: GrantScope;
  grantee_user_id: string | null;
  grantee_org_id: number | null;
  granted_at: string;
  granted_by: string | null;
  organizations?: { name: string | null } | null;
};

export async function fetchPersonGrants(
  supabase: SupabaseServerClient,
  personId: number,
): Promise<PersonGrant[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from(GRANTS_TABLE)
    .select('id, person_id, scope, grantee_user_id, grantee_org_id, granted_at, granted_by, organizations(name)')
    .eq('person_id', personId)
    .order('granted_at', { ascending: false });

  if (error) {
    throw new Error('Unable to load access grants.');
  }

  const rows = (data ?? []) as GrantRow[];
  return rows.map((row: GrantRow) => ({
    id: row.id,
    personId: row.person_id,
    scope: row.scope,
    granteeUserId: row.grantee_user_id,
    granteeOrgId: row.grantee_org_id,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by,
    orgName: row.organizations?.name ?? null,
  }));
}

export async function createPersonGrant(
  supabase: SupabaseServerClient,
  {
    personId,
    scope,
    granteeUserId,
    granteeOrgId,
    actorProfileId,
    actorUserId,
  }: {
    personId: number;
    scope: GrantScope;
    granteeUserId: string | null;
    granteeOrgId: number | null;
    actorProfileId: string;
    actorUserId: string;
  },
) {
  if (!GRANT_SCOPES.includes(scope)) {
    throw new Error('Invalid scope.');
  }
  if (!granteeUserId && !granteeOrgId) {
    throw new Error('Provide a user or organization to grant.');
  }

  const core = supabase.schema('core');
  const { error } = await core
    .from(GRANTS_TABLE)
    .insert({
      person_id: personId,
      scope,
      grantee_user_id: granteeUserId,
      grantee_org_id: granteeOrgId,
      granted_by: actorUserId,
    });

  if (error) {
    throw new Error('Unable to save grant.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'person_access_grant_added',
    entityType: 'people',
    entityId: String(personId),
    meta: { scope, grantee_user_id: granteeUserId, grantee_org_id: granteeOrgId },
  });
}

export async function revokePersonGrant(
  supabase: SupabaseServerClient,
  { grantId, actorProfileId }: { grantId: string; actorProfileId: string },
) {
  const core = supabase.schema('core');
  const { data, error } = await core.from(GRANTS_TABLE).delete().eq('id', grantId).select('person_id').maybeSingle();

  if (error) {
    throw new Error('Unable to revoke grant.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'person_access_grant_revoked',
    entityType: 'people',
    entityId: data ? String(data.person_id) : null,
    meta: { grant_id: grantId },
  });
}
