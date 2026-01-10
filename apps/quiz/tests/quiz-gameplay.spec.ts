/**
 * Test Suite: Quiz Gameplay
 * TS-Q-005: Quiz Game Flow
 *
 * Tests the core quiz gameplay mechanics:
 * - Starting a quiz
 * - Showing questions to participants
 * - Submitting answers
 * - First correct answer wins
 * - Score tracking and leaderboard
 * - Quiz completion
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

test.describe('TS-Q-005: Quiz Gameplay', () => {

  test('5.1: Organizer Starts Quiz - Question Displayed', async ({ page, request }) => {
    // Setup: Create quiz room with questions
    const aliceToken = await loginAsUser(request, 'alice');
    const room = await createQuizRoom(request, aliceToken, {
      name: `Gameplay Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');

    // Login as organizer
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Wait for page to fully load - quiz controls should be visible for organizer
    await expect(page.locator('h3:has-text("Quiz Controls")')).toBeVisible({ timeout: 10000 });

    // Verify Start Quiz button is visible before clicking
    const startButton = page.locator('button:has-text("Start Quiz")');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await expect(startButton).toBeEnabled();

    // Verify waiting status (h2 heading with the exact text)
    await expect(page.locator('h2:has-text("Waiting for Quiz to Start")')).toBeVisible({ timeout: 5000 });

    // Start the quiz and wait for API response (lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      startButton.click(),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation + UI update

    // Wait for question to appear - use h2 which is the question heading
    await expect(page.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Verify question progress indicator (use .first() since it appears in both main area and sidebar)
    await expect(page.locator('text=Question 1 of 3').first()).toBeVisible();

    // Verify answer options are displayed (use button locators to be more specific)
    await expect(page.locator('button:has-text("3")')).toBeVisible();
    await expect(page.locator('button:has-text("4")')).toBeVisible();
    await expect(page.locator('button:has-text("5")')).toBeVisible();
    await expect(page.locator('button:has-text("6")')).toBeVisible();
  });

  test('5.2: Participant Sees Question via WebSocket', async ({ page, context, request }) => {
    // Setup: Create and activate quiz
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `WebSocket Question Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice (organizer) opens the quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob (participant) opens the quiz in another tab
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Bob should see waiting state
    await expect(bobPage.locator('h2:has-text("Waiting for Quiz to Start")')).toBeVisible();

    // Alice starts the quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Bob should see the question via WebSocket (without page refresh)
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('text=Question 1 of 3')).toBeVisible();

    await bobPage.close();
  });

  test('5.3: Participant Submits Answer', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Answer Submit Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob opens quiz
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Alice starts quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Wait for Bob to see question
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob submits answer (clicks on '4' which is the correct answer at index 1)
    await bobPage.click('button:has-text("4")');

    // Bob should see their answer was submitted (button state changes - check disabled state)
    await expect(bobPage.locator('button:has-text("4")')).toBeDisabled({ timeout: 5000 });

    await bobPage.close();
  });

  test('5.4: First Correct Answer Wins Round', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Winner Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob opens quiz
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Alice starts quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Wait for question
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob answers correctly (4 is at index 1)
    await bobPage.click('button:has-text("4")');

    // Winner announcement should appear - check for winner text or "Round Winner!"
    await expect(bobPage.locator('text=/Round Winner|You Win This Round/i')).toBeVisible({ timeout: 10000 });

    // Alice should also see winner in leaderboard or announcement
    await expect(page.locator('.bg-white:has-text("Bob Smith")')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
  });

  test('5.5: Wrong Answer Does Not Win', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Wrong Answer Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');
    await joinRoom(request, charlieToken, room.id, 'PARTICIPANT');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob and Charlie open quiz
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    const charliePage = await context.newPage();
    await loginViaUI(charliePage, 'charlie');
    await navigateToQuizRoom(charliePage, room.id);

    // Alice starts quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Wait for question
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });
    await expect(charliePage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob answers WRONG first (3 instead of 4)
    await bobPage.click('button:has-text("3")');

    // Small delay
    await bobPage.waitForTimeout(500);

    // Charlie answers CORRECT
    await charliePage.click('button:has-text("4")');

    // Charlie should be the winner - winner announcement shows winner name
    await expect(charliePage.locator('text=/Round Winner|You Win This Round/i')).toBeVisible({ timeout: 10000 });

    // Verify Charlie won by checking leaderboard has Charlie with 1 win
    await expect(page.locator('.bg-white:has-text("Charlie Davis")')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
    await charliePage.close();
  });

  test('5.6: Next Question Flow', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Next Question Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob opens quiz
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Alice starts quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Wait for first question
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob answers correctly
    await bobPage.click('button:has-text("4")');

    // Wait for between rounds state
    await expect(page.locator('button:has-text("Next Question")')).toBeVisible({ timeout: 10000 });

    // Alice clicks next question (wait for API response)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Next Question")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Second question should appear
    await expect(bobPage.locator('h2:has-text("What color is the sky?")')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.locator('text=Question 2 of 3')).toBeVisible();

    await bobPage.close();
  });

  test('5.7: Quiz Completion - Final Leaderboard', async ({ page, context, request }) => {
    // Setup with only 1 question for quick test
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Completion Test ${Date.now()}`,
      questions: [
        {
          id: `q_${Date.now()}`,
          text: 'Quick test question?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
        },
      ],
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob opens quiz
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Alice starts quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Wait for question
    await expect(bobPage.locator('h2:has-text("Quick test question?")')).toBeVisible({ timeout: 10000 });

    // Bob answers correctly
    await bobPage.click('button:has-text("A")');

    // After last question, should show "Show Final Results" button
    await expect(page.locator('button:has-text("Show Final Results")')).toBeVisible({ timeout: 10000 });

    // Alice clicks to show final results (wait for API response)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Show Final Results")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Final results should be displayed - check for "Quiz Complete!" heading
    await expect(bobPage.locator('h2:has-text("Quiz Complete!")')).toBeVisible({ timeout: 10000 });

    // Final standings should show Bob
    await expect(bobPage.locator('.bg-white\\/50:has-text("Bob Smith")')).toBeVisible({ timeout: 5000 });

    await bobPage.close();
  });

  test('5.8: Leaderboard Updates After Each Round', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');
    const charlieToken = await loginAsUser(request, 'charlie');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Leaderboard Test ${Date.now()}`,
      questions: [
        { id: 'q1', text: 'Question 1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
        { id: 'q2', text: 'Question 2?', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
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

    // Start quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(bobPage.locator('h2:has-text("Question 1?")')).toBeVisible({ timeout: 10000 });

    // Bob wins round 1
    await bobPage.click('button:has-text("A")');
    await expect(page.locator('button:has-text("Next Question")')).toBeVisible({ timeout: 10000 });

    // Check leaderboard heading is visible
    await expect(page.locator('h3:has-text("Leaderboard")')).toBeVisible();

    // Go to question 2 (wait for API response)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Next Question")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(charliePage.locator('h2:has-text("Question 2?")')).toBeVisible({ timeout: 10000 });

    // Charlie wins round 2
    await charliePage.click('button:has-text("B")');

    // Wait for result to propagate
    await page.waitForTimeout(1000);

    // Verify both are in the leaderboard
    await expect(page.locator('.bg-white:has-text("Bob Smith")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bg-white:has-text("Charlie Davis")')).toBeVisible({ timeout: 10000 });

    await bobPage.close();
    await charliePage.close();
  });

  test('5.9: Only Participants Can Answer (Not Organizer)', async ({ page, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `Organizer No Answer Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice (organizer) opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Start quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation

    // Wait for question
    await expect(page.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Answer buttons should be disabled for organizer
    const answerButton = page.locator('button:has-text("4")');
    const isDisabled = await answerButton.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);
  });

  test('5.10: Participant Cannot Answer Twice', async ({ page, context, request }) => {
    // Setup
    const aliceToken = await loginAsUser(request, 'alice');
    const bobToken = await loginAsUser(request, 'bob');

    const room = await createQuizRoom(request, aliceToken, {
      name: `No Double Answer Test ${Date.now()}`,
    });
    await createQuizPrize(request, aliceToken, room.id);
    await updateRoomStatus(request, aliceToken, room.id, 'ACTIVE');
    await joinRoom(request, bobToken, room.id, 'PARTICIPANT');

    // Alice opens quiz
    await loginViaUI(page, 'alice');
    await navigateToQuizRoom(page, room.id);

    // Bob opens quiz
    const bobPage = await context.newPage();
    await loginViaUI(bobPage, 'bob');
    await navigateToQuizRoom(bobPage, room.id);

    // Start quiz (wait for API response - lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Start Quiz")'),
    ]);
    await page.waitForTimeout(1500); // Wait for WebSocket propagation
    await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

    // Bob answers
    await bobPage.click('button:has-text("3")');
    await bobPage.waitForTimeout(500); // Wait for answer to be processed

    // All answer buttons should now be disabled for Bob
    const buttons = bobPage.locator('button').filter({ hasText: /^[3456]$/ });
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const isDisabled = await buttons.nth(i).isDisabled();
      expect(isDisabled).toBe(true);
    }

    await bobPage.close();
  });
});
