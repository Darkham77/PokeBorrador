import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/e2e',
  testMatch: '**/*.simulation.ts',
  outputDir: './scratch/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Math.max(1, Math.floor(os.cpus().length / 4)),
  maxFailures: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5174',
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
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
