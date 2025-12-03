import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const GA_HOSTS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
];

const SUPABASE_HOST = "https://*.supabase.co";

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Inline scripts avoided; allow GA + Supabase + nonce'd inlined snippets if present
    `script-src 'self' ${GA_HOSTS.join(' ')} ${SUPABASE_HOST}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: ${SUPABASE_HOST} ${GA_HOSTS.join(' ')}`,
    "font-src 'self' data:",
    `connect-src 'self' ${SUPABASE_HOST} wss://*.supabase.co ${GA_HOSTS.join(' ')}`,
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

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
