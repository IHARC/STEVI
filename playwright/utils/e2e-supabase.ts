import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEYS = ['E2E_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'] as const;
const SUPABASE_ANON_KEYS = ['E2E_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'] as const;

export const CRUD_SLUG_PREFIX = 'e2e-crud-resource-';

export type CrudEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  adminEmail: string;
  adminPassword: string;
};

type CrudEnvResolution =
  | { ready: true; env: CrudEnv }
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
  const supabaseAnonKey = firstEnv(SUPABASE_ANON_KEYS);
  const adminEmail = process.env.E2E_TEST_EMAIL ?? '';
  const adminPassword = process.env.E2E_TEST_PASSWORD ?? '';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL (or E2E_SUPABASE_URL)');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or E2E_SUPABASE_ANON_KEY)');
  if (!adminEmail) missing.push('E2E_TEST_EMAIL');
  if (!adminPassword) missing.push('E2E_TEST_PASSWORD');

  if (missing.length > 0) {
    return { ready: false, reason: `Missing required env vars: ${missing.join(', ')}` };
  }

  return {
    ready: true,
    env: {
      supabaseUrl,
      supabaseAnonKey,
      adminEmail,
      adminPassword,
    },
  };
}

export function buildCrudSlug() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(16).slice(2, 8);
  return `${CRUD_SLUG_PREFIX}${stamp}-${random}`;
}

export async function createAuthedSupabase(env: CrudEnv): Promise<SupabaseClient> {
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
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
