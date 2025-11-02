#!/usr/bin/env node

/**
 * Robust build script for Next.js Azure Static Web Apps deployment
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting IHARC portal build...');

function run(command, description) {
  try {
    console.log(`⚡ ${description}...`);
    execSync(command, { stdio: 'inherit', env: process.env });
    console.log(`✅ ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed`);
    console.error(error?.message || error);
    return false;
  }
}

const strategies = [
  {
    description: 'Next build via npx',
    run: () => run('npx next lint', 'Linting') && run('npx next build', 'Building application')
  },
  {
    description: 'Next build via local binary',
    run: () => {
      const nextCli = path.join(__dirname, 'node_modules', '.bin', 'next');
      if (!fs.existsSync(nextCli)) return false;
      return run(`"${nextCli}" lint`, 'Linting via local binary') && run(`"${nextCli}" build`, 'Building via local binary');
    }
  }
];

let success = false;
for (const strategy of strategies) {
  console.log(`\n📦 Strategy: ${strategy.description}`);
  if (strategy.run()) {
    success = true;
    break;
  }
}

if (!success) {
  console.error('💥 All build strategies failed.');
  process.exit(1);
}

const outDir = path.join(__dirname, '.next');
if (!fs.existsSync(outDir)) {
  console.error('❌ Build verification failed: .next directory missing');
  process.exit(1);
}

console.log('🎉 IHARC portal build completed successfully!');
