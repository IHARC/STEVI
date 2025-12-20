import { createServerClient } from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { getSupabaseEnvOrNull } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

/**
 * Refresh the Supabase session inside the Next.js Proxy (formerly Middleware).
 *
 * Supabase SSR requires the Proxy to refresh auth tokens because Server Components
 * cannot set cookies. Keep this focused on token refresh and request headers;
 * authorization decisions must happen in server actions/route handlers.
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
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
    return response;
  }

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
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

  const { error } = await supabase.auth.getClaims();
  if (error && process.env.NODE_ENV !== 'production') {
    console.warn('Supabase Proxy session refresh failed', error);
  }

  return response;
}
