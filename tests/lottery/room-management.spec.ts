import { test, expect } from '@playwright/test';
import { loginViaUI, TEST_USERS } from '../helpers/auth';
import { TEST_CONFIG } from '../helpers/config';


/**
 * TS-L-002: Room List Display
 * TS-L-003: Create New Room
 */
test.describe('TS-L-002 & TS-L-003: Room Management', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginViaUI(page, 'alice');
  });

  test('2.1: View Public Rooms', async ({ page }) => {
    // Navigate to home page
    await page.goto(`${TEST_CONFIG.lotteryUrl}/`);

    // Verify room list is displayed
    await expect(page.locator('text=New Year Lottery 2025')).toBeVisible();

    // Verify status badge is visible
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")').first()).toBeVisible();

    // Verify "Create Room" link is visible
    await expect(page.locator('a:has-text("Create Room")')).toBeVisible();
  });

  test('2.2: Click on Room Card', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/`);

    // Click on a room card
    const roomCard = page.locator('text=New Year Lottery 2025').first();
    await roomCard.click();

    // Verify navigated to room detail page
    await expect(page).toHaveURL(/\/room\/[a-z0-9-]+/);

    // Verify room details are displayed
    await expect(page.locator('text=New Year Lottery 2025')).toBeVisible();
  });

  test('3.1: Create Room with Valid Data', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/`);

    // Click "Create Room" link
    await page.click('a:has-text("Create Room")');

    // Verify navigated to create room page
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/create`);

    // Fill form
    const timestamp = Date.now();
    await page.fill('#name', `Test Lottery ${timestamp}`);
    await page.fill('#description', 'Testing lottery creation');
    await page.fill('#ticketCount', '50');
    await page.fill('#drawDate', '2026-06-01T18:00');

    // Submit form
    await page.click('button:has-text("Create Lottery")');

    // Verify redirected to new room page
    await expect(page).toHaveURL(/\/room\//);

    // Verify room status is DRAFT
    await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();

    // Verify room name is displayed
    await expect(page.locator(`text=Test Lottery ${timestamp}`)).toBeVisible();
  });

  test('3.2: Create Room - Validation Error (Missing Required Field)', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/create`);

    // Fill only name field
    await page.fill('#name', 'Test Lottery');
    await page.fill('#ticketCount', '100');
    // Intentionally skip drawDate

    // Try to submit
    await page.click('button:has-text("Create Lottery")');

    // Verify stays on create page (form validation prevents submission)
    await expect(page).toHaveURL(`${TEST_CONFIG.lotteryUrl}/create`);
  });

  test('3.3: Create Room Form Fields Are Pre-filled with Defaults', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.lotteryUrl}/create`);

    // Verify ticketCount has default value
    const ticketCount = await page.locator('#ticketCount').inputValue();
    expect(parseInt(ticketCount)).toBeGreaterThan(0);
  });
});
