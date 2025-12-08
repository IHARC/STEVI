import type { NextConfig } from "next";
import path from "path";

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
