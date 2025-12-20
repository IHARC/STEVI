import type { NextConfig } from "next";
import path from "path";

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

const SECURITY_HEADERS = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      SCRIPT_SRC,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: ${SUPABASE_HOST} ${GA_HOSTS.join(' ')}`,
      "font-src 'self' data:",
      CONNECT_SRC,
      "media-src 'self'",
      "frame-src 'none'",
      "worker-src 'self'",
    ].join('; '),
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Build in the main process; the worker was short‑circuiting before the
    // webpack steps finished, leaving .next/standalone empty in CI.
    webpackBuildWorker: false,
  },
  // Keep tracing confined to this repo to avoid Next inferring parent roots.
  outputFileTracingRoot: path.join(__dirname),
  // Azure App Service expects the standalone output; keep it enabled.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
