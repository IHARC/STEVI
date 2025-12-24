'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { getOnboardingStatus, type OnboardingStatus } from '@/lib/onboarding/status';
import { resolveOnboardingActor, composeContactContext } from '@/lib/onboarding/utils';
import { findPersonForUser } from '@/lib/cases/person';
import {
  consentAllowsOrg,
  listConsentOrgs,
  listParticipatingOrganizations,
  resolveConsentOrgSelections,
  saveConsent,
} from '@/lib/consents';
import { normalizePhoneNumber } from '@/lib/phone';
import { normalizeEmail } from '@/lib/email';
import { normalizePostalCode } from '@/lib/registration';
import { getBoolean, getNumber } from '@/lib/server-actions/form';
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

function sanitizeShortText(value: FormDataEntryValue | null, max = 160): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

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
  'id' | 'status'
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
    .select('id, status')
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
  const personIdInput = getNumber(formData, 'person_id');
  const chosenName = sanitizeShortText(formData.get('chosen_name')) ?? '';
  const legalName = sanitizeShortText(formData.get('legal_name'));
  const pronouns = sanitizeShortText(formData.get('pronouns'));
  const preferredContactMethod = sanitizeShortText(formData.get('preferred_contact_method')) ?? 'email';
  const contactWindow = sanitizeShortText(formData.get('contact_window'), 120);
  const postalCode = normalizePostalCode(sanitizeShortText(formData.get('postal_code')));
  const dobMonth = getNumber(formData, 'dob_month', { min: 1, max: 12 });
  const dobYear = getNumber(formData, 'dob_year', { min: 1900, max: new Date().getFullYear() });
  const safeCall = getBoolean(formData, 'safe_call');
  const safeText = getBoolean(formData, 'safe_text');
  const safeVoicemail = getBoolean(formData, 'safe_voicemail');
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
      .select('id, status')
      .single();

    if (error) {
      return errorState('Unable to create the client record. Check your access or try again.');
    }

    personRow = data as PersonRow;
    personId = personRow.id;
    personCreated = true;
  } else {
    if (actor === 'partner') {
      const partnerAllowed = await consentAllowsOrg(supabase, personRow.id, access.organizationId);
      if (!partnerAllowed) {
        return errorState('Partner assistance is allowed only when the client has explicitly consented to share with your organization.');
      }
    }

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

  const actor = resolveOnboardingActor(access);
  if (actor === 'partner') {
    return errorState('Partners can review onboarding but cannot capture consents. Ask the client or IHARC staff to proceed.');
  }

  const personId = getNumber(formData, 'person_id');
  const consentServiceAgreement = getBoolean(formData, 'consent_service_agreement');
  const consentPrivacy = getBoolean(formData, 'consent_privacy');

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
      intake_worker: access.profile.id,
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

  const personId = getNumber(formData, 'person_id');
  const consentScope = parseConsentScope(sanitizeShortText(formData.get('consent_scope')));
  const consentConfirmed = getBoolean(formData, 'consent_confirm');
  const policyVersion = sanitizeShortText(formData.get('policy_version'), 120);
  const allowedOrgIds = parseOrgIds(formData, 'org_allowed_ids');

  if (!personId) {
    return errorState('A client record is required before setting sharing preferences.');
  }

  if (!consentConfirmed) {
    return errorState('Confirm your sharing choice before saving.');
  }

  const personRow = await loadPersonById(supabase, personId);
  if (!personRow || personRow.status === 'inactive') {
    return errorState('That client record is inactive or missing.');
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
    return errorState('Select at least one organization to share with.');
  }

  const { consent, previousConsent } = await saveConsent(supabase, {
    personId,
    scope: consentScope,
    allowedOrgIds: Array.from(allowedSet),
    blockedOrgIds,
    actorProfileId: access.profile.id,
    actorUserId: access.userId,
    method: actor === 'staff' ? 'staff_assisted' : 'portal',
    notes: null,
    policyVersion: policyVersion ?? null,
  });

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: previousConsent ? 'consent_updated' : 'consent_created',
    entityType: 'core.person_consents',
    entityRef: buildEntityRef({ schema: 'core', table: 'person_consents', id: consent.id }),
    meta: {
      person_id: personId,
      actor_role: actor,
      scope: consentScope,
      previous_scope: previousConsent?.scope ?? null,
      allowed_org_ids: Array.from(allowedSet),
      blocked_org_ids: blockedOrgIds,
      method: actor === 'staff' ? 'staff_assisted' : 'portal',
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
          person_id: personId,
          previous_allowed_org_ids: previousResolution.allowedOrgIds,
          previous_blocked_org_ids: previousResolution.blockedOrgIds,
          allowed_org_ids: nextResolution.allowedOrgIds,
          blocked_org_ids: nextResolution.blockedOrgIds,
          actor_role: actor,
        },
      });
    }
  }

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

  const personId = getNumber(formData, 'person_id');
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
