import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS, TOKEN_LENGTH_BYTES } from '@/lib/csrf/constants';

export async function middleware(request: NextRequest) {
  // Ensure the CSRF token is present on the incoming request so the page render
  // sees the same value the browser will store. Without this, first-page loads
  // would render a mismatched token and trigger a CSRF validation failure on
  // the first sign-in attempt.
  const { csrfToken, requestHeaders } = ensureCsrfOnRequest(request);

  const response = await updateSession(request, requestHeaders);
  // Mirror the request token onto the response so the browser persists it.
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, CSRF_COOKIE_OPTIONS);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

function ensureCsrfOnRequest(request: NextRequest): { csrfToken: string; requestHeaders?: Headers } {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing) {
    return { csrfToken: existing };
  }

  const token = createCsrfToken();
  const requestHeaders = new Headers(request.headers);
  const existingCookieHeader = requestHeaders.get('cookie');
  const serialized = `${CSRF_COOKIE_NAME}=${token}`;
  requestHeaders.set('cookie', existingCookieHeader ? `${existingCookieHeader}; ${serialized}` : serialized);

  return { csrfToken: token, requestHeaders };
}

function createCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
