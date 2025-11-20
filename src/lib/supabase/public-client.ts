import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { SupabaseBrowserClient } from '@/lib/supabase/types';
import { getSupabaseEnv } from '@/lib/supabase/config';

let cachedClient: SupabaseBrowserClient | null = null;

export function getSupabasePublicClient(): SupabaseBrowserClient {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, anonKey } = getSupabaseEnv();

  cachedClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
}
