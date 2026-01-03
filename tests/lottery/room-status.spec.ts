import { test, expect } from '@playwright/test';
import { loginAsUser, loginViaUI, TEST_USERS } from '../helpers/auth';
import { createTestRoom, updateRoomStatus } from '../helpers/fixtures';
import { TEST_CONFIG } from '../helpers/config';


/**
 * TS-L-004: Room Status Management
 * Tests status transitions: DRAFT → ACTIVE → COMPLETED
 */
test.describe('TS-L-004: Room Status Management', () => {

  test('4.1: Change Status from DRAFT to ACTIVE', async ({ page, request }) => {
    // Login as Alice (organizer)
    const token = await loginAsUser(request, 'alice');

    // Create a draft room
    const room = await createTestRoom(request, token, {
      name: `Draft Lottery ${Date.now()}`,
    });

    // Login via UI and navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`${TEST_CONFIG.lotteryUrl}/room/${room.id}`);

    // Verify room status is DRAFT
    await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();

    // Verify "Start Lottery" button is visible
    await expect(page.locator('button:has-text("Start Lottery")')).toBeVisible();

    // Click "Start Lottery" button and accept confirmation
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Start Lottery")');

    // Wait for status update
    await page.waitForTimeout(1000);

    // Verify status changed to ACTIVE
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible();

    // Verify "Start Lottery" button disappeared
    await expect(page.locator('button:has-text("Start Lottery")')).not.toBeVisible();

    // Verify "Complete Lottery" button appears
    await expect(page.locator('button:has-text("Complete Lottery")')).toBeVisible();
  });

  test('4.2: Change Status from ACTIVE to COMPLETED', async ({ page, request }) => {
    // Login and create an active room
    const token = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, token, {
      name: `Active Lottery ${Date.now()}`,
    });
    await updateRoomStatus(request, token, room.id, 'ACTIVE');

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`${TEST_CONFIG.lotteryUrl}/room/${room.id}`);

    // Verify room status is ACTIVE
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible();

    // Click "Complete Lottery" button and accept confirmation
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Complete Lottery")');

    // Wait for status update
    await page.waitForTimeout(1000);

    // Verify status changed to COMPLETED
    await expect(page.locator('span.rounded-full:has-text("COMPLETED")')).toBeVisible();

    // Verify "Complete Lottery" button disappeared
    await expect(page.locator('button:has-text("Complete Lottery")')).not.toBeVisible();
  });

  test('4.3: Status Change - Non-Organizer Cannot See Buttons', async ({ page, request }) => {
    // Create room as Alice
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Test Lottery ${Date.now()}`,
    });
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Login as Bob (non-organizer)
    await loginViaUI(page, 'bob');
    await page.goto(`${TEST_CONFIG.lotteryUrl}/room/${room.id}`);

    // Verify status badge is visible
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible();

    // Verify status change buttons are NOT visible
    await expect(page.locator('button:has-text("Start Lottery")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Complete Lottery")')).not.toBeVisible();
  });

  test('4.4: Cancel Status Change Confirmation', async ({ page, request }) => {
    // Create draft room
    const token = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, token, {
      name: `Draft Lottery ${Date.now()}`,
    });

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`${TEST_CONFIG.lotteryUrl}/room/${room.id}`);

    // Click "Start Lottery" but dismiss confirmation
    page.once('dialog', dialog => dialog.dismiss());
    await page.click('button:has-text("Start Lottery")');

    // Wait a bit
    await page.waitForTimeout(500);

    // Verify status is still DRAFT
    await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();

    // Verify "Start Lottery" button still visible
    await expect(page.locator('button:has-text("Start Lottery")')).toBeVisible();
  });
});
