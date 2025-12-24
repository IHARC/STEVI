import { findPersonForUser } from '@/lib/cases/person';
import { getEffectiveConsent, listConsentOrgs, listParticipatingOrganizations, resolveConsentOrgSelections } from '@/lib/consents';
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

const CASE_SCHEMA = 'case_mgmt';
const CASE_TABLE = 'case_management';
const ACTIVITIES_TABLE = 'people_activities';
const REGISTRATION_TABLE = 'registration_flows';
const CASE_SELECT = 'id, person_id, case_number, case_type, status, priority, case_manager_name, case_manager_contact, start_date, end_date';
const INTAKE_SELECT = 'id, chosen_name, contact_email, contact_phone, status, created_at, metadata, supabase_user_id, profile_id, consent_contact';
type RegistrationRow = Database['portal']['Tables']['registration_flows']['Row'];
type ActivityRow = Database['core']['Tables']['people_activities']['Row'];

export async function fetchClientCases(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<CaseSummary[]> {
  const person = await findPersonForUser(supabase, userId);
  if (!person) return [];

  const caseMgmt = supabase.schema(CASE_SCHEMA);
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select(CASE_SELECT)
    .eq('person_id', person.id)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Failed to load client cases', { userId, personId: person.id, error });
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

  const caseMgmt = supabase.schema(CASE_SCHEMA);
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select(CASE_SELECT)
    .eq('id', caseId)
    .eq('person_id', person.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load client case detail', { userId, caseId, error });
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
    .select('id, title, description, activity_date, activity_time, activity_type, metadata, provider_org_id, organizations(name)')
    .eq('person_id', personId)
    .contains('metadata', { client_visible: true })
    .order('activity_date', { ascending: false })
    .order('activity_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Unable to load case activity right now.');
  }

  return (data ?? []).map((row: ActivityRow & { organizations?: { name?: string | null } }) => toActivity(row, true));
}

export async function fetchPersonConsents(
  supabase: SupabaseAnyServerClient,
  {
    userId,
    iharcOrgId,
  }: { userId: string; iharcOrgId: number | null },
): Promise<{ personId: number; snapshot: ConsentSnapshot } | null> {
  const person = await findPersonForUser(supabase, userId);
  if (!person) return null;

  const effective = await getEffectiveConsent(supabase, person.id);
  const participatingOrgs = await listParticipatingOrganizations(supabase, {
    excludeOrgId: iharcOrgId,
  });
  const consentOrgs = effective.consent ? await listConsentOrgs(supabase, effective.consent.id) : [];
  const scopeForSelection = effective.consent?.scope ?? 'all_orgs';
  const orgResolution = resolveConsentOrgSelections(scopeForSelection, participatingOrgs, consentOrgs);

  return {
    personId: person.id,
    snapshot: {
      consentId: effective.consent?.id ?? null,
      scope: effective.consent?.scope ?? null,
      status: effective.consent?.status ?? null,
      effectiveStatus: effective.effectiveStatus ?? null,
      expiresAt: effective.expiresAt ?? null,
      updatedAt: effective.consent?.updatedAt ?? null,
      orgSelections: orgResolution.selections,
      allowedOrgIds: orgResolution.allowedOrgIds,
      blockedOrgIds: orgResolution.blockedOrgIds,
      preferredContactMethod: person.preferred_contact_method,
      privacyRestrictions: person.privacy_restrictions,
    },
  };
}

export async function fetchStaffCases(
  supabase: SupabaseAnyServerClient,
  limit = 50,
): Promise<ClientCaseDetail[]> {
  const caseMgmt = supabase.schema(CASE_SCHEMA);
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select(CASE_SELECT)
    .order('start_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load staff cases', { error });
    throw new Error('Unable to load cases.');
  }

  return (data ?? []).map((row: CaseRecord) => ({ ...toCaseSummary(row), personId: row.person_id }));
}

export async function fetchStaffCaseDetail(
  supabase: SupabaseAnyServerClient,
  caseId: number,
): Promise<ClientCaseDetail | null> {
  const caseMgmt = supabase.schema(CASE_SCHEMA);
  const { data, error } = await caseMgmt
    .from(CASE_TABLE)
    .select(CASE_SELECT)
    .eq('id', caseId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load staff case detail', { caseId, error });
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
    .select('id, title, description, activity_date, activity_time, activity_type, metadata, provider_org_id, organizations(name)')
    .eq('person_id', personId)
    .order('activity_date', { ascending: false })
    .order('activity_time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load staff case activities', { personId, error });
    throw new Error('Unable to load activity.');
  }

  return (data ?? []).map((row: ActivityRow & { organizations?: { name?: string | null } }) => toActivity(row));
}

export async function fetchPendingIntakes(
  supabase: SupabaseAnyServerClient,
): Promise<IntakeSubmission[]> {
  const portal = supabase.schema('portal');
  const { data, error } = await portal
    .from(REGISTRATION_TABLE)
    .select(INTAKE_SELECT)
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

function toActivity(row: ActivityRow & { organizations?: { name?: string | null } }, clientVisibleFilter = false): CaseActivity {
  const { sharedWithClient, visibility } = resolveActivityVisibility(row.metadata, clientVisibleFilter);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    activityDate: row.activity_date,
    activityTime: row.activity_time,
    activityType: row.activity_type,
    createdByOrg: row.organizations?.name ?? 'Not recorded',
    sharedWithClient,
    visibility,
  };
}

function resolveActivityVisibility(
  metadata: ActivityRow['metadata'],
  forceClientVisible: boolean,
): { sharedWithClient: boolean; visibility: 'client' | 'internal' } {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const sharedWithClient = forceClientVisible || Boolean(meta.client_visible);

  return {
    sharedWithClient,
    visibility: sharedWithClient ? 'client' : 'internal',
  };
}
