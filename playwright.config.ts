import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/e2e',
  testMatch: '**/*.simulation.ts',
  outputDir: './scratch/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : Math.max(2, Math.floor(os.cpus().length / 4)),
  maxFailures: 1,
  reporter: [['./scripts/e2e/logging/playwright_fuzzer_reporter.ts']],
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
