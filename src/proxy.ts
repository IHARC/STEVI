import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { refreshOAuthSession } from '@/lib/supabase/proxy';
import { getAppHost, getAppUrl, getLoginHost, getLoginUrl } from '@/lib/host';

const GA_HOSTS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
];

const SUPABASE_HOST = 'https://*.supabase.co';

const DEV_CONNECT = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'ws://localhost:3000',
  'ws://127.0.0.1:3000',
];

const LOGIN_ALLOWED_PREFIXES = [
  '/oauth/consent',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/assets',
  '/static',
];

function resolveOrigin(value: string): string {
  return new URL(value).origin;
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const loginUrl = getLoginUrl();
  const loginOrigin = resolveOrigin(loginUrl);
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...GA_HOSTS,
    SUPABASE_HOST,
    isDev ? "'unsafe-eval'" : null,
    isDev ? "'unsafe-inline'" : null,
  ]
    .filter(Boolean)
    .join(' ');
  const styleSrc = isDev ? "'self' 'unsafe-inline'" : `'self' 'nonce-${nonce}'`;
  const connectSrc = isDev
    ? `connect-src 'self' ${SUPABASE_HOST} wss://*.supabase.co ${GA_HOSTS.join(' ')} ${DEV_CONNECT.join(' ')}`
    : `connect-src 'self' ${SUPABASE_HOST} wss://*.supabase.co ${GA_HOSTS.join(' ')}`;

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    `form-action 'self' ${loginOrigin}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: ${SUPABASE_HOST} ${GA_HOSTS.join(' ')}`,
    "font-src 'self' data:",
    connectSrc,
    "media-src 'self'",
    "frame-src 'none'",
    "worker-src 'self'",
    isDev ? null : 'upgrade-insecure-requests',
  ];

  return directives
    .filter(Boolean)
    .join('; ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = buildCspHeader(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Security-Policy', cspHeader);

  const appHost = getAppHost();
  const loginHost = getLoginHost();
  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (hostHeader && appHost !== loginHost) {
    const host = hostHeader.split(',')[0]?.trim().toLowerCase() ?? '';
    const hostname = host.split(':')[0] ?? host;
    const pathname = request.nextUrl.pathname;

    if (hostname === loginHost) {
      if (!LOGIN_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
        return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, getAppUrl()));
      }
    }

    if (hostname === appHost) {
      if (pathname === '/oauth/consent' || pathname.startsWith('/oauth/consent/')) {
        return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, getLoginUrl()));
      }
    }
  }

  return refreshOAuthSession(request, { requestHeaders, responseHeaders });
}

export default proxy;

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|static).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
