'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { listParticipatingOrganizations, saveConsent } from '@/lib/consents';

const CONSENT_SCOPE_VALUES = ['all_orgs', 'selected_orgs'] as const;

type ConsentScope = (typeof CONSENT_SCOPE_VALUES)[number];

function parseConsentScope(raw: string | null): ConsentScope {
  if (!raw) return 'selected_orgs';
  return CONSENT_SCOPE_VALUES.includes(raw as ConsentScope) ? (raw as ConsentScope) : 'selected_orgs';
}

function parseOrgIds(formData: FormData, key: string): number[] {
  return formData
    .getAll(key)
    .map((value) => Number.parseInt(String(value ?? ''), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function parseShortText(formData: FormData, key: string, max = 240): string | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  return raw.length > max ? raw.slice(0, max) : raw;
}

export async function approveConsentRequestAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get('request_id') ?? '').trim();
  if (!requestId) throw new Error('Missing request id.');

  const consentScope = parseConsentScope(String(formData.get('consent_scope') ?? 'selected_orgs'));
  const consentMethod = String(formData.get('consent_method') ?? 'verbal').trim() || 'verbal';
  const consentNotes = parseShortText(formData, 'consent_notes', 500);
  const decisionReason = parseShortText(formData, 'decision_reason', 240);
  const policyVersion = parseShortText(formData, 'policy_version', 120);

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    throw new Error('You do not have permission to approve consents.');
  }

  const core = supabase.schema('core');
  const { data: requestRow, error: requestError } = await core
    .from('person_consent_requests')
    .select('id, person_id, requesting_org_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw new Error('Consent request not found.');
  }

  if (requestRow.status !== 'pending') {
    throw new Error('Consent request has already been resolved.');
  }

  const participatingOrgs = await listParticipatingOrganizations(supabase, {
    excludeOrgId: access.iharcOrganizationId,
  });
  const participatingOrgIds = participatingOrgs.map((org) => org.id);

  const allowedOrgIdsFromForm = parseOrgIds(formData, 'org_allowed_ids');
  const allowedSet = new Set(
    (allowedOrgIdsFromForm.length ? allowedOrgIdsFromForm : [requestRow.requesting_org_id]).filter((id) =>
      participatingOrgIds.includes(id),
    ),
  );

  let blockedOrgIds: number[] = [];

  if (consentScope === 'all_orgs') {
    allowedSet.clear();
    participatingOrgIds.forEach((id) => allowedSet.add(id));
  } else {
    blockedOrgIds = participatingOrgIds.filter((id) => !allowedSet.has(id));
  }

  if (consentScope === 'selected_orgs' && allowedSet.size === 0) {
    throw new Error('Select at least one organization to approve.');
  }

  const { consent, previousConsent } = await saveConsent(supabase, {
    personId: requestRow.person_id,
    scope: consentScope,
    allowedOrgIds: Array.from(allowedSet),
    blockedOrgIds,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: consentMethod as 'portal' | 'staff_assisted' | 'verbal' | 'documented' | 'migration',
    notes: consentNotes ?? null,
    policyVersion: policyVersion ?? null,
  });

  const now = new Date().toISOString();
  const { error: updateError } = await core
    .from('person_consent_requests')
    .update({
      status: 'approved',
      decision_at: now,
      decision_by: access.profile.id,
      decision_reason: decisionReason ?? null,
    })
    .eq('id', requestRow.id);

  if (updateError) {
    throw new Error('Consent recorded, but request could not be updated.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: previousConsent ? 'consent_updated' : 'consent_created',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
    meta: {
      person_id: requestRow.person_id,
      scope: consentScope,
      allowed_org_ids: Array.from(allowedSet),
      blocked_org_ids: blockedOrgIds,
      method: consentMethod,
      approved_from_request: requestRow.id,
    },
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_request_approved',
    entityType: 'core.person_consent_requests',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consent_requests', id: requestRow.id }),
    meta: {
      person_id: requestRow.person_id,
      requesting_org_id: requestRow.requesting_org_id,
    },
  });

  revalidatePath('/app-admin/consents');
}

export async function denyConsentRequestAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get('request_id') ?? '').trim();
  if (!requestId) throw new Error('Missing request id.');

  const decisionReason = parseShortText(formData, 'decision_reason', 240);

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    throw new Error('You do not have permission to deny consent requests.');
  }

  const core = supabase.schema('core');
  const { data: requestRow, error: requestError } = await core
    .from('person_consent_requests')
    .select('id, person_id, requesting_org_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw new Error('Consent request not found.');
  }

  if (requestRow.status !== 'pending') {
    throw new Error('Consent request has already been resolved.');
  }

  const now = new Date().toISOString();
  const { error: updateError } = await core
    .from('person_consent_requests')
    .update({
      status: 'denied',
      decision_at: now,
      decision_by: access.profile.id,
      decision_reason: decisionReason ?? null,
    })
    .eq('id', requestRow.id);

  if (updateError) {
    throw new Error('Unable to update consent request.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_request_denied',
    entityType: 'core.person_consent_requests',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consent_requests', id: requestRow.id }),
    meta: {
      person_id: requestRow.person_id,
      requesting_org_id: requestRow.requesting_org_id,
    },
  });

  revalidatePath('/app-admin/consents');
}
