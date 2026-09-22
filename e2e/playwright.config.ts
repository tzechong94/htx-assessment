import { defineConfig, devices } from '@playwright/test';

// Runs against an already running stack: `docker compose up` (default) or `pnpm dev` with
// BASE_URL=http://localhost:5173.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
