import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEYS = ['E2E_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const;
const SUPABASE_PUBLISHABLE_KEYS = [
  'E2E_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
] as const;

export const CRUD_SLUG_PREFIX = 'e2e-crud-resource-';
export const POLICY_SLUG_PREFIX = 'e2e-policy-';
export const ORG_NAME_PREFIX = 'E2E Org ';

export type CrudEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  adminEmail: string;
  adminPassword: string;
};

export type OnboardingResetEnv = CrudEnv & {
  clientEmail: string;
  clientPassword: string;
};

type CrudEnvResolution =
  | { ready: true; env: CrudEnv }
  | { ready: false; reason: string };

type OnboardingResetEnvResolution =
  | { ready: true; env: OnboardingResetEnv }
  | { ready: false; reason: string };

function firstEnv(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

export function resolveCrudEnv(): CrudEnvResolution {
  const supabaseUrl = firstEnv(SUPABASE_URL_KEYS);
  const supabasePublishableKey = firstEnv(SUPABASE_PUBLISHABLE_KEYS);
  const adminEmail = process.env.E2E_TEST_EMAIL ?? '';
  const adminPassword = process.env.E2E_TEST_PASSWORD ?? '';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL (or E2E_SUPABASE_URL)');
  if (!supabasePublishableKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or E2E_SUPABASE_PUBLISHABLE_KEY)');
  if (!adminEmail) missing.push('E2E_TEST_EMAIL');
  if (!adminPassword) missing.push('E2E_TEST_PASSWORD');

  if (missing.length > 0) {
    return { ready: false, reason: `Missing required env vars: ${missing.join(', ')}` };
  }

  return {
    ready: true,
    env: {
      supabaseUrl,
      supabasePublishableKey,
      adminEmail,
      adminPassword,
    },
  };
}

export function resolveOnboardingResetEnv(): OnboardingResetEnvResolution {
  const supabaseUrl = firstEnv(SUPABASE_URL_KEYS);
  const supabasePublishableKey = firstEnv(SUPABASE_PUBLISHABLE_KEYS);
  const adminEmail = process.env.E2E_TEST_EMAIL ?? '';
  const adminPassword = process.env.E2E_TEST_PASSWORD ?? '';
  const clientEmail = process.env.E2E_CLIENT_EMAIL ?? '';
  const clientPassword = process.env.E2E_CLIENT_PASSWORD ?? '';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL (or E2E_SUPABASE_URL)');
  if (!supabasePublishableKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or E2E_SUPABASE_PUBLISHABLE_KEY)');
  if (!adminEmail) missing.push('E2E_TEST_EMAIL');
  if (!adminPassword) missing.push('E2E_TEST_PASSWORD');
  if (!clientEmail) missing.push('E2E_CLIENT_EMAIL');
  if (!clientPassword) missing.push('E2E_CLIENT_PASSWORD');

  if (missing.length > 0) {
    return { ready: false, reason: `Missing required env vars: ${missing.join(', ')}` };
  }

  return {
    ready: true,
    env: {
      supabaseUrl,
      supabasePublishableKey,
      adminEmail,
      adminPassword,
      clientEmail,
      clientPassword,
    },
  };
}

function buildStampedValue(prefix: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(16).slice(2, 8);
  return `${prefix}${stamp}-${random}`;
}

export function buildCrudSlug() {
  return buildStampedValue(CRUD_SLUG_PREFIX);
}

export function buildPolicySlug() {
  return buildStampedValue(POLICY_SLUG_PREFIX);
}

export function buildOrganizationName() {
  return buildStampedValue(ORG_NAME_PREFIX);
}

export async function createAuthedSupabase(env: CrudEnv): Promise<SupabaseClient> {
  const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: env.adminEmail,
    password: env.adminPassword,
  });

  if (error || !data.session) {
    throw new Error(`Unable to authenticate E2E admin user: ${error?.message ?? 'no session returned'}`);
  }

  return supabase;
}

export async function fetchAdminProfileId(supabase: SupabaseClient): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    throw new Error(`Unable to resolve admin user id: ${userError?.message ?? 'missing user'}`);
  }

  const { data: profile, error } = await supabase
    .schema('portal')
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error || !profile?.id) {
    throw new Error(`Unable to resolve admin profile id: ${error?.message ?? 'missing profile'}`);
  }

  return profile.id;
}

async function fetchUserIdForCredentials(env: OnboardingResetEnv): Promise<string> {
  const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: env.clientEmail,
    password: env.clientPassword,
  });

  if (error || !data.user?.id) {
    throw new Error(`Unable to authenticate E2E client user: ${error?.message ?? 'no user returned'}`);
  }

  return data.user.id;
}

export async function resetClientOnboarding(env: OnboardingResetEnv, supabase?: SupabaseClient) {
  const client = supabase ?? (await createAuthedSupabase(env));
  const clientUserId = await fetchUserIdForCredentials(env);

  const portal = client.schema('portal');
  const core = client.schema('core');
  const caseMgmt = client.schema('case_mgmt');

  const { data: profile, error: profileError } = await portal
    .from('profiles')
    .select('id')
    .eq('user_id', clientUserId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Unable to resolve client profile id: ${profileError.message}`);
  }

  const profileId = profile?.id ?? null;

  const { data: link, error: linkError } = await core
    .from('user_people')
    .select('person_id')
    .eq('user_id', clientUserId)
    .order('linked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkError) {
    throw new Error(`Unable to resolve client person link: ${linkError.message}`);
  }

  const personId = link?.person_id ?? null;

  if (clientUserId || profileId) {
    let registrationQuery = portal.from('registration_flows').delete().eq('flow_type', 'client_onboarding');
    if (clientUserId && profileId) {
      registrationQuery = registrationQuery.or(`supabase_user_id.eq.${clientUserId},profile_id.eq.${profileId}`);
    } else if (clientUserId) {
      registrationQuery = registrationQuery.eq('supabase_user_id', clientUserId);
    } else if (profileId) {
      registrationQuery = registrationQuery.eq('profile_id', profileId);
    }

    const { error: registrationError } = await registrationQuery;
    if (registrationError) {
      throw new Error(`Unable to remove client onboarding drafts: ${registrationError.message}`);
    }
  }

  if (personId) {
    let intakeQuery = caseMgmt.from('client_intakes').delete().eq('person_id', personId);
    if (profileId) {
      intakeQuery = intakeQuery.eq('intake_worker', profileId);
    }

    const { error: intakeError } = await intakeQuery;
    if (intakeError) {
      throw new Error(`Unable to remove client intake records: ${intakeError.message}`);
    }

    const now = new Date().toISOString();
    const { error: consentResetError } = await core
      .from('person_consents')
      .update({
        status: 'revoked',
        revoked_at: now,
        updated_at: now,
      })
      .eq('person_id', personId)
      .eq('status', 'active');

    if (consentResetError) {
      throw new Error(`Unable to reset client sharing consent: ${consentResetError.message}`);
    }
  }

  const { error: unlinkError } = await core.from('user_people').delete().eq('user_id', clientUserId);
  if (unlinkError) {
    throw new Error(`Unable to remove client account link: ${unlinkError.message}`);
  }
}

export async function cleanupResourcePages(env: CrudEnv, supabase?: SupabaseClient) {
  const client = supabase ?? (await createAuthedSupabase(env));
  const { error } = await client
    .schema('portal')
    .from('resource_pages')
    .delete()
    .like('slug', `${CRUD_SLUG_PREFIX}%`);

  if (error) {
    throw new Error(
      `E2E cleanup failed for portal.resource_pages. Manual cleanup: delete where slug like '${CRUD_SLUG_PREFIX}%'. ${error.message}`,
    );
  }
}

export async function cleanupPolicies(env: CrudEnv, supabase?: SupabaseClient) {
  const client = supabase ?? (await createAuthedSupabase(env));
  const { error } = await client
    .schema('portal')
    .from('policies')
    .delete()
    .like('slug', `${POLICY_SLUG_PREFIX}%`);

  if (error) {
    throw new Error(
      `E2E cleanup failed for portal.policies. Manual cleanup: delete where slug like '${POLICY_SLUG_PREFIX}%'. ${error.message}`,
    );
  }
}

export async function cleanupOrganizations(env: CrudEnv, supabase?: SupabaseClient) {
  const client = supabase ?? (await createAuthedSupabase(env));
  const { error } = await client
    .schema('core')
    .from('organizations')
    .delete()
    .like('name', `${ORG_NAME_PREFIX}%`);

  if (error) {
    throw new Error(
      `E2E cleanup failed for core.organizations. Manual cleanup: delete where name like '${ORG_NAME_PREFIX}%'. ${error.message}`,
    );
  }
}
