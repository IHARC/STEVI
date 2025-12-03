#!/usr/bin/env node

/**
 * STEVI build entry for CI and local reproducibility.
 * Runs lint + Next.js build using the default SWC pipeline on Node 24.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting IHARC portal build...');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
// Turbopack currently skips generating the standalone entry Azure App Service expects.
// Force webpack so `.next/standalone/server.js` is produced for `node .next/standalone/server.js` start commands.
process.env.NEXT_FORCE_WEBPACK = '1';

const steps = [
  { cmd: 'npx eslint .', label: 'Linting' },
  // Force webpack so we emit .next/standalone for Azure App Service
  { cmd: 'npx next build --webpack', label: 'Building application' },
];

for (const step of steps) {
  console.log(`⚡ ${step.label}...`);
  execSync(step.cmd, { stdio: 'inherit', env: process.env });
  console.log(`✅ ${step.label}`);
}

const outDir = path.join(__dirname, '.next');
if (!fs.existsSync(outDir)) {
  console.error('❌ Build verification failed: .next directory missing');
  process.exit(1);
}

const standaloneEntrypoint = path.join(outDir, 'standalone', 'server.js');
if (!fs.existsSync(standaloneEntrypoint)) {
  console.error('❌ Build verification failed: .next/standalone/server.js missing');
  process.exit(1);
}

// Ensure static assets are packaged alongside the standalone server. Next.js expects
// distDir to resolve relative to .next/standalone, so .next/standalone/.next/static
// must exist in the deployment bundle.
const staticSrc = path.join(outDir, 'static');
const staticDest = path.join(outDir, 'standalone', '.next', 'static');

if (!fs.existsSync(staticSrc)) {
  console.error('❌ Build verification failed: .next/static directory missing');
  process.exit(1);
}

// Replace any stale contents to avoid nested copies on rebuilds.
fs.rmSync(staticDest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true });

if (!fs.existsSync(path.join(staticDest, 'css'))) {
  console.error('❌ Build verification failed: static assets not synced into .next/standalone/.next');
  process.exit(1);
}

console.log('📦 Synced static assets into .next/standalone/.next/static');

console.log('🎉 IHARC portal build completed successfully!');
