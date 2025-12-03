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

const steps = [
  { cmd: 'npx eslint .', label: 'Linting' },
  // Default Next.js 16 build (Turbopack)
  { cmd: 'npx next build', label: 'Building application' },
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

console.log('🎉 IHARC portal build completed successfully!');
