import { test, expect } from '@playwright/test';
import { loginAsUser, loginViaUI, TEST_USERS } from '../helpers/auth';
import { createTestRoom, updateRoomStatus, joinRoom } from '../helpers/fixtures';

/**
 * TS-L-005: Participant Management
 * TS-L-007: Delete Room
 */
test.describe('TS-L-005 & TS-L-007: Room Actions', () => {

  // ========== TS-L-005: Participant Management ==========

  test('5.1: Join Room as Participant', async ({ page, request }) => {
    // Create and activate a room as Alice
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Join Test ${Date.now()}`,
    });
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Login as Charlie (who is not in the room)
    await loginViaUI(page, 'charlie');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Join Lottery" button is visible
    await expect(page.locator('button:has-text("Join")')).toBeVisible();

    // Click "Join Lottery"
    await page.click('button:has-text("Join")');

    // Wait for join request
    await page.waitForResponse(resp =>
      resp.url().includes('/participants') && resp.status() === 201
    );

    // Verify user appears in participants list
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${TEST_USERS.charlie.name}`)).toBeVisible();

    // Verify "Join Lottery" button disappeared
    await expect(page.locator('button:has-text("Join")')).not.toBeVisible();
  });

  test('5.2: Cannot Join DRAFT Room', async ({ page, request }) => {
    // Create a DRAFT room as Alice
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Draft Room ${Date.now()}`,
    });
    // Room is DRAFT by default

    // Try to access as Charlie
    await loginViaUI(page, 'charlie');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Join Lottery" button is NOT visible
    await expect(page.locator('button:has-text("Join")')).not.toBeVisible();
  });

  test('5.3: Participants List Shows Roles', async ({ page, request }) => {
    // Create room
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Roles Test ${Date.now()}`,
    });
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Add Bob as participant
    const bobToken = await loginAsUser(request, 'bob');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Add Diana as viewer
    const dianaToken = await loginAsUser(request, 'diana');
    await joinRoom(request, dianaToken, room.id, 'VIEWER');

    // View room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify organizer role
    await expect(page.locator('text=ORGANIZER')).toBeVisible();

    // Verify participant role
    await expect(page.locator('text=PARTICIPANT')).toBeVisible();

    // Verify viewer role
    await expect(page.locator('text=VIEWER')).toBeVisible();
  });

  // ========== TS-L-007: Delete Room ==========

  test('7.1: Delete Room as Organizer', async ({ page, request }) => {
    // Create room as Alice
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Delete Test ${Date.now()}`,
    });

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Delete" button is visible
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();

    // Click "Delete" and accept confirmation
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Wait for delete request
    await page.waitForResponse(resp =>
      resp.url().includes(`/rooms/${room.id}`) &&
      resp.request().method() === 'DELETE'
    );

    // Verify redirected to home page
    await expect(page).toHaveURL('http://localhost:5173/');

    // Verify room no longer in list (wait for list to load)
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${room.name}`)).not.toBeVisible();
  });

  test('7.2: Delete Room - Cancel Confirmation', async ({ page, request }) => {
    // Create room
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Cancel Delete Test ${Date.now()}`,
    });

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Click "Delete" but dismiss confirmation
    page.once('dialog', dialog => dialog.dismiss());
    await page.click('button:has-text("Delete")');

    // Wait a bit
    await page.waitForTimeout(500);

    // Verify still on room page
    await expect(page).toHaveURL(`http://localhost:5173/room/${room.id}`);

    // Verify room name still visible
    await expect(page.locator(`text=${room.name}`)).toBeVisible();
  });

  test('7.3: Delete Button - Non-Organizer Cannot See', async ({ page, request }) => {
    // Create room as Alice
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Non-Organizer Delete Test ${Date.now()}`,
    });
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Login as Bob (non-organizer)
    await loginViaUI(page, 'bob');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Delete" button is NOT visible
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
  });

  // ========== TS-L-008: Winner Display ==========

  test('8.1: Winners Section Displays Correctly', async ({ page }) => {
    // Use seeded room with existing winners
    await loginViaUI(page, 'alice');
    await page.goto('http://localhost:5173/');

    // Click on seeded room
    await page.click('text=New Year Lottery 2025');

    // Verify winners section is visible
    await expect(page.locator('text=/winners/i')).toBeVisible();

    // Verify winner cards have required elements
    const winnerCard = page.locator('[class*="winner"]').first();
    await expect(winnerCard).toBeVisible();
  });

  test('8.3: Winner Badge on Participant', async ({ page, request }) => {
    // Use seeded room which has winners
    await loginViaUI(page, 'alice');
    await page.goto('http://localhost:5173/');
    await page.click('text=New Year Lottery 2025');

    // Verify at least one participant has winner badge
    await expect(page.locator('text=Winner!')).toBeVisible();
  });

  // ========== TS-L-009: Prize Display ==========

  test('9.1: Prize Cards Display Correctly', async ({ page, request }) => {
    // Use seeded room with prizes
    await loginViaUI(page, 'alice');
    await page.goto('http://localhost:5173/');
    await page.click('text=New Year Lottery 2025');

    // Verify prize section is visible
    await expect(page.locator('text=/prizes/i')).toBeVisible();

    // Verify prize cards show quantity information
    await expect(page.locator('text=/remaining/i')).toBeVisible();
  });
});
