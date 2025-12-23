import { NextResponse, type NextRequest } from 'next/server';
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

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!hostHeader) {
    return NextResponse.next();
  }

  const host = hostHeader.split(',')[0]?.trim().toLowerCase() ?? '';
  const hostname = host.split(':')[0] ?? host;
  const pathname = request.nextUrl.pathname;

  if (hostname === getLoginHost()) {
    if (LOGIN_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, getAppUrl()));
  }

  if (hostname === getAppHost()) {
    if (pathname === '/oauth/consent' || pathname.startsWith('/oauth/consent/')) {
      return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, getLoginUrl()));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
