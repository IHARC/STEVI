import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { getSupabaseEnv } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

export async function createSupabaseRSCClient() {
  const { url, publishableKey } = getSupabaseEnv();

  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        if (cookiesToSet.length === 0) {
          return;
        }

        if (process.env.NODE_ENV !== 'production') {
          console.warn('Skipped setting Supabase cookies in an RSC render (only allowed in server actions/route handlers).');
        }
      },
    },
  });
}
