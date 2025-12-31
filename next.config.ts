import type { NextConfig } from "next";
import path from "path";

const SECURITY_HEADERS = [
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
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
