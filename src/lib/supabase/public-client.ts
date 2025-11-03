import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { SupabaseBrowserClient } from '@/lib/supabase/types';

let cachedClient: SupabaseBrowserClient | null = null;

export function getSupabasePublicClient(): SupabaseBrowserClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
}
