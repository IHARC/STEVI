import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import { getGrantScopes } from '@/lib/enum-values';

export type GrantScope = string;

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
    expiresAt,
  }: {
    personId: number;
    scope: GrantScope;
    granteeUserId: string | null;
    granteeOrgId: number | null;
    actorProfileId: string;
    actorUserId: string;
    expiresAt?: string | null;
  },
) {
  const grantScopes = await getGrantScopes(supabase);
  if (!grantScopes.includes(scope)) {
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
      expires_at: expiresAt ?? null,
    });

  if (error) {
    throw new Error('Unable to save grant.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'person_access_grant_added',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { pk_int: personId, scope, grantee_user_id: granteeUserId, grantee_org_id: granteeOrgId },
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
    entityRef: data ? buildEntityRef({ schema: 'core', table: 'people', id: data.person_id }) : null,
    meta: { grant_id: grantId, person_id: data?.person_id ?? null },
  });
}

export async function updatePersonGrantExpiry(
  supabase: SupabaseServerClient,
  {
    grantId,
    expiresAt,
    actorProfileId,
  }: {
    grantId: string;
    expiresAt: string;
    actorProfileId: string;
  },
) {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from(GRANTS_TABLE)
    .update({ expires_at: expiresAt })
    .eq('id', grantId)
    .select('person_id')
    .maybeSingle();

  if (error) {
    throw new Error('Unable to update grant expiry.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'person_access_grant_updated',
    entityType: 'people',
    entityRef: data ? buildEntityRef({ schema: 'core', table: 'people', id: data.person_id }) : null,
    meta: { grant_id: grantId, person_id: data?.person_id ?? null, expires_at: expiresAt },
  });
}
