import { NextResponse, type NextRequest } from 'next/server';
import { refreshOAuthSession } from '@/lib/supabase/proxy';
import { getAppHost, getAppUrl, getLoginHost, getLoginUrl } from '@/lib/host';

const LOGIN_ALLOWED_PREFIXES = [
  '/oauth/consent',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/assets',
  '/static',
];

export async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (hostHeader) {
    const host = hostHeader.split(',')[0]?.trim().toLowerCase() ?? '';
    const hostname = host.split(':')[0] ?? host;
    const pathname = request.nextUrl.pathname;

    if (hostname === getLoginHost()) {
      if (!LOGIN_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
        return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, getAppUrl()));
      }
    }

    if (hostname === getAppHost()) {
      if (pathname === '/oauth/consent' || pathname.startsWith('/oauth/consent/')) {
        return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, getLoginUrl()));
      }
    }
  }

  return refreshOAuthSession(request);
}

export default proxy;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|static).*)',
  ],
};
