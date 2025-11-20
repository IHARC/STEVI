import { createServerClient } from '@supabase/ssr';
import type { CookieMethodsServer } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { getSupabaseEnvOrNull } from '@/lib/supabase/config';

type CookieBatch = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0];

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const env = getSupabaseEnvOrNull();

  if (!env) {
    return NextResponse.next(requestHeaders ? { request: { headers: requestHeaders } } : undefined);
  }

  const nextInit = requestHeaders ? { request: { headers: requestHeaders } } : undefined;
  let supabaseResponse = NextResponse.next(nextInit);

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next(nextInit);
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
