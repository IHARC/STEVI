import type { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS, TOKEN_LENGTH_BYTES } from '@/lib/csrf/constants';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return ensureCsrfCookie(request, response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    return response;
  }

  const token = createCsrfToken();
  request.cookies.set(CSRF_COOKIE_NAME, token);
  response.cookies.set(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return response;
}

function createCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
