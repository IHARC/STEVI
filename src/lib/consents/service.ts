import { getConsentExpiryDays } from '@/lib/consents/settings';
import type { SupabaseAnyServerClient, SupabaseServerClient } from '@/lib/supabase/types';
import { createPersonGrant, revokePersonGrant } from '@/lib/cases/grants';
import type {
  ConsentMethod,
  ConsentOrgResolution,
  ConsentOrgRow,
  ConsentOrgSelection,
  ConsentRecord,
  ConsentScope,
  ConsentStatus,
  EffectiveConsent,
  ParticipatingOrganization,
} from '@/lib/consents/types';

const CONSENT_TYPE = 'data_sharing';
const DEFAULT_ORG_GRANT_SCOPES = ['view', 'update_contact'] as const;

type ConsentRow = {
  id: string;
  person_id: number;
  consent_type: string;
  scope: ConsentScope;
  status: ConsentStatus;
  captured_by: string | null;
  captured_method: ConsentMethod;
  policy_version: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  expires_at: string | null;
  restrictions: Record<string, unknown> | null;
};

function mapConsentRow(row: ConsentRow): ConsentRecord {
  return {
    id: row.id,
    personId: row.person_id,
    consentType: CONSENT_TYPE,
    scope: row.scope,
    status: row.status,
    capturedBy: row.captured_by ?? null,
    capturedMethod: row.captured_method,
    policyVersion: row.policy_version ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    revokedAt: row.revoked_at ?? null,
    revokedBy: row.revoked_by ?? null,
    expiresAt: row.expires_at ?? null,
    restrictions: (row.restrictions as Record<string, unknown> | null) ?? null,
  };
}

export async function listParticipatingOrganizations(
  supabase: SupabaseAnyServerClient,
  options: { excludeOrgId?: number | null } = {},
): Promise<ParticipatingOrganization[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from('participating_organizations')
    .select('id, name, organization_type, partnership_type, is_active')
    .order('name');

  if (error) {
    throw error;
  }

  const orgs = (data ?? []) as ParticipatingOrganization[];
  if (!options.excludeOrgId) return orgs;
  return orgs.filter((org) => org.id !== options.excludeOrgId);
}

export async function getEffectiveConsent(
  supabase: SupabaseAnyServerClient,
  personId: number,
): Promise<EffectiveConsent> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from('person_consents')
    .select(
      'id, person_id, consent_type, scope, status, captured_by, captured_method, policy_version, notes, created_at, updated_at, revoked_at, revoked_by, expires_at, restrictions',
    )
    .eq('person_id', personId)
    .eq('consent_type', CONSENT_TYPE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      consent: null,
      scope: null,
      status: null,
      effectiveStatus: null,
      expiresAt: null,
      isExpired: false,
    };
  }

  const consent = mapConsentRow(data as ConsentRow);
  const expiresAt = consent.expiresAt;
  const isExpired = !expiresAt || new Date(expiresAt).getTime() <= Date.now();
  const effectiveStatus = consent.status === 'active' && isExpired ? 'expired' : consent.status;

  return {
    consent,
    scope: consent.scope,
    status: consent.status,
    effectiveStatus,
    expiresAt,
    isExpired,
  };
}

export async function listConsentOrgs(
  supabase: SupabaseAnyServerClient,
  consentId: string,
): Promise<ConsentOrgRow[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from('person_consent_orgs')
    .select('id, consent_id, organization_id, allowed, set_by, set_at, reason, organizations(name)')
    .eq('consent_id', consentId)
    .order('set_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: ConsentOrgRow & { organizations?: { name?: string | null } | null }) => ({
    id: row.id,
    consentId: row.consent_id,
    organizationId: row.organization_id,
    allowed: row.allowed,
    setBy: row.set_by ?? null,
    setAt: row.set_at,
    reason: row.reason ?? null,
    organizationName: row.organizations?.name ?? null,
  }));
}

export function resolveConsentOrgSelections(
  scope: ConsentScope | null,
  orgs: ParticipatingOrganization[],
  consentOrgs: ConsentOrgRow[],
): ConsentOrgResolution {
  const normalizedScope: ConsentScope = scope ?? 'none';
  const explicit = new Map<number, boolean>();
  consentOrgs.forEach((row) => explicit.set(row.organizationId, row.allowed));

  const allowedOrgIds: number[] = [];
  const blockedOrgIds: number[] = [];
  const selections: ConsentOrgSelection[] = [];

  orgs.forEach((org) => {
    const explicitAllowed = explicit.get(org.id);
    let allowed = false;

    if (normalizedScope === 'all_orgs') {
      allowed = explicitAllowed === false ? false : true;
    } else if (normalizedScope === 'selected_orgs') {
      allowed = explicitAllowed === true;
    }

    if (allowed) {
      allowedOrgIds.push(org.id);
    } else {
      blockedOrgIds.push(org.id);
    }

    selections.push({
      id: org.id,
      name: org.name ?? null,
      organizationType: org.organization_type ?? null,
      partnershipType: org.partnership_type ?? null,
      allowed,
    });
  });

  return { allowedOrgIds, blockedOrgIds, selections };
}

export async function consentAllowsOrg(
  supabase: SupabaseAnyServerClient,
  personId: number,
  orgId: number | null,
): Promise<boolean> {
  if (!orgId) return false;
  const { data, error } = await supabase.schema('core').rpc('fn_person_consent_allows_org', {
    p_person_id: personId,
    p_org_id: orgId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function getIharcOrgId(
  supabase: SupabaseAnyServerClient,
): Promise<number | null> {
  const { data, error } = await supabase.schema('core').rpc('get_iharc_org_id');
  if (error) {
    throw error;
  }
  return typeof data === 'number' ? data : null;
}

export async function saveConsent(
  supabase: SupabaseServerClient,
  {
    personId,
    scope,
    allowedOrgIds,
    blockedOrgIds,
    actorProfileId,
    actorUserId,
    method,
    notes,
    policyVersion,
    restrictions,
  }: {
    personId: number;
    scope: ConsentScope;
    allowedOrgIds: number[];
    blockedOrgIds: number[];
    actorProfileId: string;
    actorUserId: string;
    method: ConsentMethod;
    notes?: string | null;
    policyVersion?: string | null;
    restrictions?: Record<string, unknown> | null;
  },
): Promise<{ consent: ConsentRecord; previousConsent: ConsentRecord | null }> {
  const core = supabase.schema('core');
  const now = new Date().toISOString();

  const { data: previous, error: previousError } = await core
    .from('person_consents')
    .select(
      'id, person_id, consent_type, scope, status, captured_by, captured_method, policy_version, notes, created_at, updated_at, revoked_at, revoked_by, expires_at, restrictions',
    )
    .eq('person_id', personId)
    .eq('consent_type', CONSENT_TYPE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousError) {
    throw previousError;
  }

  const previousConsent = previous ? mapConsentRow(previous as ConsentRow) : null;

  if (previousConsent?.status === 'active') {
    const { error: revokeError } = await core
      .from('person_consents')
      .update({
        status: 'revoked',
        revoked_at: now,
        revoked_by: actorProfileId,
        updated_at: now,
      })
      .eq('id', previousConsent.id);

    if (revokeError) {
      throw revokeError;
    }
  }

  const expiryDays = await getConsentExpiryDays(supabase);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: inserted, error: insertError } = await core
    .from('person_consents')
    .insert({
      person_id: personId,
      consent_type: CONSENT_TYPE,
      scope,
      status: 'active',
      captured_by: actorProfileId,
      captured_method: method,
      policy_version: policyVersion ?? null,
      notes: notes ?? null,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
      restrictions: restrictions ?? null,
    })
    .select(
      'id, person_id, consent_type, scope, status, captured_by, captured_method, policy_version, notes, created_at, updated_at, revoked_at, revoked_by, expires_at, restrictions',
    )
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error('Unable to save consent.');
  }

  const consent = mapConsentRow(inserted as ConsentRow);

  const allowedSet = new Set(allowedOrgIds.filter((id) => Number.isFinite(id)));
  const blockedSet = new Set(blockedOrgIds.filter((id) => Number.isFinite(id)));
  const orgRows: Array<{
    consent_id: string;
    organization_id: number;
    allowed: boolean;
    set_by: string;
    reason: string | null;
    set_at: string;
  }> = [];

  if (scope === 'all_orgs') {
    blockedSet.forEach((orgId) => {
      orgRows.push({
        consent_id: consent.id,
        organization_id: orgId,
        allowed: false,
        set_by: actorProfileId,
        reason: notes ?? null,
        set_at: now,
      });
    });
  } else if (scope === 'selected_orgs') {
    allowedSet.forEach((orgId) => {
      orgRows.push({
        consent_id: consent.id,
        organization_id: orgId,
        allowed: true,
        set_by: actorProfileId,
        reason: notes ?? null,
        set_at: now,
      });
    });
  }

  if (orgRows.length) {
    const { error: orgError } = await core.from('person_consent_orgs').insert(orgRows);
    if (orgError) {
      throw orgError;
    }
  }

  await syncConsentGrants(supabase, {
    personId,
    allowedOrgIds: scope === 'selected_orgs' ? Array.from(allowedSet) : Array.from(allowedSet),
    actorProfileId,
    actorUserId,
  });

  return { consent, previousConsent };
}

export async function updateConsentOrg(
  supabase: SupabaseServerClient,
  {
    consentId,
    organizationId,
    allowed,
    actorProfileId,
    reason,
  }: {
    consentId: string;
    organizationId: number;
    allowed: boolean;
    actorProfileId: string;
    reason?: string | null;
  },
): Promise<void> {
  const core = supabase.schema('core');
  const now = new Date().toISOString();
  const { error } = await core.from('person_consent_orgs').upsert(
    {
      consent_id: consentId,
      organization_id: organizationId,
      allowed,
      set_by: actorProfileId,
      reason: reason ?? null,
      set_at: now,
    },
    { onConflict: 'consent_id,organization_id' },
  );

  if (error) {
    throw error;
  }
}

export async function revokeConsent(
  supabase: SupabaseServerClient,
  {
    consentId,
    actorProfileId,
    reason,
  }: {
    consentId: string;
    actorProfileId: string;
    reason?: string | null;
  },
): Promise<void> {
  const core = supabase.schema('core');
  const now = new Date().toISOString();
  const { error } = await core
    .from('person_consents')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoked_by: actorProfileId,
      notes: reason ?? null,
      updated_at: now,
    })
    .eq('id', consentId);

  if (error) {
    throw error;
  }
}

export async function renewConsent(
  supabase: SupabaseServerClient,
  {
    consentId,
    actorProfileId,
    actorUserId,
    method,
    policyVersion,
    excludeOrgId,
  }: {
    consentId: string;
    actorProfileId: string;
    actorUserId: string;
    method: ConsentMethod;
    policyVersion?: string | null;
    excludeOrgId?: number | null;
  },
): Promise<{ consent: ConsentRecord; previousConsent: ConsentRecord | null }> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from('person_consents')
    .select(
      'id, person_id, consent_type, scope, status, captured_by, captured_method, policy_version, notes, created_at, updated_at, revoked_at, revoked_by, expires_at, restrictions',
    )
    .eq('id', consentId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error('Consent not found.');
  }

  const existing = mapConsentRow(data as ConsentRow);
  const orgs = await listParticipatingOrganizations(supabase, { excludeOrgId: excludeOrgId ?? null });
  const consentOrgs = await listConsentOrgs(supabase, consentId);
  const resolution = resolveConsentOrgSelections(existing.scope, orgs, consentOrgs);

  return saveConsent(supabase, {
    personId: existing.personId,
    scope: existing.scope,
    allowedOrgIds: resolution.allowedOrgIds,
    blockedOrgIds: resolution.blockedOrgIds,
    actorProfileId,
    actorUserId,
    method,
    notes: existing.notes ?? null,
    policyVersion: policyVersion ?? existing.policyVersion ?? null,
    restrictions: existing.restrictions ?? null,
  });
}

export async function syncConsentGrants(
  supabase: SupabaseServerClient,
  {
    personId,
    allowedOrgIds,
    actorProfileId,
    actorUserId,
    managedScopes = DEFAULT_ORG_GRANT_SCOPES,
    excludeOrgIds = [],
  }: {
    personId: number;
    allowedOrgIds: number[];
    actorProfileId: string;
    actorUserId: string;
    managedScopes?: readonly string[];
    excludeOrgIds?: number[];
  },
): Promise<void> {
  const core = supabase.schema('core');
  const excluded = new Set(excludeOrgIds);
  const allowedSet = new Set(
    allowedOrgIds.filter((id) => Number.isFinite(id) && !excluded.has(id)),
  );

  const { data, error } = await core
    .from('person_access_grants')
    .select('id, grantee_org_id, scope')
    .eq('person_id', personId)
    .in('scope', managedScopes as string[])
    .not('grantee_org_id', 'is', null);

  if (error) {
    throw error;
  }

  const existing = (data ?? []) as Array<{ id: string; grantee_org_id: number | null; scope: string }>;
  const existingKey = new Set<string>();

  for (const row of existing) {
    const orgId = row.grantee_org_id;
    if (!orgId) continue;
    const key = `${orgId}:${row.scope}`;
    existingKey.add(key);

    if (!allowedSet.has(orgId)) {
      await revokePersonGrant(supabase, { grantId: row.id, actorProfileId });
    }
  }

  for (const orgId of allowedSet) {
    for (const scope of managedScopes) {
      const key = `${orgId}:${scope}`;
      if (existingKey.has(key)) continue;
      await createPersonGrant(supabase, {
        personId,
        scope,
        granteeUserId: null,
        granteeOrgId: orgId,
        actorProfileId,
        actorUserId,
      });
    }
  }
}
