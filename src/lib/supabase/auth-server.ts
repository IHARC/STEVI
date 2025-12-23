import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { getSupabaseEnv } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

export async function createSupabaseAuthServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, {
              path: '/',
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              ...options,
            });
          } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Failed to set Supabase auth cookie', error);
            }
          }
        });
      },
    },
  });
}
