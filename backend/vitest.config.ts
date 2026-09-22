import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each test file spins up its own in-memory Postgres (PGlite) and runs migrations.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
