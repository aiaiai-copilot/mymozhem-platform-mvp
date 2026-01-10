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
