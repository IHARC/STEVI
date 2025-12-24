import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

export type OnboardingStatusState = 'NOT_STARTED' | 'NEEDS_CONSENTS' | 'COMPLETED';

export type OnboardingStatus = {
  status: OnboardingStatusState;
  hasPerson: boolean;
  hasIntake: boolean;
  hasServiceAgreementConsent: boolean;
  hasPrivacyAcknowledgement: boolean;
  hasDataSharingPreference: boolean;
  personId: number | null;
  profileId: string | null;
  lastUpdatedAt: string | null;
};

type ResolverInput = {
  userId?: string | null;
  personId?: number | null;
};

type PersonSnapshot = Pick<
  Database['core']['Tables']['people']['Row'],
  'id' | 'status' | 'updated_at' | 'created_at'
>;

type IntakeSnapshot = Pick<
  Database['case_mgmt']['Tables']['client_intakes']['Row'],
  'id' | 'consent_confirmed' | 'privacy_acknowledged' | 'created_at'
>;

type ConsentSnapshot = {
  id: string;
  person_id: number;
  status: 'active' | 'revoked' | 'expired';
  scope: 'all_orgs' | 'selected_orgs' | 'none';
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type RegistrationFlowSnapshot = Pick<
  Database['portal']['Tables']['registration_flows']['Row'],
  'id' | 'updated_at' | 'created_at'
>;

type ResolvedIdentifiers = {
  personId: number | null;
  profileId: string | null;
  linkedAt: string | null;
};

type RegistrationLookup = {
  userId: string | null;
  profileId: string | null;
};

const PERSON_STATUS_INACTIVE: Database['core']['Enums']['person_status'] = 'inactive';

const CORE_SCHEMA = 'core';
const PORTAL_SCHEMA = 'portal';
const CASE_MGMT_SCHEMA = 'case_mgmt';

const PEOPLE_TABLE = 'people';
const USER_PEOPLE_TABLE = 'user_people';
const PROFILES_TABLE = 'profiles';
const CLIENT_INTAKES_TABLE = 'client_intakes';
const REGISTRATION_FLOWS_TABLE = 'registration_flows';

function pickLatestTimestamp(...timestamps: Array<string | null | undefined>): string | null {
  const dated = timestamps
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, parsed: Date.parse(value) }))
    .filter(({ parsed }) => Number.isFinite(parsed));

  if (dated.length === 0) {
    return null;
  }

  return dated.reduce((latest, current) => (current.parsed > latest.parsed ? current : latest)).value;
}

async function resolveIdentifiers(
  supabase: SupabaseAnyServerClient,
  { userId, personId: personIdInput }: ResolverInput,
): Promise<ResolvedIdentifiers> {
  const result: ResolvedIdentifiers = {
    personId: personIdInput ?? null,
    profileId: null,
    linkedAt: null,
  };

  if (userId) {
    const portal = supabase.schema(PORTAL_SCHEMA);
    const { data: profileRow, error: profileError } = await portal
      .from(PROFILES_TABLE)
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileError) {
      throw new Error('Unable to resolve onboarding status right now.');
    }

    result.profileId = profileRow?.id ?? null;
  }

  if (userId) {
    const core = supabase.schema(CORE_SCHEMA);
    const { data: linkRow, error: linkError } = await core
      .from(USER_PEOPLE_TABLE)
      .select('person_id, profile_id, linked_at')
      .eq('user_id', userId)
      .order('linked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkError) {
      throw new Error('Unable to resolve onboarding status right now.');
    }

    result.linkedAt = linkRow?.linked_at ?? null;
    if (!result.personId) {
      result.personId = linkRow?.person_id ?? null;
    }
    if (!result.profileId) {
      result.profileId = linkRow?.profile_id ?? null;
    }
  }

  return result;
}

async function loadPersonSnapshot(
  supabase: SupabaseAnyServerClient,
  personId: number | null,
): Promise<PersonSnapshot | null> {
  if (!personId) {
    return null;
  }

  const core = supabase.schema(CORE_SCHEMA);
  const { data, error } = await core
    .from(PEOPLE_TABLE)
    .select('id, status, updated_at, created_at')
    .eq('id', personId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve onboarding status right now.');
  }

  return data ?? null;
}

async function loadLatestIntake(
  supabase: SupabaseAnyServerClient,
  personId: number | null,
): Promise<IntakeSnapshot | null> {
  if (!personId) {
    return null;
  }

  const caseMgmt = supabase.schema(CASE_MGMT_SCHEMA);
  const { data, error } = await caseMgmt
    .from(CLIENT_INTAKES_TABLE)
    .select('id, consent_confirmed, privacy_acknowledged, created_at')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve onboarding status right now.');
  }

  return data ?? null;
}

async function loadLatestConsent(
  supabase: SupabaseAnyServerClient,
  personId: number | null,
): Promise<ConsentSnapshot | null> {
  if (!personId) {
    return null;
  }

  const core = supabase.schema(CORE_SCHEMA);
  const { data, error } = await core
    .from('person_consents')
    .select('id, person_id, status, scope, expires_at, created_at, updated_at')
    .eq('person_id', personId)
    .eq('consent_type', 'data_sharing')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve onboarding status right now.');
  }

  return (data as ConsentSnapshot | null) ?? null;
}

async function loadLatestRegistrationFlowTimestamp(
  supabase: SupabaseAnyServerClient,
  { userId, profileId }: RegistrationLookup,
): Promise<string | null> {
  const filters: string[] = [];
  if (profileId) {
    filters.push(`profile_id.eq.${profileId}`);
  }
  if (userId) {
    filters.push(`supabase_user_id.eq.${userId}`);
  }

  if (filters.length === 0) {
    return null;
  }

  const portal = supabase.schema(PORTAL_SCHEMA);
  let query = portal
    .from(REGISTRATION_FLOWS_TABLE)
    .select('id, updated_at, created_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (filters.length === 1) {
    const [column, value] = filters[0].split('.eq.');
    if (column && value) {
      query = query.eq(column, value);
    }
  } else {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error('Unable to resolve onboarding status right now.');
  }

  const flow = data as RegistrationFlowSnapshot | null;
  if (!flow) {
    return null;
  }

  return flow.updated_at ?? flow.created_at ?? null;
}

export async function getOnboardingStatus(
  params: ResolverInput,
  supabaseClient?: SupabaseAnyServerClient,
): Promise<OnboardingStatus> {
  const { userId = null, personId = null } = params;

  if (!userId && !personId) {
    throw new Error('Onboarding status requires a user id or person id.');
  }

  const supabase = supabaseClient ?? (await createSupabaseRSCClient());

  const identifiers = await resolveIdentifiers(supabase, { userId, personId });

  const [person, intake, consent, registrationFlowUpdatedAt] = await Promise.all([
    loadPersonSnapshot(supabase, identifiers.personId),
    loadLatestIntake(supabase, identifiers.personId),
    loadLatestConsent(supabase, identifiers.personId),
    loadLatestRegistrationFlowTimestamp(supabase, { userId, profileId: identifiers.profileId }),
  ]);

  const hasPerson = person ? person.status !== PERSON_STATUS_INACTIVE : false;
  const hasIntake = Boolean(intake);
  const hasServiceAgreementConsent = intake?.consent_confirmed === true;
  const hasPrivacyAcknowledgement = intake?.privacy_acknowledged === true;
  const consentExpiresAt = consent?.expires_at ?? null;
  const consentExpired = !consentExpiresAt || Date.parse(consentExpiresAt) <= Date.now();
  const hasDataSharingPreference = Boolean(consent && consent.status === 'active' && !consentExpired);

  const status: OnboardingStatusState = !hasPerson
    ? 'NOT_STARTED'
    : hasServiceAgreementConsent && hasPrivacyAcknowledgement && hasDataSharingPreference
      ? 'COMPLETED'
      : 'NEEDS_CONSENTS';

  const lastUpdatedAt = pickLatestTimestamp(
    person?.updated_at,
    person?.created_at,
    intake?.created_at,
    consent?.updated_at ?? consent?.created_at ?? null,
    identifiers.linkedAt,
    registrationFlowUpdatedAt,
  );

  return {
    status,
    hasPerson,
    hasIntake,
    hasServiceAgreementConsent,
    hasPrivacyAcknowledgement,
    hasDataSharingPreference,
    personId: person?.id ?? identifiers.personId ?? null,
    profileId: identifiers.profileId,
    lastUpdatedAt,
  };
}

export async function getOnboardingStatusForUser(
  userId: string,
  supabaseClient?: SupabaseAnyServerClient,
): Promise<OnboardingStatus> {
  return getOnboardingStatus({ userId }, supabaseClient);
}

export async function getOnboardingStatusForPerson(
  personId: number,
  supabaseClient?: SupabaseAnyServerClient,
): Promise<OnboardingStatus> {
  return getOnboardingStatus({ personId }, supabaseClient);
}

type UserPersonLinkSnapshot = Pick<Database['core']['Tables']['user_people']['Row'], 'person_id' | 'profile_id' | 'linked_at'>;

type RegistrationFlowRow = Pick<Database['portal']['Tables']['registration_flows']['Row'], 'profile_id' | 'updated_at' | 'created_at'>;

export async function getOnboardingStatusForPeople(
  personIds: number[],
  supabaseClient?: SupabaseAnyServerClient,
): Promise<Record<number, OnboardingStatus>> {
  if (personIds.length === 0) {
    return {};
  }

  const supabase = supabaseClient ?? (await createSupabaseRSCClient());

  const core = supabase.schema(CORE_SCHEMA);
  const caseMgmt = supabase.schema(CASE_MGMT_SCHEMA);

  const [peopleResult, intakeResult, linkResult, consentResult] = await Promise.all([
    core
      .from(PEOPLE_TABLE)
      .select('id, status, updated_at, created_at')
      .in('id', personIds),
    caseMgmt
      .from(CLIENT_INTAKES_TABLE)
      .select('id, person_id, consent_confirmed, privacy_acknowledged, created_at')
      .in('person_id', personIds)
      .order('created_at', { ascending: false }),
    core
      .from(USER_PEOPLE_TABLE)
      .select('person_id, profile_id, linked_at')
      .in('person_id', personIds)
      .order('linked_at', { ascending: false }),
    core
      .from('person_consents')
      .select('id, person_id, status, scope, expires_at, created_at, updated_at')
      .in('person_id', personIds)
      .eq('consent_type', 'data_sharing')
      .order('created_at', { ascending: false }),
  ]);

  if (peopleResult.error) throw peopleResult.error;
  if (intakeResult.error) throw intakeResult.error;
  if (linkResult.error) throw linkResult.error;
  if (consentResult.error) throw consentResult.error;

  const people = (peopleResult.data ?? []) as PersonSnapshot[];
  const intakes = (intakeResult.data ?? []) as Array<IntakeSnapshot & { person_id: number }>;
  const links = (linkResult.data ?? []) as UserPersonLinkSnapshot[];
  const consents = (consentResult.data ?? []) as ConsentSnapshot[];

  const personMap = new Map<number, PersonSnapshot>(people.map((row) => [row.id, row]));

  const latestIntakeByPerson = new Map<number, IntakeSnapshot>();
  for (const row of intakes) {
    if (!latestIntakeByPerson.has(row.person_id)) {
      latestIntakeByPerson.set(row.person_id, {
        id: row.id,
        consent_confirmed: row.consent_confirmed,
        privacy_acknowledged: row.privacy_acknowledged,
        created_at: row.created_at,
      });
    }
  }

  const latestLinkByPerson = new Map<
    number,
    { profileId: string | null; linkedAt: string | null }
  >();
  const profileIds: string[] = [];

  for (const row of links) {
    if (!latestLinkByPerson.has(row.person_id)) {
      latestLinkByPerson.set(row.person_id, {
        profileId: row.profile_id ?? null,
        linkedAt: row.linked_at ?? null,
      });
      if (row.profile_id) {
        profileIds.push(row.profile_id);
      }
    }
  }

  const latestConsentByPerson = new Map<number, ConsentSnapshot>();
  for (const row of consents) {
    if (!latestConsentByPerson.has(row.person_id)) {
      latestConsentByPerson.set(row.person_id, row);
    }
  }

  let latestRegistrationByProfile = new Map<string, string>();
  if (profileIds.length > 0) {
    const portal = supabase.schema(PORTAL_SCHEMA);
    const { data: registrationRows, error: registrationError } = await portal
      .from(REGISTRATION_FLOWS_TABLE)
      .select('profile_id, updated_at, created_at')
      .in('profile_id', profileIds)
      .order('updated_at', { ascending: false });

    if (registrationError) {
      throw registrationError;
    }

    latestRegistrationByProfile = new Map<string, string>();

    for (const row of (registrationRows ?? []) as RegistrationFlowRow[]) {
      const profileId = row.profile_id as string | null;
      const timestamp = row.updated_at ?? row.created_at ?? null;
      if (!profileId || !timestamp) continue;
      if (!latestRegistrationByProfile.has(profileId)) {
        latestRegistrationByProfile.set(profileId, timestamp);
      }
    }
  }

  const result: Record<number, OnboardingStatus> = {};

  for (const personId of personIds) {
    const person = personMap.get(personId) ?? null;
    const intake = latestIntakeByPerson.get(personId) ?? null;
    const link = latestLinkByPerson.get(personId) ?? null;
    const consent = latestConsentByPerson.get(personId) ?? null;
    const registrationUpdatedAt =
      link?.profileId && latestRegistrationByProfile.has(link.profileId)
        ? latestRegistrationByProfile.get(link.profileId) ?? null
        : null;

    const hasPerson = person ? person.status !== PERSON_STATUS_INACTIVE : false;
    const hasServiceAgreementConsent = intake?.consent_confirmed === true;
    const hasPrivacyAcknowledgement = intake?.privacy_acknowledged === true;
    const consentExpiresAt = consent?.expires_at ?? null;
    const consentExpired = !consentExpiresAt || Date.parse(consentExpiresAt) <= Date.now();
    const hasDataSharingPreference = Boolean(consent && consent.status === 'active' && !consentExpired);

    const status: OnboardingStatusState = !hasPerson
      ? 'NOT_STARTED'
      : hasServiceAgreementConsent && hasPrivacyAcknowledgement && hasDataSharingPreference
        ? 'COMPLETED'
        : 'NEEDS_CONSENTS';

    const lastUpdatedAt = pickLatestTimestamp(
      person?.updated_at,
      person?.created_at,
      intake?.created_at,
      consent?.updated_at ?? consent?.created_at ?? null,
      link?.linkedAt ?? null,
      registrationUpdatedAt,
    );

    result[personId] = {
      status,
      hasPerson,
      hasIntake: Boolean(intake),
      hasServiceAgreementConsent,
      hasPrivacyAcknowledgement,
      hasDataSharingPreference,
      personId: person?.id ?? personId ?? null,
      profileId: link?.profileId ?? null,
      lastUpdatedAt,
    };
  }

  return result;
}
