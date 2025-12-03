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

const staticSource = path.join(outDir, 'static');
const staticDest = path.join(outDir, 'standalone', '.next', 'static');

if (!fs.existsSync(staticSource)) {
  console.error('❌ Build verification failed: .next/static missing');
  process.exit(1);
}

fs.cpSync(staticSource, staticDest, { recursive: true, force: true });

if (!fs.existsSync(staticDest)) {
  console.error('❌ Build verification failed: static assets not copied');
  process.exit(1);
}

if (!fs.existsSync(path.join(staticDest, 'chunks')) || !fs.existsSync(path.join(staticDest, 'css'))) {
  console.warn('⚠️ Static assets copied but expected chunk/css directories are missing. Build may be incomplete.');
}

console.log('📦 Synced static assets into .next/standalone/.next/static');

console.log('🎉 IHARC portal build completed successfully!');
