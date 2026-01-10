import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Event Platform E2E tests
 *
 * Test structure (colocated with apps):
 * - platform/tests/ - Platform API tests
 * - apps/lottery/tests/ - Lottery app UI tests
 * - apps/quiz/tests/ - Quiz app UI tests
 * - tests/helpers/ - Shared utilities
 */
export default defineConfig({
  testDir: '.',
  testMatch: [
    'platform/tests/**/*.spec.ts',
    'apps/*/tests/**/*.spec.ts',
  ],
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,

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
      testMatch: 'platform/tests/**/*.spec.ts',
      use: {
        baseURL: 'http://127.0.0.1:3000',
      },
    },
    {
      name: 'lottery-app',
      testMatch: 'apps/lottery/tests/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
    {
      name: 'quiz-app',
      testMatch: 'apps/quiz/tests/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5174',
      },
    },
  ],

  globalSetup: './tests/global-setup.ts',
});
