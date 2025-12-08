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
// Force webpack so the build matches our CI expectations.
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

const staticSource = path.join(outDir, 'static');
if (!fs.existsSync(staticSource)) {
  console.error('❌ Build verification failed: .next/static missing');
  process.exit(1);
}

const standaloneDir = path.join(outDir, 'standalone');
const standaloneServer = path.join(standaloneDir, 'server.js');

if (!fs.existsSync(standaloneServer)) {
  console.error('❌ Build verification failed: .next/standalone/server.js missing');
  process.exit(1);
}

const staticDest = path.join(standaloneDir, '.next', 'static');

fs.mkdirSync(path.join(standaloneDir, '.next'), { recursive: true });
fs.cpSync(staticSource, staticDest, { recursive: true, force: true });

console.log('📦 Synced static assets into .next/standalone/.next/static');

console.log('🎉 IHARC portal build completed successfully!');
