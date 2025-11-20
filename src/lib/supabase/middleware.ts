import { createServerClient } from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { getSupabaseEnvOrNull } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

/**
 * Refresh the Supabase session inside middleware.
 *
 * Returns the cookies Supabase asked us to set so the caller can attach them
 * to the outbound response. The request headers are mutated in-place to
 * include any refreshed cookies so downstream server components see the
 * up-to-date session during this same request.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<CookieBatch> {
  const env = getSupabaseEnvOrNull();
  const responseCookies: CookieBatch = [];

  if (!env) {
    return responseCookies;
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value, options);
          responseCookies.push({ name, value, options });
        });
        requestHeaders.set('cookie', request.cookies.toString());
      },
    },
  });

  await supabase.auth.getUser();

  return responseCookies;
}
