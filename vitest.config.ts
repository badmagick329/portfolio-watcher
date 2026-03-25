import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/__test__/**/*.test.ts'],
    passWithNoTests: false,
  },
});
