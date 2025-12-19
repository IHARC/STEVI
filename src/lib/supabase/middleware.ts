import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { CookieMethodsServer } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { getSupabaseEnvOrNull } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

export type SessionUpdateResult = {
  response: NextResponse;
  user: User | null;
};

/**
 * Refresh the Supabase session inside middleware.
 *
 * Mirrors the canonical pattern from Supabase SSR docs:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  const env = getSupabaseEnvOrNull();
  const requestHeaders = new Headers(request.headers);
  const requestPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  requestHeaders.set('x-stevi-path', requestPath);
  requestHeaders.set('x-forwarded-uri', requestPath);
  requestHeaders.set('x-forwarded-path', request.nextUrl.pathname);
  requestHeaders.set('x-next-url', requestPath);
  requestHeaders.set('x-url', request.url);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!env) {
    return { response, user: null };
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set({
            name,
            value,
            path: '/',
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            ...options,
          }),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
