'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { withClientRecordAuditMeta } from '@/lib/client-record/audit';
import { diffFields } from '@/lib/client-record/diff';
import { assertCanEditClientRecord } from '@/lib/permissions/client-record';
import type { RecordSource, SensitivityLevel, VerificationStatus, VisibilityScope } from '@/lib/characteristics/types';

export type CharacteristicFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export type CharacteristicUpdateState = {
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
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDateTime(value: FormDataEntryValue | null, label: string): string | null {
  const parsed = parseOptionalString(value);
  if (!parsed) return null;
  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date/time.`);
  }
  return date.toISOString();
}

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export async function createCharacteristicAction(
  _prev: CharacteristicFormState,
  formData: FormData,
): Promise<CharacteristicFormState> {
  try {
    const personId = parseOptionalNumber(formData.get('person_id'));
    if (!personId) return { status: 'error', message: 'Select a person to add a characteristic.' };

    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));

    const characteristicType = parseRequiredString(formData.get('characteristic_type'), 'Characteristic type');
    const observedAt = parseOptionalDateTime(formData.get('observed_at'), 'Observed at') ?? new Date().toISOString();
    const observedBy = parseOptionalString(formData.get('observed_by'));
    const valueText = parseOptionalString(formData.get('value_text'));
    const valueNumber = parseOptionalNumber(formData.get('value_number'));
    const valueUnit = parseOptionalString(formData.get('value_unit'));
    const bodyLocation = parseOptionalString(formData.get('body_location'));
    const notes = parseOptionalString(formData.get('notes'));

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    if (!access || !access.canAccessOpsFrontline) {
      return { status: 'error', message: 'You do not have permission to add characteristics.' };
    }

    assertOrganizationSelected(access, 'Select an acting organization before adding characteristics.');

    const { data, error } = await supabase
      .schema('core')
      .from('person_characteristics')
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
        observed_at: observedAt,
        observed_by: observedBy ?? null,
        characteristic_type: characteristicType,
        value_text: valueText ?? null,
        value_number: valueNumber ?? null,
        value_unit: valueUnit ?? null,
        body_location: bodyLocation ?? null,
        notes: notes ?? null,
        created_by: access.userId,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { status: 'error', message: error?.message ?? 'Unable to add characteristic.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'characteristic_created',
      entityType: 'core.person_characteristics',
      entityRef: buildEntityRef({ schema: 'core', table: 'person_characteristics', id: data.id }),
      meta: {
        person_id: personId,
        characteristic_type: characteristicType,
      },
    });

    revalidatePath(`/ops/clients/${personId}?tab=overview`);
    if (encounterId) {
      revalidatePath(`/ops/encounters/${encounterId}`);
    }

    return { status: 'success', message: 'Characteristic saved.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to save characteristic.' };
  }
}

export async function updateCharacteristicAction(
  _prev: CharacteristicUpdateState,
  formData: FormData,
): Promise<CharacteristicUpdateState> {
  try {
    const characteristicId = parseOptionalString(formData.get('characteristic_id'));
    if (!characteristicId) return { status: 'error', message: 'Missing characteristic.' };

    const personId = parseOptionalNumber(formData.get('person_id'));
    const caseId = parseOptionalNumber(formData.get('case_id'));
    const encounterId = parseOptionalString(formData.get('encounter_id'));
    const changeReason = parseOptionalString(formData.get('change_reason'));

    const characteristicType = parseRequiredString(formData.get('characteristic_type'), 'Characteristic type');
    const observedAt = parseOptionalDateTime(formData.get('observed_at'), 'Observed at') ?? new Date().toISOString();
    const observedBy = parseOptionalString(formData.get('observed_by'));
    const valueText = parseOptionalString(formData.get('value_text'));
    const valueNumber = parseOptionalNumber(formData.get('value_number'));
    const valueUnit = parseOptionalString(formData.get('value_unit'));
    const bodyLocation = parseOptionalString(formData.get('body_location'));
    const notes = parseOptionalString(formData.get('notes'));

    const source = parseEnum(parseOptionalString(formData.get('source')), SOURCES, 'staff_observed');
    const verificationStatus = parseEnum(parseOptionalString(formData.get('verification_status')), VERIFICATIONS, 'unverified');
    const visibilityScope = parseEnum(parseOptionalString(formData.get('visibility_scope')), VISIBILITIES, 'internal_to_org');
    const sensitivityLevel = parseEnum(parseOptionalString(formData.get('sensitivity_level')), SENSITIVITIES, 'standard');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);

    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating characteristics.');

    const { data: existing, error } = await supabase
      .schema('core')
      .from('person_characteristics')
      .select(
        'id, person_id, case_id, encounter_id, characteristic_type, observed_at, observed_by, value_text, value_number, value_unit, body_location, notes, source, verification_status, visibility_scope, sensitivity_level',
      )
      .eq('id', characteristicId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Unable to load that characteristic.' };
    }

    const updatePayload = {
      characteristic_type: characteristicType,
      observed_at: observedAt,
      observed_by: observedBy ?? null,
      value_text: valueText ?? null,
      value_number: valueNumber ?? null,
      value_unit: valueUnit ?? null,
      body_location: bodyLocation ?? null,
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
      .from('person_characteristics')
      .update({ ...updatePayload, updated_at: now, updated_by: access.userId })
      .eq('id', characteristicId);

    if (updateError) {
      return { status: 'error', message: updateError.message ?? 'Unable to update characteristic.' };
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'characteristic_updated',
      entityType: 'core.person_characteristics',
      entityRef: buildEntityRef({ schema: 'core', table: 'person_characteristics', id: characteristicId }),
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

    return { status: 'success', message: 'Characteristic updated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update characteristic.' };
  }
}
