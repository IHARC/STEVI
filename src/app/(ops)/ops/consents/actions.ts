'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { listParticipatingOrganizations, saveConsent, type ConsentMethod } from '@/lib/consents';

const CONSENT_SCOPE_VALUES = ['all_orgs', 'selected_orgs', 'none'] as const;
const CONSENT_METHOD_VALUES = ['staff_assisted', 'verbal', 'documented'] as const;

type ConsentScope = (typeof CONSENT_SCOPE_VALUES)[number];
type StaffConsentMethod = (typeof CONSENT_METHOD_VALUES)[number];

function parsePersonId(formData: FormData): number {
  const raw = String(formData.get('person_id') ?? '').trim();
  const parsed = Number.parseInt(raw, 10);
  if (!parsed || Number.isNaN(parsed)) {
    throw new Error('Invalid person id.');
  }
  return parsed;
}

function parseShortText(formData: FormData, key: string, label: string, max = 240): string {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) {
    throw new Error(`${label} is required.`);
  }
  if (raw.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return raw;
}

function parseOptionalText(formData: FormData, key: string, max = 240): string | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  return raw.length > max ? raw.slice(0, max) : raw;
}

function parseConsentScope(raw: string | null): ConsentScope {
  if (!raw) return 'all_orgs';
  return CONSENT_SCOPE_VALUES.includes(raw as ConsentScope) ? (raw as ConsentScope) : 'all_orgs';
}

function parseConsentMethod(raw: string | null): StaffConsentMethod {
  if (!raw) return 'staff_assisted';
  return CONSENT_METHOD_VALUES.includes(raw as StaffConsentMethod) ? (raw as StaffConsentMethod) : 'staff_assisted';
}

function parseOrgIds(formData: FormData, key: string): number[] {
  return formData
    .getAll(key)
    .map((value) => Number.parseInt(String(value ?? ''), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function hasConsentRequestAccess(access: Awaited<ReturnType<typeof loadPortalAccess>> | null) {
  return Boolean(access && (access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canManageConsents));
}

function hasConsentRecordAccess(access: Awaited<ReturnType<typeof loadPortalAccess>> | null) {
  return Boolean(access && access.canManageConsents);
}

export async function requestConsentAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!hasConsentRequestAccess(access)) {
    throw new Error('You do not have permission to request consent.');
  }

  assertOrganizationSelected(access, 'Select your acting organization before requesting consent.');

  const personId = parsePersonId(formData);
  const purpose = parseShortText(formData, 'purpose', 'Purpose');
  const note = parseOptionalText(formData, 'request_note');

  const { error } = await supabase.schema('core').rpc('request_person_consent', {
    p_person_id: personId,
    p_org_id: access.organizationId,
    p_purpose: purpose,
    p_requested_scopes: ['view', 'update_contact'],
    p_note: note,
  });

  if (error) {
    throw new Error(error.message ?? 'Unable to request consent right now.');
  }

  revalidatePath('/ops/consents');
}

export async function logConsentContactAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!hasConsentRequestAccess(access)) {
    throw new Error('You do not have permission to log consent contact.');
  }

  assertOrganizationSelected(access, 'Select your acting organization before logging consent contact.');

  const personId = parsePersonId(formData);
  const summary = parseShortText(formData, 'contact_summary', 'Summary');

  const { error } = await supabase.schema('core').rpc('log_consent_contact', {
    p_person_id: personId,
    p_org_id: access.organizationId,
    p_summary: summary,
  });

  if (error) {
    throw new Error(error.message ?? 'Unable to log consent contact right now.');
  }

  revalidatePath('/ops/consents');
}

export async function recordStaffConsentAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!hasConsentRecordAccess(access)) {
    throw new Error('You do not have permission to record consent.');
  }

  assertOrganizationSelected(access, 'Select your acting organization before recording consent.');

  const personId = parsePersonId(formData);
  const consentScope = parseConsentScope(String(formData.get('consent_scope') ?? 'all_orgs'));
  const consentMethod = parseConsentMethod(String(formData.get('consent_method') ?? 'staff_assisted')) as ConsentMethod;
  const consentNotes = parseOptionalText(formData, 'consent_notes', 500);
  const policyVersion = parseOptionalText(formData, 'policy_version', 120);
  const attestedByStaff = formData.get('attested_by_staff') === 'on';
  const attestedByClient = formData.get('attested_by_client') === 'on';
  const allowedOrgIds = parseOrgIds(formData, 'org_allowed_ids');

  if (!attestedByStaff || !attestedByClient) {
    throw new Error('Both staff and client attestations are required.');
  }

  const participatingOrgs = await listParticipatingOrganizations(supabase, {
    excludeOrgId: access.iharcOrganizationId,
  });
  const participatingOrgIds = participatingOrgs.map((org) => org.id);
  const allowedSet = new Set(allowedOrgIds.filter((id) => participatingOrgIds.includes(id)));
  let blockedOrgIds: number[] = [];

  if (consentScope === 'all_orgs') {
    blockedOrgIds = participatingOrgIds.filter((id) => !allowedSet.has(id));
  }

  if (consentScope === 'selected_orgs') {
    blockedOrgIds = participatingOrgIds.filter((id) => !allowedSet.has(id));
  }

  if (consentScope === 'none') {
    allowedSet.clear();
    blockedOrgIds = participatingOrgIds;
  }

  if (consentScope === 'selected_orgs' && allowedSet.size === 0) {
    throw new Error('Select at least one organization to share with.');
  }

  const capturedOrgId = access.organizationId;

  await saveConsent(supabase, {
    personId,
    scope: consentScope,
    allowedOrgIds: Array.from(allowedSet),
    blockedOrgIds,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: consentMethod,
    capturedOrgId,
    attestedByStaff,
    attestedByClient,
    notes: consentNotes ?? null,
    policyVersion: policyVersion ?? null,
  });

  const core = supabase.schema('core');
  const { data: pendingRequest } = await core
    .from('person_consent_requests')
    .select('id, requesting_org_id, status')
    .eq('person_id', personId)
    .eq('requesting_org_id', access.organizationId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingRequest?.id) {
    const { error: requestUpdateError } = await core
      .from('person_consent_requests')
      .update({
        status: 'approved',
        decision_at: new Date().toISOString(),
        decision_by: access.profile.id,
        decision_reason: consentNotes ?? 'Approved in person with client present.',
      })
      .eq('id', pendingRequest.id);

    if (requestUpdateError) {
      throw new Error('Consent recorded, but request could not be updated.');
    }
  }

  revalidatePath('/ops/consents/record');
  revalidatePath('/ops/consents');
}
