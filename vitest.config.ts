import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'apps/web/src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/**/__test__/**/*.test.ts',
      'apps/**/__test__/**/*.test.ts',
    ],
    passWithNoTests: false,
  },
});
