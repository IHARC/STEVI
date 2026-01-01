'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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
  CONSENT_METHODS,
  CONSENT_SCOPES,
  getEffectiveConsent,
  listParticipatingOrganizations,
  renewConsent,
  revokeConsent,
  saveConsent,
  syncConsentGrants,
} from '@/lib/consents';
import {
  ActionResult,
  actionError,
  actionOk,
  parseFormData,
  zodBoolean,
  zodOptionalString,
  zodRequiredNumber,
  zodRequiredString,
} from '@/lib/server-actions/validate';

const PEOPLE_TABLE = 'people';
const TIMELINE_TABLE = 'timeline_events';

type CaseActionResult = ActionResult<{ message?: string }>;

const enumWithDefault = <T extends string>(options: readonly T[], fallback: T) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.enum(options as [T, ...T[]]).transform((value) => value ?? fallback),
  );

const requiredId = (label: string) => zodRequiredNumber(label, { int: true, positive: true });

const zodStringArray = () =>
  z.preprocess(
    (value) => {
      if (Array.isArray(value)) return value.map((entry) => String(entry));
      if (value === undefined || value === null) return [];
      return [String(value)];
    },
    z.array(z.string()),
  );

function parseOrgIds(raw: string[]): number[] {
  return raw
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

async function loadActionAccess(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return loadPortalAccess(supabase, { allowSideEffects: true });
}

export async function submitClientCaseUpdateAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        case_id: requiredId('Case is required.'),
        message: zodRequiredString('Please share a brief update (at least 8 characters).', { min: 8 }),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { case_id: caseId, message } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access) return actionError('Sign in to send an update.');

    await assertOnboardingComplete(supabase, access.userId);

    const caseDetail = await fetchClientCaseDetail(supabase, access.userId, caseId);
    if (!caseDetail) return actionError('Case not found.');

    const core = supabase.schema('core');
    const now = new Date();

    const { data, error } = await core
      .from(TIMELINE_TABLE)
      .insert({
        person_id: caseDetail.personId,
        case_id: caseId,
        encounter_id: null,
        owning_org_id: caseDetail.owningOrgId,
        event_category: 'client_update',
        event_at: now.toISOString(),
        source_type: 'client_update',
        source_id: null,
        visibility_scope: 'shared_via_consent',
        sensitivity_level: 'standard',
        summary: 'Client update',
        metadata: { message, submitted_via: 'portal' },
        recorded_by_profile_id: access.profile.id,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return actionError('Could not record your update.');
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'client_update_submitted',
      entityType: 'core.timeline_events',
      entityRef: buildEntityRef({ schema: 'core', table: TIMELINE_TABLE, id: data.id }),
      meta: {
        case_id: caseId,
        person_id: caseDetail.personId,
      },
    });

    revalidatePath(`/cases/${caseId}`);
    return actionOk({ message: 'Update sent.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to send update.');
  }
}

export async function updateConsentsAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        consent_scope: enumWithDefault(CONSENT_SCOPES, 'all_orgs'),
        consent_confirm: zodBoolean(),
        org_allowed_ids: zodStringArray(),
        preferred_contact: zodOptionalString(),
        privacy_restrictions: zodOptionalString(),
        policy_version: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      consent_scope: consentScope,
      consent_confirm: consentConfirmed,
      org_allowed_ids: orgAllowedRaw,
      preferred_contact: preferredContactRaw,
      privacy_restrictions: privacyNotesRaw,
      policy_version: policyVersionRaw,
    } = parsed.data;

    const allowedOrgIds = parseOrgIds(orgAllowedRaw);
    const preferredContact = preferredContactRaw ?? null;
    const privacyNotes = privacyNotesRaw ?? null;
    const policyVersion = policyVersionRaw ?? null;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access) return actionError('Sign in to update consents.');

    await assertOnboardingReadyForConsent(supabase, access.userId);

    const person = await requirePersonForUser(supabase, access.userId);
    const core = supabase.schema('core');

    if (!consentConfirmed) {
      return actionError('Confirm your sharing choice before saving.', {
        consent_confirm: 'Confirm your sharing choice before saving.',
      });
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
      return actionError('Select at least one organization to share with.', {
        org_allowed_ids: 'Select at least one organization.',
      });
    }

    const contactChangedFields: string[] = [];
    if (person.preferred_contact_method !== preferredContact) {
      contactChangedFields.push('preferred_contact_method');
    }
    if (person.privacy_restrictions !== privacyNotes) {
      contactChangedFields.push('privacy_restrictions');
    }

    if (contactChangedFields.length > 0) {
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
        return actionError('Could not save your consent changes.');
      }

      await logAuditEvent(supabase, {
        actorProfileId: access.profile.id,
        action: 'person_contact_updated',
        entityType: 'core.people',
        entityRef: buildEntityRef({ schema: 'core', table: 'people', id: person.id }),
        meta: {
          person_id: person.id,
          changed_fields: contactChangedFields,
          change_reason: 'consent_preferences',
        },
      });
    }

    await saveConsent(supabase, {
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

    revalidatePath('/profile/consents');
    return actionOk({ message: 'Consent preferences saved.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to update consents.');
  }
}

export async function adminOverrideConsentAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        person_id: requiredId('Person is required.'),
        consent_scope: enumWithDefault(CONSENT_SCOPES, 'all_orgs'),
        consent_confirm: zodBoolean(),
        org_allowed_ids: zodStringArray(),
        consent_method: enumWithDefault(CONSENT_METHODS, 'documented'),
        consent_notes: zodOptionalString(),
        policy_version: zodOptionalString(),
        preferred_contact: zodOptionalString(),
        privacy_restrictions: zodOptionalString(),
        attested_by_staff: zodBoolean(),
        attested_by_client: zodBoolean(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      person_id: personId,
      consent_scope: consentScope,
      consent_confirm: consentConfirmed,
      org_allowed_ids: orgAllowedRaw,
      consent_method: consentMethod,
      consent_notes: consentNotesRaw,
      policy_version: policyVersionRaw,
      preferred_contact: preferredContactRaw,
      privacy_restrictions: privacyNotesRaw,
      attested_by_staff: attestedByStaff,
      attested_by_client: attestedByClient,
    } = parsed.data;

    const allowedOrgIds = parseOrgIds(orgAllowedRaw);
    const consentNotes = consentNotesRaw ?? null;
    const policyVersion = policyVersionRaw ?? null;
    const preferredContact = preferredContactRaw ?? null;
    const privacyNotes = privacyNotesRaw ?? null;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canAccessOpsSteviAdmin) {
      return actionError('You do not have permission to override consents.');
    }

    if (!consentConfirmed) {
      return actionError('Confirm the consent override before saving.', {
        consent_confirm: 'Confirm the consent override before saving.',
      });
    }

    const core = supabase.schema('core');
    const { data: existingPerson, error: personError } = await core
      .from(PEOPLE_TABLE)
      .select('preferred_contact_method, privacy_restrictions')
      .eq('id', personId)
      .maybeSingle();

    if (personError || !existingPerson) {
      return actionError('Unable to load consent preferences.');
    }

    const contactChangedFields: string[] = [];
    if (existingPerson.preferred_contact_method !== preferredContact) {
      contactChangedFields.push('preferred_contact_method');
    }
    if (existingPerson.privacy_restrictions !== privacyNotes) {
      contactChangedFields.push('privacy_restrictions');
    }

    if (contactChangedFields.length > 0) {
      const { error } = await core
        .from(PEOPLE_TABLE)
        .update({
          preferred_contact_method: preferredContact,
          privacy_restrictions: privacyNotes,
          updated_by: access.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', personId);

      if (error) return actionError('Unable to update consent.');

      await logAuditEvent(supabase, {
        actorProfileId: access.profile.id,
        action: 'person_contact_updated',
        entityType: 'core.people',
        entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
        meta: {
          person_id: personId,
          changed_fields: contactChangedFields,
          change_reason: 'consent_override',
        },
      });
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
      return actionError('Select at least one organization to share with.', {
        org_allowed_ids: 'Select at least one organization.',
      });
    }

    const capturedOrgId = access.organizationId ?? access.iharcOrganizationId ?? null;

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
      notes: consentNotes,
      policyVersion,
    });

    revalidatePath('/ops/clients');
    return actionOk({ message: 'Consent override saved.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to update consent.');
  }
}

export async function revokeConsentAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        consent_id: zodRequiredString('Consent is required.'),
        revoke_confirm: zodBoolean(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { consent_id: consentId, revoke_confirm: confirmed } = parsed.data;
    if (!confirmed) {
      return actionError('Confirm consent withdrawal before continuing.', {
        revoke_confirm: 'Confirm consent withdrawal before continuing.',
      });
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access) return actionError('Sign in to update consents.');

    const person = await requirePersonForUser(supabase, access.userId);
    const effective = await getEffectiveConsent(supabase, person.id);
    if (!effective.consent || effective.consent.id !== consentId) {
      return actionError('Consent record not found.');
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

    revalidatePath('/profile/consents');
    return actionOk({ message: 'Consent revoked.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to revoke consent.');
  }
}

export async function renewConsentAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        consent_id: zodRequiredString('Consent is required.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { consent_id: consentId } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access) return actionError('Sign in to update consents.');

    const person = await requirePersonForUser(supabase, access.userId);
    const effective = await getEffectiveConsent(supabase, person.id);
    if (!effective.consent || effective.consent.id !== consentId) {
      return actionError('Consent record not found.');
    }

    await renewConsent(supabase, {
      consentId,
      actorProfileId: access.profile.id,
      actorUserId: access.userId,
      method: 'portal',
      excludeOrgId: access.iharcOrganizationId,
    });

    revalidatePath('/profile/consents');
    return actionOk({ message: 'Consent renewed.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to renew consent.');
  }
}

export async function adminRevokeConsentAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        consent_id: zodRequiredString('Consent is required.'),
        person_id: requiredId('Person is required.'),
        consent_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { consent_id: consentId, person_id: personId, consent_notes: consentNotes } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canAccessOpsSteviAdmin) {
      return actionError('You do not have permission to revoke consents.');
    }

    await revokeConsent(supabase, {
      consentId,
      actorProfileId: access.profile.id,
      reason: consentNotes ?? null,
    });

    await syncConsentGrants(supabase, {
      personId,
      allowedOrgIds: [],
      actorProfileId: access.profile.id,
      actorUserId: access.userId,
    });

    revalidatePath('/app-admin/consents');
    return actionOk({ message: 'Consent revoked.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to revoke consent.');
  }
}

export async function adminRenewConsentAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        consent_id: zodRequiredString('Consent is required.'),
        person_id: requiredId('Person is required.'),
        consent_method: enumWithDefault(CONSENT_METHODS, 'documented'),
        attested_by_staff: zodBoolean(),
        attested_by_client: zodBoolean(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      consent_id: consentId,
      consent_method: consentMethod,
      attested_by_staff: attestedByStaff,
      attested_by_client: attestedByClient,
    } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canAccessOpsSteviAdmin) {
      return actionError('You do not have permission to renew consents.');
    }

    const capturedOrgId = access.organizationId ?? access.iharcOrganizationId ?? null;

    await renewConsent(supabase, {
      consentId,
      actorProfileId: access.profile.id,
      actorUserId: access.userId,
      method: consentMethod,
      capturedOrgId,
      attestedByStaff,
      attestedByClient,
      excludeOrgId: access.iharcOrganizationId,
    });

    revalidatePath('/app-admin/consents');
    return actionOk({ message: 'Consent renewed.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to renew consent.');
  }
}

export async function adminCreateGrantAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        person_id: requiredId('Person is required.'),
        scope: zodRequiredString('Scope is required.'),
        grantee_user_id: zodOptionalString(),
        grantee_org_id: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const {
      person_id: personId,
      scope,
      grantee_user_id: granteeUserIdRaw,
      grantee_org_id: granteeOrgIdRaw,
    } = parsed.data;

    const granteeUserId = granteeUserIdRaw ?? null;
    const granteeOrgId = granteeOrgIdRaw ? Number.parseInt(granteeOrgIdRaw, 10) : null;
    if (granteeOrgIdRaw && (!granteeOrgId || Number.isNaN(granteeOrgId) || granteeOrgId <= 0)) {
      return actionError('Select a valid organization.', { grantee_org_id: 'Select a valid organization.' });
    }

    if (!granteeUserId && !granteeOrgId) {
      return actionError('Select a user or organization.', {
        grantee_user_id: 'Select a user or organization.',
      });
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canManageConsents) {
      return actionError('You do not have permission to manage grants.');
    }

    const allowedScopes = await getGrantScopes(supabase);
    if (!allowedScopes.includes(scope)) {
      return actionError('Invalid scope.', { scope: 'Select a valid scope.' });
    }

    await createPersonGrant(supabase, {
      personId,
      scope,
      granteeUserId,
      granteeOrgId,
      actorUserId: access.userId,
    });

    revalidatePath('/ops/clients');
    return actionOk({ message: 'Grant saved.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to save grant.');
  }
}

export async function adminRevokeGrantAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        grant_id: zodRequiredString('Grant is required.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { grant_id: grantId } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canManageConsents) {
      return actionError('You do not have permission to manage grants.');
    }

    await revokePersonGrant(supabase, { grantId });
    revalidatePath('/ops/clients');
    return actionOk({ message: 'Grant revoked.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to revoke grant.');
  }
}

export async function staffAddCaseNoteAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        case_id: requiredId('Case is required.'),
        title: zodRequiredString('Add a title for this note.'),
        description: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { case_id: caseId, title, description } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canAccessOpsFrontline) {
      return actionError('You do not have permission to add notes.');
    }

    assertOrganizationSelected(access, 'Select an acting organization before adding a note.');

    const detail = await fetchStaffCaseDetail(supabase, caseId);
    if (!detail) return actionError('Case not found.');

    const core = supabase.schema('core');
    const now = new Date();

    const { data, error } = await core
      .from(TIMELINE_TABLE)
      .insert({
        person_id: detail.personId,
        case_id: caseId,
        encounter_id: null,
        owning_org_id: access.organizationId,
        event_category: 'note',
        event_at: now.toISOString(),
        source_type: 'case_note',
        source_id: null,
        visibility_scope: 'internal_to_org',
        sensitivity_level: 'standard',
        summary: title,
        metadata: {
          description: description || null,
          staff_member: access.profile.display_name,
        },
        recorded_by_profile_id: access.profile.id,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) return actionError('Unable to add note.');

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'case_note_added',
      entityType: 'core.timeline_events',
      entityRef: buildEntityRef({ schema: 'core', table: TIMELINE_TABLE, id: data.id }),
      meta: { case_id: caseId, person_id: detail.personId },
    });

    revalidatePath(`/ops/clients/${detail.personId}?case=${caseId}&tab=overview`);
    return actionOk({ message: 'Note added.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to add note.');
  }
}

export async function processIntakeAction(formData: FormData): Promise<CaseActionResult> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        intake_id: zodRequiredString('Intake is required.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { intake_id: intakeId } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);
    if (!access || !access.canAccessOpsFrontline) {
      return actionError('You do not have permission to process intakes.');
    }

    assertOrganizationSelected(access, 'Select an acting organization before processing an intake.');

    await processClientIntake(supabase, intakeId, access.userId);

    revalidatePath('/ops/clients?view=directory');
    revalidatePath('/ops/clients?view=activity');
    return actionOk({ message: 'Intake processed.' });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Unable to process intake.');
  }
}
