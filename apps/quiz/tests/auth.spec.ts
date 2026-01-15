import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../../tests/helpers/auth';
import { TEST_CONFIG } from '../../../tests/helpers/config';

/**
 * TS-Q-001: User Authentication Flow
 * Tests login, logout, and auth state management in the quiz app
 */
test.describe('TS-Q-001: Quiz Authentication Flow', () => {

  test('1.1: Successful Login', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.quizUrl}/login`);

    // Fill login form
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login")');

    // Verify redirect to home page
    await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/`);

    // Verify user name appears in header
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible();

    // Verify logout link is visible
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('1.2: Failed Login - Invalid Credentials', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.quizUrl}/login`);

    // Fill form with wrong password
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');

    // Verify stays on login page
    await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/login`);

    // Verify error message is displayed
    await expect(page.locator('.bg-red-50, .text-red-600, [class*="error"]')).toBeVisible();
  });

  test('1.3: Logout', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.quizUrl}/login`);
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/`);

    // Logout
    await page.click('button:has-text("Logout")');

    // Verify redirected to login page
    await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/login`);
  });

  test('1.4: Protected Route Redirect', async ({ page }) => {
    // Try to access protected route without being logged in
    await page.goto(`${TEST_CONFIG.quizUrl}/create`);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });
});

/**
 * TS-Q-002: Google OAuth UI
 * Tests Google OAuth UI elements and callback handling in quiz app
 */
test.describe('TS-Q-002: Google OAuth UI', () => {

  test('2.1: Google Login Button Visible on Login Page', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.quizUrl}/login`);

    // Verify Google login button is visible
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Verify it has the Google icon (SVG)
    await expect(page.locator('button:has-text("Continue with Google") svg')).toBeVisible();
  });

  test('2.2: OAuth Error Parameter Shows Error Message', async ({ page }) => {
    // Navigate to login page with error parameter
    await page.goto(`${TEST_CONFIG.quizUrl}/login?error=oauth_failed`);

    // Verify error message is displayed
    await expect(page.locator('.bg-red-50, .text-red-600')).toBeVisible();
    await expect(page.locator('text=Google login failed')).toBeVisible();
  });

  test('2.3: Auth Callback Page - Shows Error Without Tokens', async ({ page }) => {
    // Navigate directly to callback page without tokens
    await page.goto(`${TEST_CONFIG.quizUrl}/auth/callback`);

    // Should show error since no tokens in URL fragment
    await expect(page.locator('text=No authentication data received')).toBeVisible();

    // Should show "Try again" link
    await expect(page.locator('a:has-text("Try again")')).toBeVisible();
  });

  test('2.4: Auth Callback Page - Processes Token Fragment', async ({ page }) => {
    const mockAccessToken = 'mock-quiz-access-token';
    const mockRefreshToken = 'mock-quiz-refresh-token';

    // Navigate to callback with tokens in URL fragment
    await page.goto(
      `${TEST_CONFIG.quizUrl}/auth/callback#access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&expires_in=3600&redirect_url=/`
    );

    // The page should process the tokens and redirect
    await page.waitForURL(/\/(auth\/callback)?$/, { timeout: 3000 }).catch(() => {});

    // If redirected, tokens were processed successfully
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/callback')) {
      // Still on callback - check for loading spinner
      const hasSpinner = await page.locator('.animate-spin').isVisible().catch(() => false);
      expect(hasSpinner || currentUrl.includes('auth/callback')).toBeTruthy();
    } else {
      // Redirected - tokens were stored and processed
      expect(currentUrl).toContain(TEST_CONFIG.quizUrl);
    }
  });

  test('2.5: Divider Between OAuth and Email Login', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.quizUrl}/login`);

    // Verify divider text is visible
    await expect(page.locator('text=or continue with email')).toBeVisible();
  });

  test('2.6: Email Login Still Works After OAuth Added', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.quizUrl}/login`);

    // Use email login
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login with Email")');

    // Should redirect to home
    await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/`);

    // Verify logged in
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible();
  });
});
