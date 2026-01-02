import { test, expect } from '@playwright/test';
import { loginViaUI, TEST_USERS } from '../helpers/auth';

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
    await page.goto('http://localhost:5173/');

    // Verify room list is displayed
    await expect(page.locator('text=New Year Lottery 2025')).toBeVisible();

    // Verify status badge is visible
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")').first()).toBeVisible();

    // Verify "New Lottery" button is visible
    await expect(page.locator('button:has-text("New Lottery")')).toBeVisible();
  });

  test('2.2: Click on Room Card', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Click on a room card
    const roomCard = page.locator('text=New Year Lottery 2025').first();
    await roomCard.click();

    // Verify navigated to room detail page
    await expect(page).toHaveURL(/\/room\/[a-z0-9-]+/);

    // Verify room details are displayed
    await expect(page.locator('text=New Year Lottery 2025')).toBeVisible();
  });

  test('3.1: Create Room with Valid Data', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Click "New Lottery" button
    await page.click('button:has-text("New Lottery")');

    // Verify navigated to create room page
    await expect(page).toHaveURL('http://localhost:5173/create');

    // Fill form
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test Lottery ${timestamp}`);
    await page.fill('textarea[name="description"]', 'Testing lottery creation');
    await page.fill('input[name="ticketCount"]', '50');
    await page.fill('input[name="drawDate"]', '2026-06-01T18:00');

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
    await page.goto('http://localhost:5173/create');

    // Fill only name field
    await page.fill('input[name="name"]', 'Test Lottery');
    await page.fill('input[name="ticketCount"]', '100');
    // Intentionally skip drawDate

    // Try to submit
    await page.click('button:has-text("Create Lottery")');

    // Verify stays on create page (form validation prevents submission)
    await expect(page).toHaveURL('http://localhost:5173/create');
  });

  test('3.3: Create Room Form Fields Are Pre-filled with Defaults', async ({ page }) => {
    await page.goto('http://localhost:5173/create');

    // Verify ticketCount has default value
    const ticketCount = await page.locator('input[name="ticketCount"]').inputValue();
    expect(parseInt(ticketCount)).toBeGreaterThan(0);
  });
});
