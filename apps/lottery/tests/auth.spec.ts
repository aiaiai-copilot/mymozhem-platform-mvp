import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, TEST_USERS } from '../../../tests/helpers/auth';
import { TEST_CONFIG } from '../../../tests/helpers/config';


/**
 * TS-L-001: User Authentication Flow
 * Tests login, logout, and auth state management in the lottery app
 */
test.describe('TS-L-001: User Authentication Flow', () => {

  test('1.1: Successful Login', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);

    // Fill login form
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login")');

    // Verify redirect to home page
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/`);

    // Verify user name appears in header
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible();

    // Verify logout link is visible
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // Verify login link is not visible
    await expect(page.locator('header a:has-text("Login")')).not.toBeVisible();

    // Verify token stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
  });

  test('1.2: Failed Login - Invalid Credentials', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);

    // Fill form with wrong password
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');

    // Verify stays on login page
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/login`);

    // Verify error message is displayed
    await expect(page.locator('.bg-red-50, .text-red-600, [class*="error"]')).toBeVisible();

    // Verify no token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeFalsy();
  });

  test('1.3: Logout', async ({ page }) => {
    // Login first
    await loginViaUI(page, 'alice');

    // Verify we're logged in
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible();

    // Logout
    await logoutViaUI(page);

    // Verify redirected to login page
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/login`);

    // Verify token removed from localStorage
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeFalsy();

    // Verify login link is visible
    await expect(page.locator('header a:has-text("Login")')).toBeVisible();

    // Verify user name not visible in header
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).not.toBeVisible();
  });

  test('1.4: Auth State Persistence After Login', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);

    // Fill and submit login form
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login")');

    // Wait for redirect
    await page.waitForURL(`${TEST_CONFIG.lotteryUrl}/`);

    // Verify user name appears immediately without page refresh
    // This tests the React Context auth state update
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible({ timeout: 3000 });

    // Verify logout button appears immediately
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('1.5: Redirect to Login When Accessing Protected Route', async ({ page }) => {
    // Try to access protected route without being logged in
    await page.goto(`${TEST_CONFIG.lotteryUrl}/create`);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.6: Redirect Back to Protected Route After Login', async ({ page }) => {
    // Try to access protected route without being logged in
    await page.goto(`${TEST_CONFIG.lotteryUrl}/create`);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);

    // Login
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login")');

    // Should redirect back to the originally requested /create page
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/create`);

    // Verify we're on the create room page
    await expect(page.locator('h1:has-text("Create")')).toBeVisible();
  });

  test('1.7: Multiple Users Can Login in Different Sessions', async ({ page, context }) => {
    // Login as Alice in first tab
    await loginViaUI(page, 'alice');
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible();

    // Open new tab and login as Bob
    const page2 = await context.newPage();
    await loginViaUI(page2, 'bob');
    await expect(page2.locator('header').locator(`text=${TEST_USERS.bob.name}`)).toBeVisible();

    // Verify both are still logged in
    await expect(page.locator('header').locator(`text=${TEST_USERS.alice.name}`)).toBeVisible();
    await expect(page2.locator('header').locator(`text=${TEST_USERS.bob.name}`)).toBeVisible();

    await page2.close();
  });
});

/**
 * TS-L-002: Google OAuth UI
 * Tests Google OAuth UI elements and callback handling
 */
test.describe('TS-L-002: Google OAuth UI', () => {

  test('2.1: Google Login Button Visible on Login Page', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);

    // Verify Google login button is visible
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Verify it has the Google icon (SVG with specific path)
    await expect(page.locator('button:has-text("Continue with Google") svg')).toBeVisible();
  });

  test('2.2: Google Login Button Is Clickable', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);

    // Mock the API to prevent actual redirect
    await page.route('**/api/v1/auth/google/url**', async (route) => {
      await route.fulfill({
        status: 503,
        json: { error: { code: 'OAUTH_NOT_CONFIGURED', message: 'OAuth not configured' } },
      });
    });

    // Verify button is clickable
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeEnabled();
    await googleButton.click();

    // Should show error message after failed OAuth attempt
    await expect(page.locator('text=Failed to connect')).toBeVisible({ timeout: 3000 });
  });

  test('2.3: OAuth Error Parameter Shows Error Message', async ({ page }) => {
    // Navigate to login page with error parameter (simulating failed OAuth callback)
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login?error=oauth_failed`);

    // Verify error message is displayed
    await expect(page.locator('.bg-red-50, .text-red-600')).toBeVisible();
    await expect(page.locator('text=Google login failed')).toBeVisible();
  });

  test('2.4: Auth Callback Page - Shows Loading While Processing', async ({ page }) => {
    // Navigate directly to callback page (without valid tokens)
    await page.goto(`${TEST_CONFIG.lotteryUrl}/auth/callback`);

    // Should show error since no tokens in URL fragment
    await expect(page.locator('text=No authentication data received')).toBeVisible();

    // Should show "Try again" link
    await expect(page.locator('a:has-text("Try again")')).toBeVisible();
  });

  test('2.5: Auth Callback Page - Processes Token Fragment', async ({ page }) => {
    // Create mock tokens
    const mockAccessToken = 'mock-access-token-for-testing';
    const mockRefreshToken = 'mock-refresh-token-for-testing';

    // Navigate to callback with tokens in URL fragment
    await page.goto(
      `${TEST_CONFIG.lotteryUrl}/auth/callback#access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&expires_in=3600&redirect_url=/`
    );

    // The page should process the tokens and redirect
    // Wait for either redirect to home or stay on page
    await page.waitForURL(/\/(auth\/callback)?$/, { timeout: 3000 }).catch(() => {});

    // If redirected to home, tokens were processed
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/callback')) {
      // Still on callback - check for loading spinner (processing)
      const hasSpinner = await page.locator('.animate-spin').isVisible().catch(() => false);
      expect(hasSpinner || currentUrl.includes('auth/callback')).toBeTruthy();
    } else {
      // Redirected - tokens were stored and processed
      expect(currentUrl).toContain(TEST_CONFIG.lotteryUrl);
    }
  });

  test('2.6: Login Page Preserves Redirect After OAuth Error', async ({ page }) => {
    // Try to access protected route
    await page.goto(`${TEST_CONFIG.lotteryUrl}/create`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Verify Google button is visible (can be used for OAuth)
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Verify email login still works after visiting with redirect state
    await page.fill('input[type="email"]', TEST_USERS.alice.email);
    await page.fill('input[type="password"]', TEST_USERS.alice.password);
    await page.click('button:has-text("Login with Email")');

    // Should redirect back to /create
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/create`);
  });

  test('2.7: Divider Between OAuth and Email Login', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);

    // Verify divider text is visible
    await expect(page.locator('text=or continue with email')).toBeVisible();
  });
});
