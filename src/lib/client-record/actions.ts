'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess, assertOrganizationSelected } from '@/lib/portal-access';
import { assertCanEditClientRecord } from '@/lib/permissions/client-record';
import { diffFields } from '@/lib/client-record/diff';
import {
  GENDER_VALUES,
  HEALTH_CONCERN_VALUES,
  HOUSING_STATUS_VALUES,
  RISK_FACTOR_VALUES,
  RISK_LEVEL_VALUES,
  URGENCY_VALUES,
} from '@/lib/client-record/constants';
import type { ClientRecordFormState } from '@/lib/client-record/form-state';
import { getEnumArray, getNumber, getString, parseEnum } from '@/lib/server-actions/form';
import { assertRpcOk } from '@/lib/supabase/guards';

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

function normalizeArray(value: string[] | null | undefined): string[] {
  return (value ?? []).filter(Boolean).slice().sort((a, b) => a.localeCompare(b));
}


export async function updatePersonIdentityAction(
  _prev: ClientRecordFormState,
  formData: FormData,
): Promise<ClientRecordFormState> {
  try {
    const personId = getNumber(formData, 'person_id', { required: true });
    if (!personId) return { status: 'error', message: 'Missing person context.' };

    const firstName = getString(formData, 'first_name');
    const lastName = getString(formData, 'last_name');
    const dateOfBirth = parseOptionalDate(formData.get('date_of_birth'), 'Date of birth');
    const age = getNumber(formData, 'age');
    const gender = parseEnum(getString(formData, 'gender'), GENDER_VALUES);
    const preferredPronouns = getString(formData, 'preferred_pronouns');
    const changeReason = getString(formData, 'change_reason');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating basic information.');

    const core = supabase.schema('core');
    const { data: existing, error } = await core
      .from('people')
      .select('id, first_name, last_name, date_of_birth, age, gender, preferred_pronouns')
      .eq('id', personId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Unable to load the client record.' };
    }

    const updatePayload = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      age,
      gender,
      preferred_pronouns: preferredPronouns,
    };

    const changedFields = diffFields(existing, updatePayload);
    if (changedFields.length === 0) {
      return { status: 'success', message: 'No basic information changes to save.' };
    }

    const updateResult = await supabase.schema('core').rpc('person_update_identity', {
      p_person_id: personId,
      p_first_name: firstName,
      p_last_name: lastName,
      p_date_of_birth: dateOfBirth,
      p_age: age,
      p_gender: gender,
      p_preferred_pronouns: preferredPronouns,
      p_changed_fields: changedFields,
      p_change_reason: changeReason ?? null,
    });
    assertRpcOk(updateResult, 'person_update_identity');

    revalidatePath(`/ops/clients/${personId}`);

    return { status: 'success', message: 'Basic information updated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update basic information.' };
  }
}

export async function updatePersonContactAction(
  _prev: ClientRecordFormState,
  formData: FormData,
): Promise<ClientRecordFormState> {
  try {
    const personId = getNumber(formData, 'person_id', { required: true });
    if (!personId) return { status: 'error', message: 'Missing person context.' };

    const email = getString(formData, 'email');
    const phone = getString(formData, 'phone');
    const preferredContactMethod = getString(formData, 'preferred_contact_method');
    const changeReason = getString(formData, 'change_reason');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating contact details.');

    const core = supabase.schema('core');
    const { data: existing, error } = await core
      .from('people')
      .select('id, email, phone, preferred_contact_method')
      .eq('id', personId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Unable to load the client record.' };
    }

    const updatePayload = {
      email,
      phone,
      preferred_contact_method: preferredContactMethod,
    };

    const changedFields = diffFields(existing, updatePayload);
    if (changedFields.length === 0) {
      return { status: 'success', message: 'No contact changes to save.' };
    }

    const updateResult = await supabase.schema('core').rpc('person_update_contact', {
      p_person_id: personId,
      p_email: email,
      p_phone: phone,
      p_preferred_contact_method: preferredContactMethod,
      p_changed_fields: changedFields,
      p_change_reason: changeReason ?? null,
    });
    assertRpcOk(updateResult, 'person_update_contact');

    revalidatePath(`/ops/clients/${personId}`);

    return { status: 'success', message: 'Contact details updated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update contact details.' };
  }
}

export async function updateSituationAction(
  _prev: ClientRecordFormState,
  formData: FormData,
): Promise<ClientRecordFormState> {
  try {
    const personId = getNumber(formData, 'person_id', { required: true });
    const intakeId = getNumber(formData, 'intake_id', { required: true });
    if (!personId || !intakeId) return { status: 'error', message: 'Missing intake context.' };

    const housingStatus = parseEnum(getString(formData, 'housing_status'), HOUSING_STATUS_VALUES);
    const riskLevel = parseEnum(getString(formData, 'risk_level'), RISK_LEVEL_VALUES);
    const immediateNeeds = parseEnum(getString(formData, 'immediate_needs'), URGENCY_VALUES);
    const healthConcerns = normalizeArray(getEnumArray(formData, 'health_concerns', HEALTH_CONCERN_VALUES));
    const riskFactors = normalizeArray(getEnumArray(formData, 'risk_factors', RISK_FACTOR_VALUES));
    const situationNotes = getString(formData, 'situation_notes');
    const generalNotes = getString(formData, 'general_notes');
    const changeReason = getString(formData, 'change_reason');

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating intake details.');

    const caseMgmt = supabase.schema('case_mgmt');
    const { data: existing, error } = await caseMgmt
      .from('client_intakes')
      .select('id, housing_status, risk_level, immediate_needs, health_concerns, risk_factors, situation_notes, general_notes')
      .eq('id', intakeId)
      .eq('person_id', personId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Unable to load intake details.' };
    }

    const updatePayload = {
      housing_status: housingStatus,
      risk_level: riskLevel,
      immediate_needs: immediateNeeds,
      health_concerns: healthConcerns,
      risk_factors: riskFactors,
      situation_notes: situationNotes,
      general_notes: generalNotes,
    };

    const changedFields = diffFields(existing, updatePayload);
    if (changedFields.length === 0) {
      return { status: 'success', message: 'No situation changes to save.' };
    }

    const updateResult = await supabase.schema('case_mgmt').rpc('client_intake_update', {
      p_intake_id: intakeId,
      p_person_id: personId,
      p_housing_status: housingStatus,
      p_risk_level: riskLevel,
      p_immediate_needs: immediateNeeds,
      p_health_concerns: healthConcerns,
      p_risk_factors: riskFactors,
      p_situation_notes: situationNotes,
      p_general_notes: generalNotes,
      p_changed_fields: changedFields,
      p_change_reason: changeReason ?? null,
    });
    assertRpcOk(updateResult, 'client_intake_update');

    revalidatePath(`/ops/clients/${personId}`);

    return { status: 'success', message: 'Situation updated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update situation details.' };
  }
}

export async function createAliasAction(
  _prev: ClientRecordFormState,
  formData: FormData,
): Promise<ClientRecordFormState> {
  try {
    const personId = getNumber(formData, 'person_id', { required: true });
    const aliasName = getString(formData, 'alias_name', { required: true });
    const changeReason = getString(formData, 'change_reason');
    if (!personId || !aliasName) return { status: 'error', message: 'Alias name is required.' };

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before adding aliases.');

    const core = supabase.schema('core');
    const { data: existing } = await core
      .from('people_aliases')
      .select('id, is_active')
      .eq('person_id', personId)
      .ilike('alias_name', aliasName)
      .maybeSingle();

    if (existing?.id && existing.is_active) {
      return { status: 'error', message: 'That alias is already on file.' };
    }

    if (existing?.id && !existing.is_active) {
      const restoreResult = await supabase.schema('core').rpc('person_alias_set_active', {
        p_person_id: personId,
        p_alias_id: existing.id,
        p_is_active: true,
        p_change_reason: changeReason ?? null,
      });
      assertRpcOk(restoreResult, 'person_alias_set_active');

      revalidatePath(`/ops/clients/${personId}`);

      return { status: 'success', message: 'Alias restored.' };
    }

    const createResult = await supabase.schema('core').rpc('person_alias_create', {
      p_person_id: personId,
      p_alias_name: aliasName,
      p_change_reason: changeReason ?? null,
    });
    assertRpcOk(createResult, 'person_alias_create');

    const aliasId = typeof createResult.data === 'number' ? createResult.data : Number(createResult.data);
    if (!aliasId || Number.isNaN(aliasId)) {
      return { status: 'error', message: 'Unable to add alias.' };
    }

    revalidatePath(`/ops/clients/${personId}`);

    return { status: 'success', message: 'Alias added.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to add alias.' };
  }
}

export async function updateAliasAction(
  _prev: ClientRecordFormState,
  formData: FormData,
): Promise<ClientRecordFormState> {
  try {
    const aliasId = getNumber(formData, 'alias_id', { required: true });
    const personId = getNumber(formData, 'person_id', { required: true });
    const aliasName = getString(formData, 'alias_name', { required: true });
    const changeReason = getString(formData, 'change_reason');
    if (!aliasId || !personId || !aliasName) return { status: 'error', message: 'Alias name is required.' };

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating aliases.');

    const core = supabase.schema('core');
    const { data: existing, error } = await core
      .from('people_aliases')
      .select('id, alias_name, is_active')
      .eq('id', aliasId)
      .eq('person_id', personId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Alias not found.' };
    }

    if (existing.alias_name === aliasName) {
      return { status: 'success', message: 'No alias changes to save.' };
    }

    const { data: duplicate } = await core
      .from('people_aliases')
      .select('id, is_active')
      .eq('person_id', personId)
      .ilike('alias_name', aliasName)
      .maybeSingle();

    if (duplicate?.id && duplicate.id !== aliasId && duplicate.is_active) {
      return { status: 'error', message: 'That alias already exists.' };
    }

    const updateResult = await supabase.schema('core').rpc('person_alias_update', {
      p_person_id: personId,
      p_alias_id: aliasId,
      p_alias_name: aliasName,
      p_change_reason: changeReason ?? null,
    });
    assertRpcOk(updateResult, 'person_alias_update');

    revalidatePath(`/ops/clients/${personId}`);

    return { status: 'success', message: 'Alias updated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update alias.' };
  }
}

export async function setAliasActiveAction(
  _prev: ClientRecordFormState,
  formData: FormData,
): Promise<ClientRecordFormState> {
  try {
    const aliasId = getNumber(formData, 'alias_id', { required: true });
    const personId = getNumber(formData, 'person_id', { required: true });
    const isActive = formData.get('is_active') === 'true';
    const changeReason = getString(formData, 'change_reason');
    if (!aliasId || !personId) return { status: 'error', message: 'Alias context is missing.' };

    const supabase = await createSupabaseServerClient();
    const access = await loadPortalAccess(supabase);
    assertCanEditClientRecord(access);
    assertOrganizationSelected(access, 'Select an acting organization before updating aliases.');

    const core = supabase.schema('core');
    const { data: existing, error } = await core
      .from('people_aliases')
      .select('id, alias_name, is_active')
      .eq('id', aliasId)
      .eq('person_id', personId)
      .maybeSingle();

    if (error || !existing) {
      return { status: 'error', message: 'Alias not found.' };
    }

    if (existing.is_active === isActive) {
      return { status: 'success', message: 'No alias changes to save.' };
    }

    const updateResult = await supabase.schema('core').rpc('person_alias_set_active', {
      p_person_id: personId,
      p_alias_id: aliasId,
      p_is_active: isActive,
      p_change_reason: changeReason ?? null,
    });
    assertRpcOk(updateResult, 'person_alias_set_active');

    revalidatePath(`/ops/clients/${personId}`);

    return { status: 'success', message: isActive ? 'Alias restored.' : 'Alias deactivated.' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Unable to update alias status.' };
  }
}
