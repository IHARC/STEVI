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
  'id' | 'status' | 'data_sharing_consent' | 'updated_at' | 'created_at'
>;

type IntakeSnapshot = Pick<
  Database['case_mgmt']['Tables']['client_intakes']['Row'],
  'id' | 'consent_confirmed' | 'privacy_acknowledged' | 'created_at'
>;

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
    .select('id, status, data_sharing_consent, updated_at, created_at')
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

  const [person, intake, registrationFlowUpdatedAt] = await Promise.all([
    loadPersonSnapshot(supabase, identifiers.personId),
    loadLatestIntake(supabase, identifiers.personId),
    loadLatestRegistrationFlowTimestamp(supabase, { userId, profileId: identifiers.profileId }),
  ]);

  const hasPerson = person ? person.status !== PERSON_STATUS_INACTIVE : false;
  const hasIntake = Boolean(intake);
  const hasServiceAgreementConsent = intake?.consent_confirmed === true;
  const hasPrivacyAcknowledgement = intake?.privacy_acknowledged === true;
  const hasDataSharingPreference = typeof person?.data_sharing_consent === 'boolean';

  const status: OnboardingStatusState = !hasPerson
    ? 'NOT_STARTED'
    : hasServiceAgreementConsent && hasPrivacyAcknowledgement && hasDataSharingPreference
      ? 'COMPLETED'
      : 'NEEDS_CONSENTS';

  const lastUpdatedAt = pickLatestTimestamp(
    person?.updated_at,
    person?.created_at,
    intake?.created_at,
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
