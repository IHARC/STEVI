import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { CSRF_COOKIE_PRIMARY, CSRF_COOKIE_FALLBACK, TOKEN_LENGTH_BYTES, buildCsrfCookieOptions } from '@/lib/csrf/constants';

export async function middleware(request: NextRequest) {
  // Ensure the CSRF token is present on the incoming request so the page render
  // sees the same value the browser will store. Without this, first-page loads
  // would render a mismatched token and trigger a CSRF validation failure on
  // the first sign-in attempt.
  const { csrfToken, isSecure } = ensureCsrfOnRequest(request);

  let response = NextResponse.next();
  response = await updateSession(request, response);
  // Mirror the request token onto the response so the browser persists it.
  const fallbackOptions = buildCsrfCookieOptions(isSecure);
  response.cookies.set(CSRF_COOKIE_FALLBACK, csrfToken, fallbackOptions);
  // Add a __Host- cookie when the request is secure to harden production.
  if (isSecure) {
    response.cookies.set(CSRF_COOKIE_PRIMARY, csrfToken, buildCsrfCookieOptions(true));
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};

function ensureCsrfOnRequest(request: NextRequest): {
  csrfToken: string;
  isSecure: boolean;
} {
  const isSecure = isSecureRequest(request);
  const existing =
    request.cookies.get(CSRF_COOKIE_PRIMARY)?.value || request.cookies.get(CSRF_COOKIE_FALLBACK)?.value;

  if (existing) {
    return { csrfToken: existing, isSecure };
  }

  const token = createCsrfToken();
  const cookieName = isSecure ? CSRF_COOKIE_PRIMARY : CSRF_COOKIE_FALLBACK;

  // Mutate the incoming request's cookies so downstream server components read the same token.
  request.cookies.set(cookieName, token);

  return { csrfToken: token, isSecure };
}

function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === 'https:') return true;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  return forwardedProto === 'https';
}

function createCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
