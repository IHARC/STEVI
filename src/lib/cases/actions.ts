'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { requirePersonForUser } from '@/lib/cases/person';
import { fetchClientCaseDetail, fetchStaffCaseDetail } from '@/lib/cases/fetchers';
import { processClientIntake } from '@/lib/cases/intake';
import { createPersonGrant, revokePersonGrant } from '@/lib/cases/grants';
import { getGrantScopes } from '@/lib/enum-values';
import { assertOnboardingComplete, assertOnboardingReadyForConsent } from '@/lib/onboarding/guard';
import {
  getEffectiveConsent,
  listConsentOrgs,
  listParticipatingOrganizations,
  resolveConsentOrgSelections,
  renewConsent,
  revokeConsent,
  saveConsent,
  syncConsentGrants,
} from '@/lib/consents';

const ACTIVITIES_TABLE = 'people_activities';
const PEOPLE_TABLE = 'people';

const CONSENT_SCOPE_VALUES = ['all_orgs', 'selected_orgs', 'none'] as const;
type ConsentScope = (typeof CONSENT_SCOPE_VALUES)[number];

function parseConsentScope(raw: string | null): ConsentScope {
  if (!raw) return 'all_orgs';
  return CONSENT_SCOPE_VALUES.includes(raw as ConsentScope) ? (raw as ConsentScope) : 'all_orgs';
}

function parseOrgIds(formData: FormData, key: string): number[] {
  return formData
    .getAll(key)
    .map((value) => Number.parseInt(String(value ?? ''), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export async function submitClientCaseUpdateAction(formData: FormData): Promise<void> {
  const caseId = parseInt(String(formData.get('case_id') ?? ''), 10);
  const message = (formData.get('message') as string | null)?.trim() ?? '';
  if (!caseId || Number.isNaN(caseId)) {
    throw new Error('Invalid case.');
  }
  if (!message || message.length < 8) {
    throw new Error('Please share a brief update (at least 8 characters).');
  }

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access) throw new Error('Sign in to send an update.');

  await assertOnboardingComplete(supabase, access.userId);

  const caseDetail = await fetchClientCaseDetail(supabase, access.userId, caseId);
  if (!caseDetail) throw new Error('Case not found.');

  const core = supabase.schema('core');
  const now = new Date();
  const activityDate = now.toISOString().slice(0, 10);
  const activityTime = now.toISOString().slice(11, 19);

  const { error } = await core.from(ACTIVITIES_TABLE).insert({
    person_id: caseDetail.personId,
    activity_type: 'client_update',
    activity_date: activityDate,
    activity_time: activityTime,
    title: 'Client update',
    description: message,
    staff_member: access.profile.display_name,
    metadata: { client_visible: true, submitted_via: 'portal' },
    created_by: access.userId,
    provider_profile_id: access.profile.id,
    provider_org_id: access.organizationId,
  });

  if (error) {
    throw new Error('Could not record your update.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'client_update_submitted',
    entityType: 'case_management',
    entityRef: null,
    meta: {
      case_id: caseId,
      person_id: caseDetail.personId,
    },
  });

  revalidatePath(`/cases/${caseId}`);
}

export async function updateConsentsAction(formData: FormData): Promise<void> {
  const consentScope = parseConsentScope(String(formData.get('consent_scope') ?? 'all_orgs'));
  const consentConfirmed = formData.get('consent_confirm') === 'on';
  const allowedOrgIds = parseOrgIds(formData, 'org_allowed_ids');
  const preferredContact = (formData.get('preferred_contact') as string | null)?.trim() || null;
  const privacyNotes = (formData.get('privacy_restrictions') as string | null)?.trim() || null;
  const policyVersion = (formData.get('policy_version') as string | null)?.trim() || null;

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access) throw new Error('Sign in to update consents.');

  await assertOnboardingReadyForConsent(supabase, access.userId);

  const person = await requirePersonForUser(supabase, access.userId);
  const core = supabase.schema('core');

  if (!consentConfirmed) {
    throw new Error('Confirm your sharing choice before saving.');
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

  const { error } = await core
    .from(PEOPLE_TABLE)
    .update({
      preferred_contact_method: preferredContact,
      privacy_restrictions: privacyNotes,
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', person.id);

  if (error) {
    throw new Error('Could not save your consent changes.');
  }

  const { consent, previousConsent } = await saveConsent(supabase, {
    personId: person.id,
    scope: consentScope,
    allowedOrgIds: Array.from(allowedSet),
    blockedOrgIds,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: 'portal',
    attestedByClient: true,
    attestedByStaff: false,
    notes: privacyNotes,
    policyVersion,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: previousConsent ? 'consent_updated' : 'consent_created',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
    meta: {
      person_id: person.id,
      scope: consentScope,
      previous_scope: previousConsent?.scope ?? null,
      allowed_org_ids: Array.from(allowedSet),
      blocked_org_ids: blockedOrgIds,
      preferred_contact_method: preferredContact,
      captured_method: 'portal',
      attested_by_client: true,
      attested_by_staff: false,
      captured_org_id: null,
      actor_role: 'client',
    },
  });

  if (previousConsent) {
    const previousOrgRows = await listConsentOrgs(supabase, previousConsent.id);
    const previousResolution = resolveConsentOrgSelections(previousConsent.scope, participatingOrgs, previousOrgRows);
    const nextResolution = resolveConsentOrgSelections(consentScope, participatingOrgs, [
      ...Array.from(allowedSet).map((orgId) => ({
        id: `allow-${orgId}`,
        consentId: consent.id,
        organizationId: orgId,
        allowed: true,
        setBy: access.profile.id,
        setAt: new Date().toISOString(),
        reason: null,
      })),
      ...blockedOrgIds.map((orgId) => ({
        id: `block-${orgId}`,
        consentId: consent.id,
        organizationId: orgId,
        allowed: false,
        setBy: access.profile.id,
        setAt: new Date().toISOString(),
        reason: null,
      })),
    ]);

    const previousAllowed = new Set(previousResolution.allowedOrgIds);
    const nextAllowed = new Set(nextResolution.allowedOrgIds);
    const changed =
      previousResolution.allowedOrgIds.length !== nextResolution.allowedOrgIds.length ||
      previousResolution.blockedOrgIds.length !== nextResolution.blockedOrgIds.length ||
      Array.from(nextAllowed).some((id) => !previousAllowed.has(id));

    if (changed) {
      await logAuditEvent(supabase, {
        actorProfileId: access.profile.id,
        action: 'consent_org_updated',
        entityType: 'core.person_consents',
        entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
        meta: {
          person_id: person.id,
          previous_allowed_org_ids: previousResolution.allowedOrgIds,
          previous_blocked_org_ids: previousResolution.blockedOrgIds,
          allowed_org_ids: nextResolution.allowedOrgIds,
          blocked_org_ids: nextResolution.blockedOrgIds,
          actor_role: 'client',
        },
      });
    }
  }

  revalidatePath('/profile/consents');
}

export async function adminOverrideConsentAction(formData: FormData): Promise<void> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  const consentScope = parseConsentScope(String(formData.get('consent_scope') ?? 'all_orgs'));
  const consentConfirmed = formData.get('consent_confirm') === 'on';
  const allowedOrgIds = parseOrgIds(formData, 'org_allowed_ids');
  const consentMethod = (formData.get('consent_method') as string | null)?.trim() || 'documented';
  const consentNotes = (formData.get('consent_notes') as string | null)?.trim() || null;
  const policyVersion = (formData.get('policy_version') as string | null)?.trim() || null;
  const preferredContact = (formData.get('preferred_contact') as string | null)?.trim() || null;
  const privacyNotes = (formData.get('privacy_restrictions') as string | null)?.trim() || null;
  const attestedByStaff = formData.get('attested_by_staff') === 'on';
  const attestedByClient = formData.get('attested_by_client') === 'on';

  if (!personId || Number.isNaN(personId)) throw new Error('Invalid person id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsSteviAdmin) {
    throw new Error('You do not have permission to override consents.');
  }

  if (!consentConfirmed) {
    throw new Error('Confirm the consent override before saving.');
  }

  const core = supabase.schema('core');
  const { error } = await core
    .from(PEOPLE_TABLE)
    .update({
      preferred_contact_method: preferredContact,
      privacy_restrictions: privacyNotes,
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', personId);

  if (error) throw new Error('Unable to update consent.');

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

  const capturedOrgId = access.organizationId ?? access.iharcOrganizationId ?? null;

  const { consent, previousConsent } = await saveConsent(supabase, {
    personId,
    scope: consentScope,
    allowedOrgIds: Array.from(allowedSet),
    blockedOrgIds,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: consentMethod as 'portal' | 'staff_assisted' | 'verbal' | 'documented' | 'migration',
    capturedOrgId,
    attestedByStaff,
    attestedByClient,
    notes: consentNotes,
    policyVersion,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: previousConsent ? 'consent_updated' : 'consent_created',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
    meta: {
      person_id: personId,
      scope: consentScope,
      previous_scope: previousConsent?.scope ?? null,
      allowed_org_ids: Array.from(allowedSet),
      blocked_org_ids: blockedOrgIds,
      preferred_contact_method: preferredContact,
      override: true,
      method: consentMethod,
      captured_org_id: capturedOrgId,
      attested_by_staff: attestedByStaff,
      attested_by_client: attestedByClient,
      actor_role: 'iharc',
    },
  });

  revalidatePath('/ops/clients');
}

export async function revokeConsentAction(formData: FormData): Promise<void> {
  const consentId = (formData.get('consent_id') as string | null)?.trim();
  if (!consentId) throw new Error('Missing consent id.');
  const confirmed = formData.get('revoke_confirm') === 'on';
  if (!confirmed) throw new Error('Confirm consent withdrawal before continuing.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access) throw new Error('Sign in to update consents.');

  const person = await requirePersonForUser(supabase, access.userId);
  const effective = await getEffectiveConsent(supabase, person.id);
  if (!effective.consent || effective.consent.id !== consentId) {
    throw new Error('Consent record not found.');
  }

  await revokeConsent(supabase, {
    consentId,
    actorProfileId: access.profile.id,
    reason: 'Client revoked consent.',
  });

  await syncConsentGrants(supabase, {
    personId: person.id,
    allowedOrgIds: [],
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_revoked',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consentId }),
    meta: { person_id: person.id, revoked_by_client: true, actor_role: 'client' },
  });

  revalidatePath('/profile/consents');
}

export async function renewConsentAction(formData: FormData): Promise<void> {
  const consentId = (formData.get('consent_id') as string | null)?.trim();
  if (!consentId) throw new Error('Missing consent id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access) throw new Error('Sign in to update consents.');

  const person = await requirePersonForUser(supabase, access.userId);
  const effective = await getEffectiveConsent(supabase, person.id);
  if (!effective.consent || effective.consent.id !== consentId) {
    throw new Error('Consent record not found.');
  }

  const { consent } = await renewConsent(supabase, {
    consentId,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: 'portal',
    excludeOrgId: access.iharcOrganizationId,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_updated',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
    meta: { person_id: person.id, renewed: true, actor_role: 'client' },
  });

  revalidatePath('/profile/consents');
}

export async function adminRevokeConsentAction(formData: FormData): Promise<void> {
  const consentId = (formData.get('consent_id') as string | null)?.trim();
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  if (!consentId || !personId || Number.isNaN(personId)) throw new Error('Missing consent id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsSteviAdmin) {
    throw new Error('You do not have permission to revoke consents.');
  }

  await revokeConsent(supabase, {
    consentId,
    actorProfileId: access.profile.id,
    reason: (formData.get('consent_notes') as string | null)?.trim() || null,
  });

  await syncConsentGrants(supabase, {
    personId,
    allowedOrgIds: [],
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_revoked',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consentId }),
    meta: { person_id: personId, revoked_by_admin: true, actor_role: 'iharc' },
  });

  revalidatePath('/app-admin/consents');
}

export async function adminRenewConsentAction(formData: FormData): Promise<void> {
  const consentId = (formData.get('consent_id') as string | null)?.trim();
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  if (!consentId || !personId || Number.isNaN(personId)) throw new Error('Missing consent id.');

  const consentMethod = (formData.get('consent_method') as string | null)?.trim() || 'documented';
  const attestedByStaff = formData.get('attested_by_staff') === 'on';
  const attestedByClient = formData.get('attested_by_client') === 'on';

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsSteviAdmin) {
    throw new Error('You do not have permission to renew consents.');
  }

  const capturedOrgId = access.organizationId ?? access.iharcOrganizationId ?? null;

  const { consent } = await renewConsent(supabase, {
    consentId,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: consentMethod as 'portal' | 'staff_assisted' | 'verbal' | 'documented' | 'migration',
    capturedOrgId,
    attestedByStaff,
    attestedByClient,
    excludeOrgId: access.iharcOrganizationId,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_updated',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
    meta: {
      person_id: personId,
      renewed: true,
      method: consentMethod,
      captured_org_id: capturedOrgId,
      attested_by_staff: attestedByStaff,
      attested_by_client: attestedByClient,
      actor_role: 'iharc',
    },
  });

  revalidatePath('/app-admin/consents');
}

export async function adminCreateGrantAction(formData: FormData): Promise<void> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  const scope = (formData.get('scope') as string | null)?.trim() ?? '';
  const granteeUserId = (formData.get('grantee_user_id') as string | null)?.trim() || null;
  const granteeOrgIdRaw = (formData.get('grantee_org_id') as string | null)?.trim() || null;
  const granteeOrgId = granteeOrgIdRaw ? Number.parseInt(granteeOrgIdRaw, 10) : null;

  if (!personId || Number.isNaN(personId)) throw new Error('Invalid person id.');
  if (!granteeUserId && !granteeOrgId) throw new Error('Select a user or organization.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    throw new Error('You do not have permission to manage grants.');
  }

  const allowedScopes = await getGrantScopes(supabase);
  if (!allowedScopes.includes(scope)) {
    throw new Error('Invalid scope.');
  }

  await createPersonGrant(supabase, {
    personId,
    scope,
    granteeUserId,
    granteeOrgId,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
  });

  revalidatePath('/ops/clients');
}

export async function adminRevokeGrantAction(formData: FormData): Promise<void> {
  const grantId = (formData.get('grant_id') as string | null)?.trim();
  if (!grantId) throw new Error('Missing grant id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    throw new Error('You do not have permission to manage grants.');
  }

  await revokePersonGrant(supabase, { grantId, actorProfileId: access.profile.id });
  revalidatePath('/ops/clients');
}

export async function staffAddCaseNoteAction(formData: FormData): Promise<void> {
  const caseId = parseInt(String(formData.get('case_id') ?? ''), 10);
  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const description = (formData.get('description') as string | null)?.trim() ?? '';
  if (!caseId || Number.isNaN(caseId)) throw new Error('Invalid case id.');
  if (!title) throw new Error('Add a title for this note.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to add notes.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before adding a note.');

  const detail = await fetchStaffCaseDetail(supabase, caseId);
  if (!detail) throw new Error('Case not found.');

  const core = supabase.schema('core');
  const now = new Date();
  const activityDate = now.toISOString().slice(0, 10);
  const activityTime = now.toISOString().slice(11, 19);

  const { error } = await core.from(ACTIVITIES_TABLE).insert({
    person_id: detail.personId,
    activity_type: 'note',
    activity_date: activityDate,
    activity_time: activityTime,
    title,
    description: description || null,
    staff_member: access.profile.display_name,
    metadata: { client_visible: false },
    created_by: access.userId,
    provider_profile_id: access.profile.id,
    provider_org_id: access.organizationId,
  });

  if (error) throw new Error('Unable to add note.');

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'case_note_added',
    entityType: 'case_management',
    entityRef: null,
    meta: { case_id: caseId, person_id: detail.personId },
  });

  revalidatePath(`/ops/clients/${detail.personId}?case=${caseId}`);
}

export async function processIntakeAction(formData: FormData): Promise<void> {
  const intakeId = (formData.get('intake_id') as string | null)?.trim();
  if (!intakeId) throw new Error('Missing intake id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessOpsFrontline) {
    throw new Error('You do not have permission to process intakes.');
  }

  assertOrganizationSelected(access, 'Select an acting organization before processing an intake.');

  await processClientIntake(supabase, intakeId, access.userId);

  revalidatePath('/ops/clients?view=directory');
  revalidatePath('/ops/clients?view=activity');
}
