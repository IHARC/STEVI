import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

const ENV_FILES = ['.env', '.env.local', '.env.e2e.local'];
const lockedKeys = new Set(Object.keys(process.env));

function loadEnvFile(fileName: string) {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    if (lockedKeys.has(key)) continue;
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

ENV_FILES.forEach(loadEnvFile);

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const webServer: PlaywrightTestConfig['webServer'] = process.env.E2E_BASE_URL
  ? undefined
  : {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    };

export default defineConfig({
  testDir: './playwright/tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  snapshotDir: './playwright/snapshots',
  globalTeardown: './playwright/global-teardown.ts',
  webServer,
});
