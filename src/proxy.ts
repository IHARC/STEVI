import type { NextRequest } from 'next/server';
import { refreshSupabaseSession } from '@/lib/supabase/proxy';

const GA_HOSTS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
];

const SUPABASE_HOST = 'https://*.supabase.co';
const IS_PROD = process.env.NODE_ENV === 'production';

const DEV_CONNECT = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'ws://localhost:3000',
  'ws://127.0.0.1:3000',
];

const SCRIPT_SRC = IS_PROD
  ? `script-src 'self' ${GA_HOSTS.join(' ')} ${SUPABASE_HOST}`
  : `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GA_HOSTS.join(' ')} ${SUPABASE_HOST}`;

const CONNECT_SRC = IS_PROD
  ? `connect-src 'self' ${SUPABASE_HOST} wss://*.supabase.co ${GA_HOSTS.join(' ')}`
  : `connect-src 'self' ${SUPABASE_HOST} wss://*.supabase.co ${GA_HOSTS.join(' ')} ${DEV_CONNECT.join(' ')}`;

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    SCRIPT_SRC,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: ${SUPABASE_HOST} ${GA_HOSTS.join(' ')}`,
    "font-src 'self' data:",
    CONNECT_SRC,
    "media-src 'self'",
    "frame-src 'none'",
    "worker-src 'self'",
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export async function proxy(request: NextRequest) {
  const response = await refreshSupabaseSession(request);

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|static).*)',
  ],
};
