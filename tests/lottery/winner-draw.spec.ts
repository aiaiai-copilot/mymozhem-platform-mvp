import { test, expect } from '@playwright/test';
import { loginAsUser, loginViaUI, TEST_USERS } from '../helpers/auth';
import { createTestRoom, createPrize, joinRoom, updateRoomStatus } from '../helpers/fixtures';

/**
 * TS-L-006: Winner Draw Functionality
 * Critical tests for the main lottery feature
 */
test.describe('TS-L-006: Winner Draw Functionality', () => {

  test('6.1: Draw Single Winner (Happy Path)', async ({ page, request }) => {
    // Setup: Create room with prizes and participants
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Winner Draw Test ${Date.now()}`,
    });

    // Add a prize
    await createPrize(request, aliceToken, room.id, {
      name: 'Test Prize',
      quantity: 1,
    });

    // Make room ACTIVE
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Add participants
    const bobToken = await loginAsUser(request, 'bob');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    const charlieToken = await loginAsUser(request, 'charlie');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // Navigate to room as organizer
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Count existing winners
    const winnersCountBefore = await page.locator('[class*="winner"]').count();

    // Verify "Draw Winner" button is visible and enabled
    const drawButton = page.locator('button:has-text("Draw Winner")');
    await expect(drawButton).toBeVisible();
    await expect(drawButton).toBeEnabled();

    // Click "Draw Winner"
    await drawButton.click();

    // Wait for API response
    await page.waitForResponse(resp =>
      resp.url().includes('/winners') && resp.status() === 200
    );

    // Wait for UI update
    await page.waitForTimeout(1000);

    // Verify new winner appears
    const winnersCountAfter = await page.locator('[class*="winner"]').count();
    expect(winnersCountAfter).toBeGreaterThan(winnersCountBefore);

    // Verify winner information is displayed
    await expect(page.locator('text=/won|winner/i')).toBeVisible();
  });

  test('6.2: Draw Multiple Winners Sequentially', async ({ page, request }) => {
    // Setup: Create room with multiple prizes
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Multiple Winners Test ${Date.now()}`,
    });

    // Add multiple prizes
    await createPrize(request, aliceToken, room.id, {
      name: 'Prize 1',
      quantity: 1,
    });
    await createPrize(request, aliceToken, room.id, {
      name: 'Prize 2',
      quantity: 1,
    });
    await createPrize(request, aliceToken, room.id, {
      name: 'Prize 3',
      quantity: 1,
    });

    // Make room ACTIVE and add participants
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    const bobToken = await loginAsUser(request, 'bob');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Draw 3 winners
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Draw Winner")');
      await page.waitForResponse(resp =>
        resp.url().includes('/winners') && resp.status() === 200
      );
      await page.waitForTimeout(500);
    }

    // Verify at least 3 winners are displayed
    const winnersCount = await page.locator('[class*="winner"]').count();
    expect(winnersCount).toBeGreaterThanOrEqual(3);
  });

  test('6.3: Draw Winner - No Eligible Participants', async ({ page, request }) => {
    // Create room with only organizer (no participants)
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `No Participants Test ${Date.now()}`,
    });

    await createPrize(request, aliceToken, room.id, {
      name: 'Prize',
      quantity: 1,
    });

    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Draw Winner" button is disabled
    const drawButton = page.locator('button:has-text("Draw Winner")');
    await expect(drawButton).toBeDisabled();
  });

  test('6.4: Draw Winner - No Available Prizes', async ({ page, request }) => {
    // Create room with participants but no prizes
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `No Prizes Test ${Date.now()}`,
    });

    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    const bobToken = await loginAsUser(request, 'bob');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Draw Winner" button is disabled
    const drawButton = page.locator('button:has-text("Draw Winner")');
    await expect(drawButton).toBeDisabled();
  });

  test('6.5: Winner Data Persistence After Page Reload', async ({ page, request }) => {
    // Use seeded room with existing winners
    await loginViaUI(page, 'alice');

    // Navigate to seeded room "New Year Lottery 2025"
    await page.goto('http://localhost:5173/');
    await page.click('text=New Year Lottery 2025');

    // Get winner information before reload
    const winnerText = await page.locator('[class*="winner"]').first().textContent();

    // Reload page
    await page.reload();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify winner is still displayed
    await expect(page.locator('[class*="winner"]').first()).toBeVisible();

    // Verify winner data matches
    const winnerTextAfter = await page.locator('[class*="winner"]').first().textContent();
    expect(winnerTextAfter).toBe(winnerText);
  });

  test('6.6: Prize Quantity Decreases After Draw', async ({ page, request }) => {
    // Create room with a prize
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Prize Quantity Test ${Date.now()}`,
    });

    await createPrize(request, aliceToken, room.id, {
      name: 'Limited Prize',
      quantity: 2,
    });

    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    const bobToken = await loginAsUser(request, 'bob');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Navigate to room
    await loginViaUI(page, 'alice');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Get initial prize quantity
    const prizeCard = page.locator('text=Limited Prize').locator('..');
    const initialQuantity = await prizeCard.locator('text=/remaining/i').textContent();

    // Draw winner
    await page.click('button:has-text("Draw Winner")');
    await page.waitForResponse(resp => resp.url().includes('/winners'));
    await page.waitForTimeout(1000);

    // Get new prize quantity
    const newQuantity = await prizeCard.locator('text=/remaining/i').textContent();

    // Verify quantity changed
    expect(newQuantity).not.toBe(initialQuantity);
  });

  test('6.7: Only Organizer Can Draw Winners', async ({ page, request }) => {
    // Create room as Alice
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createTestRoom(request, aliceToken, {
      name: `Organizer Only Test ${Date.now()}`,
    });

    await createPrize(request, aliceToken, room.id, { quantity: 1 });
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    const bobToken = await loginAsUser(request, 'bob');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Login as Bob (participant, not organizer)
    await loginViaUI(page, 'bob');
    await page.goto(`http://localhost:5173/room/${room.id}`);

    // Verify "Draw Winner" button is NOT visible
    await expect(page.locator('button:has-text("Draw Winner")')).not.toBeVisible();
  });
});
