import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { getSupabaseEnv } from '@/lib/supabase/config';
import { readOAuthSessionCookies } from '@/lib/supabase/oauth';

export async function createSupabaseRSCClient(accessTokenOverride?: string | null) {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  const { accessToken } = readOAuthSessionCookies(cookieStore);
  const token = accessTokenOverride ?? accessToken ?? undefined;

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
