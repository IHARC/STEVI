import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const resolveFromRoot = (...segments: string[]) => path.resolve(dirname, ...segments);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolveFromRoot('src'),
      '~': resolveFromRoot('src'),
    },
  },
});
