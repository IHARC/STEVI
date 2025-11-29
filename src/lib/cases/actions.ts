'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { requirePersonForUser } from '@/lib/cases/person';
import { fetchClientCaseDetail, fetchStaffCaseDetail } from '@/lib/cases/fetchers';
import { processClientIntake } from '@/lib/cases/intake';
import { createPersonGrant, revokePersonGrant } from '@/lib/cases/grants';
import { getGrantScopes } from '@/lib/enum-values';
import { assertOnboardingComplete } from '@/lib/onboarding/guard';

const ACTIVITIES_TABLE = 'people_activities';
const PEOPLE_TABLE = 'people';

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
  const dataSharing = formData.get('data_sharing') === 'on';
  const preferredContact = (formData.get('preferred_contact') as string | null)?.trim() || null;
  const privacyNotes = (formData.get('privacy_restrictions') as string | null)?.trim() || null;

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access) throw new Error('Sign in to update consents.');

  await assertOnboardingComplete(supabase, access.userId);

  const person = await requirePersonForUser(supabase, access.userId);
  const core = supabase.schema('core');

  const { error } = await core
    .from(PEOPLE_TABLE)
    .update({
      data_sharing_consent: dataSharing,
      preferred_contact_method: preferredContact,
      privacy_restrictions: privacyNotes,
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', person.id);

  if (error) {
    throw new Error('Could not save your consent changes.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_updated',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: person.id }),
    meta: { pk_int: person.id, data_sharing_consent: dataSharing, preferred_contact_method: preferredContact },
  });

  revalidatePath('/profile/consents');
}

export async function adminOverrideConsentAction(formData: FormData): Promise<void> {
  const personId = Number.parseInt(String(formData.get('person_id') ?? ''), 10);
  const dataSharing = formData.get('data_sharing') === 'on';
  const preferredContact = (formData.get('preferred_contact') as string | null)?.trim() || null;
  const privacyNotes = (formData.get('privacy_restrictions') as string | null)?.trim() || null;

  if (!personId || Number.isNaN(personId)) throw new Error('Invalid person id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canManageConsents) {
    throw new Error('You do not have permission to override consents.');
  }

  const core = supabase.schema('core');
  const { error } = await core
    .from(PEOPLE_TABLE)
    .update({
      data_sharing_consent: dataSharing,
      preferred_contact_method: preferredContact,
      privacy_restrictions: privacyNotes,
      updated_by: access.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', personId);

  if (error) throw new Error('Unable to update consent.');

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_overridden',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { pk_int: personId, data_sharing_consent: dataSharing, preferred_contact_method: preferredContact },
  });

  revalidatePath('/admin/consents');
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

  revalidatePath('/admin/consents');
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
  revalidatePath('/admin/consents');
}

export async function staffAddCaseNoteAction(formData: FormData): Promise<void> {
  const caseId = parseInt(String(formData.get('case_id') ?? ''), 10);
  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const description = (formData.get('description') as string | null)?.trim() ?? '';
  if (!caseId || Number.isNaN(caseId)) throw new Error('Invalid case id.');
  if (!title) throw new Error('Add a title for this note.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessStaffWorkspace) {
    throw new Error('You do not have permission to add notes.');
  }

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

  revalidatePath(`/staff/cases/${caseId}`);
}

export async function processIntakeAction(formData: FormData): Promise<void> {
  const intakeId = (formData.get('intake_id') as string | null)?.trim();
  if (!intakeId) throw new Error('Missing intake id.');

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);
  if (!access || !access.canAccessStaffWorkspace) {
    throw new Error('You do not have permission to process intakes.');
  }

  await processClientIntake(supabase, intakeId, access.userId);

  revalidatePath('/staff/intake');
  revalidatePath('/staff/cases');
}
