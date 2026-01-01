import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Event Platform E2E tests
 *
 * Test structure:
 * - tests/platform/ - Platform API tests
 * - tests/lottery/ - Lottery app UI tests
 * - tests/helpers/ - Shared utilities
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'platform-api',
      testMatch: 'tests/platform/**/*.spec.ts',
      use: {
        baseURL: 'http://127.0.0.1:3000',
      },
    },
    {
      name: 'lottery-app',
      testMatch: 'tests/lottery/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
  ],

  globalSetup: './tests/global-setup.ts',
});
