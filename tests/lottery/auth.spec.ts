import { test, expect } from '@playwright/test';
import { loginViaUI, logoutViaUI, TEST_USERS } from '../helpers/auth';
import { TEST_CONFIG } from '../helpers/config';


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
