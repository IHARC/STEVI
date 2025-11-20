import { createServerClient } from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { getSupabaseEnvOrNull } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

/**
 * Refresh the Supabase session inside middleware.
 *
 * Mirrors the canonical pattern from Supabase SSR docs:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getSupabaseEnvOrNull();
  let response = NextResponse.next({ request });

  if (!env) {
    return response;
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
