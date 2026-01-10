/**
 * Test Suite: Quiz WebSocket Real-Time Events
 * TS-Q-006: WebSocket Event Broadcasting
 *
 * Validates real-time event broadcasting for quiz events:
 * - quiz:question_shown - Question broadcast to all participants
 * - quiz:answer_submitted - Someone submitted an answer
 * - quiz:round_winner - Winner announced for round
 * - quiz:status_changed - Quiz state transition
 * - quiz:finished - Quiz complete with leaderboard
 * - participant:joined/left - Participant events
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, loginAsUser } from '../../../tests/helpers/auth';
import { TEST_CONFIG } from '../../../tests/helpers/config';
import { joinRoom, updateRoomStatus } from '../../../tests/helpers/fixtures';
import { createQuizRoom, createQuizPrize } from '../../../tests/helpers/quiz-fixtures';

// Helper to login via UI
async function loginViaUI(page: import('@playwright/test').Page, user: keyof typeof TEST_USERS) {
  await page.goto(`${TEST_CONFIG.quizUrl}/login`);
  await page.fill('input[type="email"]', TEST_USERS[user].email);
  await page.fill('input[type="password"]', TEST_USERS[user].password);
  await page.click('button:has-text("Login")');
  await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/`);
}

// Helper to navigate to quiz room and wait for WebSocket connection
async function navigateToQuizRoom(page: import('@playwright/test').Page, roomId: string) {
  await page.goto(`${TEST_CONFIG.quizUrl}/quiz/${roomId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Extra time for WebSocket subscription
}

test.describe('TS-Q-006: Quiz WebSocket Real-Time Events', () => {

  test('6.1: Participant Joined Event - Real-time Update', async ({ page, context, request }) => {
    // Setup: Create active quiz
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createQuizRoom(request, aliceToken, {
      name: `Participant Join WS Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Alice opens the quiz room
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Get initial participant count from the Participants card
    const participantCountLocator = page.locator('.bg-white:has-text("Participants") .text-purple-600');
    await expect(participantCountLocator).toBeVisible({ timeout: 10000 });
    const initialCount = await participantCountLocator.textContent();

    // Bob joins in another browser
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);
    await bobPage.click('button:has-text("Join Quiz")');

    // Wait for WebSocket update
    await page.waitForTimeout(2000);

    // Alice should see participant count increase
    const newCount = await participantCountLocator.textContent();
    expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));

    await bobPage.close();
  });

  test('6.2: Question Shown Event - Broadcast to All', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Question Broadcast Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // All three users open the quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    const charliePage = await context.newPage();
    await loginViaUI(charliePage, 'charlie');
    await navigateToQuizRoom(charliePage, room.id);

    // All should be in waiting state
    await expect(bobPage.locator('h2:has-text("Waiting for Quiz to Start")')).toBeVisible();
    await expect(charliePage.locator('h2:has-text("Waiting for Quiz to Start")')).toBeVisible();

    // Alice starts quiz (broadcasts question) - wait for API response
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Both Bob and Charlie should receive question via WebSocket simultaneously
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });
    await expect(charliePage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Both should see same question number
    await expect(bobPage.locator('text=Question 1 of 3')).toBeVisible();
    await expect(charliePage.locator('text=Question 1 of 3')).toBeVisible();

    await bobPage.close();
    await charliePage.close();
  });

  test('6.3: Round Winner Event - Broadcast to All', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Winner Broadcast Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // All users open quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    const charliePage = await context.newPage();
    await loginViaUI(charliePage, 'charlie');
    await navigateToQuizRoom(charliePage, room.id);

    // Start quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob answers correctly first
    await bobPage.click('button:has-text("4")');

    // All three should see Bob as winner - check leaderboard
    await expect(page.locator('.bg-white:has-text("Bob Smith")')).toBeVisible({ timeout: 10000 });
    await expect(charliePage.locator('.bg-white:has-text("Bob Smith")')).toBeVisible({ timeout: 10000 });

    // Winner announcement should appear for Charlie too (check for Round Winner text)
    await expect(charliePage.locator('text=/Round Winner|🎉/i')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
    await charliePage.close();
  });

  test('6.4: Quiz Status Changed Event - State Transitions', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Status Change Test ${Date.now()}`,
      questions: [
        { id: 'q1', text: 'Test Q?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      ],
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Both users open quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Initial status: WAITING (shown in StatusBadge span) - wait for it explicitly
    await expect(page.locator('h3:has-text("Quiz Controls")')).toBeVisible({ timeout: 10000 });
    // Status badge is a span.rounded-full inside Quiz Controls
    await expect(page.locator('.bg-white:has-text("Quiz Controls") span.rounded-full:has-text("Waiting")')).toBeVisible({ timeout: 5000 });

    // Start quiz -> QUESTION_ACTIVE
    await page.click('button:has-text("Start Quiz")');
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(page.locator('.bg-white:has-text("Quiz Controls") span.rounded-full:has-text("Question Active")')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('h2:has-text("Test Q?")')).toBeVisible({ timeout: 10000 });

    // Bob answers -> BETWEEN_ROUNDS (wait for button to be clickable first)
    await expect(bobPage.locator('button:has-text("A")')).toBeEnabled({ timeout: 5000 });
    await bobPage.click('button:has-text("A")');
    await page.waitForTimeout(1500); // Wait for answer to be processed
    await expect(page.locator('.bg-white:has-text("Quiz Controls") span.rounded-full:has-text("Between Rounds")')).toBeVisible({ timeout: 10000 });

    // Wait for "Show Final Results" button to appear
    await expect(page.locator('button:has-text("Show Final Results")')).toBeVisible({ timeout: 10000 });

    // End quiz -> FINISHED (QuizControls disappear when room.status becomes COMPLETED)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Show Final Results")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    // When quiz finishes, QuizControls is hidden and room status badge shows COMPLETED
    await expect(page.locator('span.rounded-full:has-text("COMPLETED")')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('h2:has-text("Quiz Complete!")')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
  });

  test('6.5: Quiz Finished Event - Final Leaderboard Broadcast', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Finished Broadcast Test ${Date.now()}`,
      questions: [
        { id: 'q1', text: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
        { id: 'q2', text: 'Q2?', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
      ],
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // All users open quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    const charliePage = await context.newPage();
    await loginViaUI(charliePage, 'charlie');
    await navigateToQuizRoom(charliePage, room.id);

    // Play through quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(bobPage.locator('h2:has-text("Q1?")')).toBeVisible({ timeout: 10000 });

    // Bob wins Q1
    await bobPage.click('button:has-text("A")');
    await expect(page.locator('button:has-text("Next Question")')).toBeVisible({ timeout: 10000 });

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Next Question")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(charliePage.locator('h2:has-text("Q2?")')).toBeVisible({ timeout: 10000 });

    // Charlie wins Q2
    await charliePage.click('button:has-text("B")');
    await expect(page.locator('button:has-text("Show Final Results")')).toBeVisible({ timeout: 10000 });

    // End quiz (wait for API response)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Show Final Results")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // All should see final results
    await expect(bobPage.locator('h2:has-text("Quiz Complete!")')).toBeVisible({ timeout: 10000 });
    await expect(charliePage.locator('h2:has-text("Quiz Complete!")')).toBeVisible({ timeout: 10000 });

    // Final standings should show both participants
    await expect(bobPage.locator('.bg-white\\/50:has-text("Bob Smith")')).toBeVisible({ timeout: 5000 });
    await expect(bobPage.locator('.bg-white\\/50:has-text("Charlie Davis")')).toBeVisible({ timeout: 5000 });

    await bobPage.close();
    await charliePage.close();
  });

  test('6.6: Multi-User Real-Time Sync', async ({ page, context, request }) => {
    // Setup: Create quiz with 3 participants
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Multi-User Sync Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // All three open the quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    const charliePage = await context.newPage();
    await loginViaUI(charliePage, 'charlie');
    await navigateToQuizRoom(charliePage, room.id);

    // Wait for all connections
    await page.waitForTimeout(2000);

    // All should see same participant count - use more specific locator
    const participantCountLocator = (pg: typeof page) => pg.locator('.bg-white:has-text("Participants") .text-purple-600');

    const aliceCount = await participantCountLocator(page).textContent();
    const bobCount = await participantCountLocator(bobPage).textContent();
    const charlieCount = await participantCountLocator(charliePage).textContent();

    expect(parseInt(aliceCount || '0')).toBeGreaterThanOrEqual(3);
    expect(aliceCount).toBe(bobCount);
    expect(bobCount).toBe(charlieCount);

    await bobPage.close();
    await charliePage.close();
  });

  test('6.7: WebSocket Reconnection After Navigation', async ({ page, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createQuizRoom(request, aliceToken, {
      name: `Reconnection Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Verify initial load
    await expect(page.locator('h3:has-text("Quiz Controls")')).toBeVisible();

    // Navigate away
    await page.goto(`${TEST_CONFIG.quizUrl}/`);
    await page.waitForTimeout(500);

    // Navigate back
    await navigateToQuizRoom(page, room.id);

    // WebSocket should reconnect and data should load
    await expect(page.locator('h3:has-text("Quiz Controls")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h3:has-text("Leaderboard")')).toBeVisible();
  });

  test('6.8: Room Status Change via WebSocket', async ({ page, context, request }) => {
    // Setup: Create draft quiz
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Room Status WS Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);

    // Add Bob to room while in draft
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Both open quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Both should see DRAFT status (in the room header badge)
    await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();
    await expect(bobPage.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();

    // Alice activates room
    await page.click('button:has-text("Activate Room")');
    await page.waitForTimeout(1000); // Wait for WebSocket propagation

    // Both should see ACTIVE status via WebSocket
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
  });

  test('6.9: Answer Submitted Event - Visual Feedback', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Answer Feedback Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // All users open quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    const charliePage = await context.newPage();
    await loginViaUI(charliePage, 'charlie');
    await navigateToQuizRoom(charliePage, room.id);

    // Start quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob answers (wrong)
    await bobPage.click('button:has-text("3")');

    // Small delay for WebSocket propagation
    await page.waitForTimeout(500);

    // Charlie should still be able to answer
    const charlieAnswerButton = charliePage.locator('button:has-text("4")');
    await expect(charlieAnswerButton).toBeEnabled();

    // Charlie answers correctly
    await charliePage.click('button:has-text("4")');

    // Winner should be Charlie (not Bob who answered wrong) - check in leaderboard
    await expect(page.locator('.bg-white:has-text("Charlie Davis")')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
    await charliePage.close();
  });
});
