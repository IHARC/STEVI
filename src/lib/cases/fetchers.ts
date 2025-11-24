import { findPersonForUser } from '@/lib/cases/person';
import type {
  CaseActivity,
  CaseSummary,
  ClientCaseDetail,
  ConsentSnapshot,
  IntakeSubmission,
  CaseRecord,
} from '@/lib/cases/types';
import type { Database } from '@/types/supabase';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

const CASE_TABLE = 'case_management';
const ACTIVITIES_TABLE = 'people_activities';
const REGISTRATION_TABLE = 'registration_flows';
type RegistrationRow = Database['portal']['Tables']['registration_flows']['Row'];
type ActivityRow = Database['core']['Tables']['people_activities']['Row'];

export async function fetchClientCases(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<CaseSummary[]> {
  const person = await findPersonForUser(supabase, userId);
  if (!person) return [];

  const caseMgmt = supabase.schema('case_mgmt');
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select('*')
    .eq('person_id', person.id)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error('Unable to load your cases right now.');
  }

  return (data ?? []).map(toCaseSummary);
}

export async function fetchClientCaseDetail(
  supabase: SupabaseAnyServerClient,
  userId: string,
  caseId: number,
): Promise<ClientCaseDetail | null> {
  const person = await findPersonForUser(supabase, userId);
  if (!person) return null;

  const caseMgmt = supabase.schema('case_mgmt');
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select('*')
    .eq('id', caseId)
    .eq('person_id', person.id)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load that case.');
  }

  if (!data) return null;

  return {
    ...toCaseSummary(data),
    personId: person.id,
  };
}

export async function fetchClientCaseActivities(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 20,
): Promise<CaseActivity[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from(ACTIVITIES_TABLE)
    .select('*')
    .eq('person_id', personId)
    .contains('metadata', { client_visible: true })
    .order('activity_date', { ascending: false })
    .order('activity_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Unable to load case activity right now.');
  }

  return (data ?? []).map((row: ActivityRow) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    activityDate: row.activity_date,
    activityTime: row.activity_time,
    activityType: row.activity_type,
  }));
}

export async function fetchPersonConsents(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<{ personId: number; snapshot: ConsentSnapshot } | null> {
  const person = await findPersonForUser(supabase, userId);
  if (!person) return null;

  return {
    personId: person.id,
    snapshot: {
      dataSharing: person.data_sharing_consent,
      preferredContactMethod: person.preferred_contact_method,
      privacyRestrictions: person.privacy_restrictions,
    },
  };
}

export async function fetchStaffCases(
  supabase: SupabaseAnyServerClient,
  limit = 50,
): Promise<ClientCaseDetail[]> {
  const caseMgmt = supabase.schema('case_mgmt');
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select('*')
    .order('start_date', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Unable to load cases.');
  }

  return (data ?? []).map((row: CaseRecord) => ({ ...toCaseSummary(row), personId: row.person_id }));
}

export async function fetchStaffCaseDetail(
  supabase: SupabaseAnyServerClient,
  caseId: number,
): Promise<ClientCaseDetail | null> {
  const caseMgmt = supabase.schema('case_mgmt');
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select('*')
    .eq('id', caseId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load that case.');
  }

  if (!data) return null;

  return { ...toCaseSummary(data), personId: data.person_id };
}

export async function fetchStaffCaseActivities(
  supabase: SupabaseAnyServerClient,
  personId: number,
  limit = 50,
): Promise<CaseActivity[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from(ACTIVITIES_TABLE)
    .select('*')
    .eq('person_id', personId)
    .order('activity_date', { ascending: false })
    .order('activity_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Unable to load activity.');
  }

  return (data ?? []).map((row: ActivityRow) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    activityDate: row.activity_date,
    activityTime: row.activity_time,
    activityType: row.activity_type,
  }));
}

export async function fetchPendingIntakes(
  supabase: SupabaseAnyServerClient,
): Promise<IntakeSubmission[]> {
  const portal = supabase.schema('portal');
  const { data, error } = await portal
    .from(REGISTRATION_TABLE)
    .select('*')
    .eq('flow_type', 'client_intake')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    throw new Error('Unable to load intake submissions.');
  }

  return (data ?? []).map((row: RegistrationRow) => ({
    id: row.id,
    chosenName: row.chosen_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    createdAt: row.created_at,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    supabaseUserId: row.supabase_user_id,
    profileId: row.profile_id,
    consentContact: row.consent_contact,
    consentDataSharing: row.consent_data_sharing,
  }));
}

function toCaseSummary(row: CaseRecord): CaseSummary {
  return {
    id: Number(row.id),
    caseNumber: row.case_number ?? null,
    caseType: row.case_type ?? null,
    status: row.status ?? null,
    priority: row.priority ?? null,
    caseManagerName: row.case_manager_name ?? 'Case manager',
    caseManagerContact: row.case_manager_contact ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
  };
}
