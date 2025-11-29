'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { getOnboardingStatus, type OnboardingStatus } from '@/lib/onboarding/status';
import { resolveOnboardingActor, composeContactContext } from '@/lib/onboarding/utils';
import { findPersonForUser } from '@/lib/cases/person';
import { normalizePhoneNumber } from '@/lib/phone';
import { normalizeEmail } from '@/lib/email';
import { normalizePostalCode } from '@/lib/registration';
import type { Database } from '@/types/supabase';

export type OnboardingActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  nextStatus?: OnboardingStatus;
  personId?: number | null;
  profileId?: string | null;
};

const IDLE_STATE: OnboardingActionState = { status: 'idle' };

function errorState(message: string): OnboardingActionState {
  return { status: 'error', message };
}

function successState(partial: Partial<OnboardingActionState> = {}): OnboardingActionState {
  return { status: 'success', ...partial };
}

function parseNumber(value: FormDataEntryValue | null, min?: number, max?: number): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  if (typeof min === 'number' && parsed < min) return null;
  if (typeof max === 'number' && parsed > max) return null;
  return parsed;
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'on' || value === 'true';
}

function sanitizeShortText(value: FormDataEntryValue | null, max = 160): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

async function upsertRegistrationDraft(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  {
    userId,
    profileId,
    chosenName,
    legalName,
    email,
    phone,
    safeCall,
    safeText,
    safeVoicemail,
    contactWindow,
    postalCode,
    dobMonth,
    dobYear,
    preferredContactMethod,
  }: {
    userId: string;
    profileId: string;
    chosenName: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    safeCall: boolean;
    safeText: boolean;
    safeVoicemail: boolean;
    contactWindow: string | null;
    postalCode: string | null;
    dobMonth: number | null;
    dobYear: number | null;
    preferredContactMethod: string | null;
  },
) {
  const portal = supabase.schema('portal');

  const { data: existing, error: fetchError } = await portal
    .from('registration_flows')
    .select('id')
    .eq('supabase_user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error('Unable to save your onboarding details right now.');
  }

  const now = new Date().toISOString();
  const basePayload: Database['portal']['Tables']['registration_flows']['Update'] = {
    chosen_name: chosenName,
    legal_name: legalName,
    contact_email: email,
    contact_phone: phone,
    contact_phone_safe_call: safeCall,
    contact_phone_safe_text: safeText,
    contact_phone_safe_voicemail: safeVoicemail,
    contact_window: contactWindow,
    postal_code: postalCode,
    date_of_birth_month: dobMonth,
    date_of_birth_year: dobYear,
    supabase_user_id: userId,
    profile_id: profileId,
    flow_type: 'client_onboarding',
    status: 'in_progress',
    updated_at: now,
    updated_by_user_id: userId,
    metadata: {
      source: 'onboarding_wizard',
      preferred_contact_method: preferredContactMethod,
    },
  };

  if (existing?.id) {
    const { error: updateError } = await portal
      .from('registration_flows')
      .update(basePayload)
      .eq('id', existing.id);

    if (updateError) {
      throw new Error('Unable to update your onboarding details.');
    }
  } else {
    const insertPayload: Database['portal']['Tables']['registration_flows']['Insert'] = {
      ...basePayload,
      chosen_name: chosenName,
      flow_type: 'client_onboarding',
      status: 'in_progress',
      created_at: now,
      created_by_user_id: userId,
    };

    const { error: insertError } = await portal.from('registration_flows').insert(insertPayload);
    if (insertError) {
      throw new Error('Unable to save your onboarding details.');
    }
  }
}

type PersonRow = Pick<
  Database['core']['Tables']['people']['Row'],
  'id' | 'status' | 'data_sharing_consent'
>;

type RegistrationContext = Pick<
  Database['portal']['Tables']['registration_flows']['Row'],
  | 'contact_window'
  | 'postal_code'
  | 'date_of_birth_month'
  | 'date_of_birth_year'
  | 'contact_phone_safe_call'
  | 'contact_phone_safe_text'
  | 'contact_phone_safe_voicemail'
>;

async function loadPersonById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  personId: number,
): Promise<PersonRow | null> {
  const { data, error } = await supabase
    .schema('core')
    .from('people')
    .select('id, status, data_sharing_consent')
    .eq('id', personId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load that client record right now.');
  }

  return (data as PersonRow | null) ?? null;
}

async function loadLatestRegistrationContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  profileId: string | null,
): Promise<RegistrationContext | null> {
  const portal = supabase.schema('portal');
  const filters = [userId ? `supabase_user_id.eq.${userId}` : null, profileId ? `profile_id.eq.${profileId}` : null].filter(
    Boolean,
  );

  if (filters.length === 0) {
    return null;
  }

  let query = portal
    .from('registration_flows')
    .select(
      'contact_window, postal_code, date_of_birth_month, date_of_birth_year, contact_phone_safe_call, contact_phone_safe_text, contact_phone_safe_voicemail',
    )
    .order('updated_at', { ascending: false })
    .limit(1);

  if (filters.length === 1) {
    const [filter] = filters;
    const [column, value] = (filter as string).split('.eq.');
    if (column && value) {
      query = query.eq(column, value);
    }
  } else {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return null;
  }

  return data as RegistrationContext | null;
}

export async function saveBasicInfoAction(_prev: OnboardingActionState, formData: FormData): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return errorState('Sign in to continue onboarding.');
  }

  const actor = resolveOnboardingActor(access);
  const personIdInput = parseNumber(formData.get('person_id'));
  const chosenName = sanitizeShortText(formData.get('chosen_name')) ?? '';
  const legalName = sanitizeShortText(formData.get('legal_name'));
  const pronouns = sanitizeShortText(formData.get('pronouns'));
  const preferredContactMethod = sanitizeShortText(formData.get('preferred_contact_method')) ?? 'email';
  const contactWindow = sanitizeShortText(formData.get('contact_window'), 120);
  const postalCode = normalizePostalCode(sanitizeShortText(formData.get('postal_code')));
  const dobMonth = parseNumber(formData.get('dob_month'), 1, 12);
  const dobYear = parseNumber(formData.get('dob_year'), 1900, new Date().getFullYear());
  const safeCall = parseBoolean(formData.get('safe_call'));
  const safeText = parseBoolean(formData.get('safe_text'));
  const safeVoicemail = parseBoolean(formData.get('safe_voicemail'));
  const email = normalizeEmail(formData.get('contact_email')) ?? null;
  const phone = normalizePhoneNumber(formData.get('contact_phone')) ?? null;
  const contactContext = composeContactContext({
    contactWindow,
    postalCode,
    dobMonth,
    dobYear,
    safeCall,
    safeText,
    safeVoicemail,
  });

  if (!chosenName || chosenName.length < 2) {
    return errorState('Share the name you want staff to use.');
  }

  if (!email && !phone) {
    return errorState('Add at least one way to contact you.');
  }

  let personId = personIdInput ?? null;
  let personCreated = false;

  if (!personId) {
    const linked = await findPersonForUser(supabase, access.userId);
    personId = linked?.id ?? null;
  }

  let personRow: PersonRow | null = null;
  if (personId) {
    personRow = await loadPersonById(supabase, personId);
    if (personRow?.status === 'inactive') {
      return errorState('This client record is inactive. Ask an admin to reactivate it before onboarding.');
    }
  }

  if (!personRow) {
    if (actor === 'client' || actor === 'partner') {
      return errorState('A client record is required. Please contact IHARC staff to start onboarding.');
    }

    const core = supabase.schema('core');
    const { data, error } = await core
      .from('people')
      .insert({
        first_name: chosenName,
        last_name: legalName,
        email,
        phone,
        preferred_pronouns: pronouns,
        preferred_contact_method: preferredContactMethod,
        privacy_restrictions: contactContext,
        status: 'active',
        created_by: access.userId,
        updated_by: access.userId,
      })
      .select('id, status, data_sharing_consent')
      .single();

    if (error) {
      return errorState('Unable to create the client record. Check your access or try again.');
    }

    personRow = data as PersonRow;
    personId = personRow.id;
    personCreated = true;
  } else {
    const core = supabase.schema('core');
    const { error } = await core
      .from('people')
      .update({
        first_name: chosenName,
        last_name: legalName,
        email,
        phone,
        preferred_pronouns: pronouns,
        preferred_contact_method: preferredContactMethod,
        privacy_restrictions: contactContext,
        updated_by: access.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', personRow.id);

    if (error) {
      return errorState('Unable to save your details right now.');
    }
  }

  try {
    await upsertRegistrationDraft(supabase, {
      userId: access.userId,
      profileId: access.profile.id,
      chosenName,
      legalName,
      email,
      phone,
      safeCall,
      safeText,
      safeVoicemail,
      contactWindow,
      postalCode,
      dobMonth,
      dobYear,
      preferredContactMethod,
    });
  } catch (registrationError) {
    console.warn('Failed to upsert registration draft', registrationError);
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'onboarding_basic_info_saved',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: {
      person_id: personId,
      actor_role: actor,
      created: personCreated,
      preferred_contact_method: preferredContactMethod,
    },
  });

  const nextStatus = await getOnboardingStatus({ userId: access.userId, personId }, supabase);

  return successState({ nextStatus, personId, profileId: access.profile.id });
}

export async function recordConsentsAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return errorState('Sign in to record consents.');
  }

  const personId = parseNumber(formData.get('person_id'));
  const consentServiceAgreement = parseBoolean(formData.get('consent_service_agreement'));
  const consentPrivacy = parseBoolean(formData.get('consent_privacy'));

  if (!personId) {
    return errorState('A client record is required before capturing consent.');
  }

  if (!consentServiceAgreement || !consentPrivacy) {
    return errorState('Confirm the service agreement and privacy notice to continue.');
  }

  const personRow = await loadPersonById(supabase, personId);
  if (!personRow || personRow.status === 'inactive') {
    return errorState('That client record is inactive or missing.');
  }

  const core = supabase.schema('case_mgmt');
  const now = new Date();

  const registrationContext = await loadLatestRegistrationContext(supabase, access.userId, access.profile.id);

  const generalNotes = composeContactContext({
    contactWindow: registrationContext?.contact_window ?? null,
    postalCode: registrationContext?.postal_code ?? null,
    dobMonth: registrationContext?.date_of_birth_month ?? null,
    dobYear: registrationContext?.date_of_birth_year ?? null,
    safeCall: registrationContext?.contact_phone_safe_call ?? false,
    safeText: registrationContext?.contact_phone_safe_text ?? false,
    safeVoicemail: registrationContext?.contact_phone_safe_voicemail ?? false,
  });

  const { data: intakeRow, error } = await core
    .from('client_intakes')
    .insert({
      person_id: personId,
      consent_confirmed: consentServiceAgreement,
      privacy_acknowledged: consentPrivacy,
      intake_date: now.toISOString().slice(0, 10),
      intake_worker: access.profile.display_name ?? 'Portal',
      general_notes: generalNotes,
    })
    .select('id')
    .single();

  if (error || !intakeRow) {
    return errorState('Could not record consent right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'onboarding_consents_recorded',
    entityType: 'case_mgmt.client_intakes',
    entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'client_intakes', id: intakeRow.id }),
    meta: { person_id: personId, consent_confirmed: consentServiceAgreement, privacy_acknowledged: consentPrivacy },
  });

  const nextStatus = await getOnboardingStatus({ userId: access.userId, personId }, supabase);

  return successState({ nextStatus, personId, profileId: access.profile.id });
}

export async function saveSharingPreferenceAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return errorState('Sign in to update sharing preferences.');
  }

  const actor = resolveOnboardingActor(access);
  if (actor === 'partner') {
    return errorState('Only the client or IHARC staff can change data sharing preferences.');
  }

  const personId = parseNumber(formData.get('person_id'));
  const sharingChoice = sanitizeShortText(formData.get('data_sharing')) ?? 'iharc_only';
  const dataSharingConsent = sharingChoice === 'partners';

  if (!personId) {
    return errorState('A client record is required before setting sharing preferences.');
  }

  const personRow = await loadPersonById(supabase, personId);
  if (!personRow || personRow.status === 'inactive') {
    return errorState('That client record is inactive or missing.');
  }

  const core = supabase.schema('core');
  const { error } = await core
    .from('people')
    .update({
      data_sharing_consent: dataSharingConsent,
      updated_at: new Date().toISOString(),
      updated_by: access.userId,
    })
    .eq('id', personId);

  if (error) {
    return errorState('Unable to save the sharing choice right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'onboarding_sharing_saved',
    entityType: 'people',
    entityRef: buildEntityRef({ schema: 'core', table: 'people', id: personId }),
    meta: { person_id: personId, data_sharing_consent: dataSharingConsent, actor_role: actor },
  });

  const nextStatus = await getOnboardingStatus({ userId: access.userId, personId }, supabase);

  return successState({ nextStatus, personId, profileId: access.profile.id });
}

export async function linkAccountToPersonAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return errorState('Sign in to link your account.');
  }

  const actor = resolveOnboardingActor(access);
  if (actor !== 'client') {
    return errorState('Only the client can link their portal account to this record.');
  }

  const personId = parseNumber(formData.get('person_id'));
  if (!personId) {
    return errorState('A client record is required before linking.');
  }

  const personRow = await loadPersonById(supabase, personId);
  if (!personRow || personRow.status === 'inactive') {
    return errorState('That client record is inactive or missing.');
  }

  const core = supabase.schema('core');
  const { error } = await core.from('user_people').upsert({
    user_id: access.userId,
    profile_id: access.profile.id,
    person_id: personId,
    linked_at: new Date().toISOString(),
  });

  if (error) {
    return errorState('Unable to link your account right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'onboarding_account_linked',
    entityType: 'user_people',
    entityRef: buildEntityRef({ schema: 'core', table: 'user_people', id: personId }),
    meta: { person_id: personId, user_id: access.userId },
  });

  const nextStatus = await getOnboardingStatus({ userId: access.userId, personId }, supabase);

  return successState({ nextStatus, personId, profileId: access.profile.id });
}

export { IDLE_STATE as INITIAL_ONBOARDING_ACTION_STATE };
