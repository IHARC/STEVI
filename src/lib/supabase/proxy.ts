import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnvOrNull } from '@/lib/supabase/config';
import {
  clearOAuthSessionCookies,
  readOAuthSessionCookies,
  refreshAccessToken,
  setOAuthSessionCookies,
  shouldRefreshToken,
} from '@/lib/supabase/oauth';

/**
 * Refresh the OAuth session inside the Next.js Proxy (formerly Middleware).
 *
 * OAuth access tokens are refreshed here because Server Components cannot set
 * cookies. Keep this focused on token refresh and request headers; authorization
 * decisions must happen in server actions/route handlers.
 */
type ProxyHeaderOptions = {
  requestHeaders?: Headers;
  responseHeaders?: Headers;
};

export async function refreshOAuthSession(
  request: NextRequest,
  options: ProxyHeaderOptions = {},
): Promise<NextResponse> {
  const env = getSupabaseEnvOrNull();
  const requestHeaders = options.requestHeaders ? new Headers(options.requestHeaders) : new Headers(request.headers);
  const requestPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  requestHeaders.set('x-stevi-path', requestPath);
  requestHeaders.set('x-forwarded-uri', requestPath);
  requestHeaders.set('x-forwarded-path', request.nextUrl.pathname);
  requestHeaders.set('x-next-url', requestPath);
  requestHeaders.set('x-url', request.url);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const applyResponseHeaders = (target: NextResponse) => {
    if (!options.responseHeaders) return;
    for (const [key, value] of options.responseHeaders.entries()) {
      target.headers.set(key, value);
    }
  };

  applyResponseHeaders(response);

  if (!env) {
    return response;
  }

  const { refreshToken, expiresAt } = readOAuthSessionCookies(request.cookies);
  if (!refreshToken || !shouldRefreshToken(expiresAt)) {
    return response;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    setOAuthSessionCookies(request.cookies, tokens, refreshToken);
    response = NextResponse.next({ request: { headers: requestHeaders } });
    applyResponseHeaders(response);
    setOAuthSessionCookies(response.cookies, tokens, refreshToken);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('OAuth session refresh failed', error);
    }
    clearOAuthSessionCookies(request.cookies);
    response = NextResponse.next({ request: { headers: requestHeaders } });
    applyResponseHeaders(response);
    clearOAuthSessionCookies(response.cookies);
  }

  return response;
}
