'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { withClientRecordAuditMeta } from '@/lib/client-record/audit';
import { diffFields } from '@/lib/client-record/diff';
import { assertCanEditClientRecord } from '@/lib/permissions/client-record';
import type { RecordSource, SensitivityLevel, VerificationStatus, VisibilityScope } from '@/lib/relationships/types';

export type RelationshipFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export type RelationshipUpdateState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const SOURCES: RecordSource[] = ['client_reported', 'staff_observed', 'document', 'partner_org', 'system'];
const VERIFICATIONS: VerificationStatus[] = ['unverified', 'verified', 'disputed', 'stale'];
const VISIBILITIES: VisibilityScope[] = ['internal_to_org', 'shared_via_consent'];
const SENSITIVITIES: SensitivityLevel[] = ['standard', 'sensitive', 'high', 'restricted'];

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseRequiredString(value: FormDataEntryValue | null, label: string): string {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    throw new Error(`${label} is required.`);
  }
  return parsed;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null, label: string): string | null {
  const parsed = parseOptionalString(value);
  if (!parsed) return null;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return parsed;
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export async function createRelationshipAction(
  _prev: RelationshipFormState,
  formData: FormData,
): Promise<RelationshipFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) return { status: 'error', message: 'Select a person to add a relationship.' };

    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));

    const relationshipType = parseRequiredString(formData.get('relationship_type'), 'Relationship type');
    const relationshipSubtype = parseOptionalString(formData.get('relationship_subtype'));
    const relationshipStatus = parseOptionalString(formData.get('relationship_status'));
    const relatedPersonId = parseOptionalNumber(formData.get('related_person_id'));
    const contactName = parseOptionalString(formData.get('contact_name'));
    const contactPhone = parseOptionalString(formData.get('contact_phone'));
    const contactEmail = parseOptionalString(formData.get('contact_email'));
    const contactAddress = parseOptionalString(formData.get('contact_address'));
    const startDate = parseOptionalDate(formData.get('start_date'), 'Start date');
    const endDate = parseOptionalDate(formData.get('end_date'), 'End date');
    const isPrimary = formData.get('is_primary') === 'on';
    const isEmergency = formData.get('is_emergency') === 'on';
    const safeToContact = formData.get('safe_to_contact') === 'on';
    const safeContactNotes = parseOptionalString(formData.get('safe_contact_notes'));
    const notes = parseOptionalString(formData.get('notes'));

    if (!relatedPersonId && !contactName) {
      return { status: 'error', message: 'Provide a related person ID or contact name.' };
    }

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canAccessOpsFrontline) {
      return { status: 'error', message: 'You do not have permission to add relationships.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before adding relationships.');

    const { data, error } = await supabase
      .schema('core')
      .from('person_relationships')
      .insert({
        person_id: personId,
        case_id: caseId ?? null,
        encounter_id: encounterId ?? null,
        owning_org_id: access.organizationId,
        recorded_by_profile_id: access.profile.id,
        recorded_at: new Date().toISOString(),
        source,
        verification_status: verificationStatus,
        sensitivity_level: sensitivityLevel,
        visibility_scope: visibilityScope,
        relationship_type: relationshipType,
        relationship_subtype: relationshipSubtype ?? null,
        relationship_status: relationshipStatus ?? null,
        related_person_id: relatedPersonId ?? null,
        contact_name: contactName ?? null,
        contact_phone: contactPhone ?? null,
        contact_email: contactEmail ?? null,
        contact_address: contactAddress ?? null,
        start_date: startDate ?? null,
        end_date: endDate ?? null,
        is_primary: isPrimary,
        is_emergency: isEmergency,
        safe_to_contact: safeToContact,
        safe_contact_notes: safeContactNotes ?? null,
        notes: notes ?? null,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Unable to add relationship.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'relationship_created',
      entityType: 'core.person_relationships',
      entityRef: buildEntityRef({ schema: 'core', table: 'person_relationships', id: data.id }),
      meta: {
        person_id: personId,
        relationship_type: relationshipType,
        related_person_id: relatedPersonId ?? null,
      },
    });

    revalidatePath(`/ops/clients/${personId}?tab=overview`);
    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }

    return { status: 'success', message: 'Relationship saved.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save relationship.' };
  }
}

export async function updateRelationshipAction(
  _prev: RelationshipUpdateState,
  formData: FormData,
): Promise<RelationshipUpdateState> {
  try {
    const relationshipId = parseOptionalString(formData.get('relationship_id'));
    if (!relationshipId) return { status: 'error', message: 'Missing relationship.' };

    const personId = parseOptionalNumber(formData.get('person_id'));
    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));
    const changeReason = parseOptionalString(formData.get('change_reason'));

    const relationshipType = parseRequiredString(formData.get('relationship_type'), 'Relationship type');
    const relationshipSubtype = parseOptionalString(formData.get('relationship_subtype'));
    const relationshipStatus = parseOptionalString(formData.get('relationship_status'));
    const relatedPersonId = parseOptionalNumber(formData.get('related_person_id'));
    const contactName = parseOptionalString(formData.get('contact_name'));
    const contactPhone = parseOptionalString(formData.get('contact_phone'));
    const contactEmail = parseOptionalString(formData.get('contact_email'));
    const contactAddress = parseOptionalString(formData.get('contact_address'));
    const startDate = parseOptionalDate(formData.get('start_date'), 'Start date');
    const endDate = parseOptionalDate(formData.get('end_date'), 'End date');
    const isPrimary = formData.get('is_primary') === 'on';
    const isEmergency = formData.get('is_emergency') === 'on';
    const safeToContact = formData.get('safe_to_contact') === 'on';
    const safeContactNotes = parseOptionalString(formData.get('safe_contact_notes'));
    const notes = parseOptionalString(formData.get('notes'));

    if (!relatedPersonId && !contactName) {
      return { status: 'error', message: 'Provide a related person ID or contact name.' };
    }

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating relationships.');

    const { data: existing, error } = await supabase
      .schema('core')
      .from('person_relationships')
      .select(
        'id, person_id, case_id, encounter_id, relationship_type, relationship_subtype, relationship_status, related_person_id, contact_name, contact_phone, contact_email, contact_address, start_date, end_date, is_primary, is_emergency, safe_to_contact, safe_contact_notes, notes, source, verification_status, visibility_scope, sensitivity_level',
      )
      .eq('id', relationshipId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Unable to load that relationship.' };
    }

    const updatePayload = {
      relationship_type: relationshipType,
      relationship_subtype: relationshipSubtype ?? null,
      relationship_status: relationshipStatus ?? null,
      related_person_id: relatedPersonId ?? null,
      contact_name: contactName ?? null,
      contact_phone: contactPhone ?? null,
      contact_email: contactEmail ?? null,
      contact_address: contactAddress ?? null,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      is_primary: isPrimary,
      is_emergency: isEmergency,
      safe_to_contact: safeToContact,
      safe_contact_notes: safeContactNotes ?? null,
      notes: notes ?? null,
      source,
      verification_status: verificationStatus,
      visibility_scope: visibilityScope,
      sensitivity_level: sensitivityLevel,
    };

    const changedFields = diffFields(existing, updatePayload);
    if (changedFields.length === 0) {
      return { status: 'success', message: 'No changes to save.' };
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .schema('core')
      .from('person_relationships')
      .update({ ...updatePayload, updated_at: now, updated_by: access.userId })
      .eq('id', relationshipId);

    if (updateError) {
      return { status: 'error', message: updateError.message ?? 'Unable to update relationship.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'relationship_updated',
      entityType: 'core.person_relationships',
      entityRef: buildEntityRef({ schema: 'core', table: 'person_relationships', id: relationshipId }),
      meta: withClientRecordAuditMeta({
        person_id: personId ?? existing.person_id,
        case_id: caseId ?? existing.case_id,
        encounter_id: encounterId ?? existing.encounter_id,
        changed_fields: changedFields,
        change_reason: changeReason,
      }),
    });

    const resolvedPersonId = personId ?? existing.person_id;
    revalidatePath(`/ops/clients/${resolvedPersonId}`);
    const resolvedEncounterId = encounterId ?? existing.encounter_id;
    if (resolvedEncounterId) {
      revalidatePath(`/ops/encounters/${resolvedEncounterId}`);
    }

    return { status: 'success', message: 'Relationship updated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update relationship.' };
  }
}
