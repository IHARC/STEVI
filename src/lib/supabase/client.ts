'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { getSupabaseEnv } from '@/lib/supabase/config';

export function createSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
