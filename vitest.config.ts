import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const resolveFromRoot = (...segments: string[]) => path.resolve(dirname, ...segments);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Vitest 4 defaults to the new "forks" pool, which crashes our Next/Supabase
    // tests inside worker processes. Using the legacy threads pool restores
    // prior behavior and keeps the suite stable.
    pool: 'threads',
    exclude: ['playwright/**/*', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': resolveFromRoot('src'),
      '~': resolveFromRoot('src'),
    },
  },
});
