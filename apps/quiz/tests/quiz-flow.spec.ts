import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../../tests/helpers/auth';
import { TEST_CONFIG } from '../../../tests/helpers/config';

// Helper to login (from lottery pattern)
async function loginAsUser(page: import('@playwright/test').Page, user: keyof typeof TEST_USERS) {
  await page.goto(`${TEST_CONFIG.quizUrl}/login`);
  await page.fill('input[type="email"]', TEST_USERS[user].email);
  await page.fill('input[type="password"]', TEST_USERS[user].password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(`${TEST_CONFIG.quizUrl}/`);
}

// Helper to navigate to page and wait for load (from lottery pattern)
async function navigateTo(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${TEST_CONFIG.quizUrl}${path}`);
  await page.waitForLoadState('networkidle');
}

/**
 * TS-Q-002: Quiz Creation Flow
 * Tests creating a quiz with questions
 */
test.describe('TS-Q-002: Quiz Creation', () => {

  test('2.1: Create Quiz with Questions', async ({ page }) => {
    await loginAsUser(page, 'alice');

    // Navigate to create page
    await navigateTo(page, '/create');
    await expect(page.locator('h1:has-text("Create New Quiz")')).toBeVisible();

    // Fill quiz details - wait for form to be ready
    await page.locator('input[placeholder="Enter quiz name"]').fill('Test Quiz');
    await page.locator('textarea[placeholder="Optional description"]').fill('A test quiz');

    // Add first question
    await page.locator('input[placeholder="Enter your question"]').fill('What is 2+2?');
    await page.locator('input[placeholder="Option A"]').fill('3');
    await page.locator('input[placeholder="Option B"]').fill('4');
    await page.locator('input[placeholder="Option C"]').fill('5');
    await page.locator('input[placeholder="Option D"]').fill('6');

    // Select correct answer (B = 4) - use nth to be more specific
    await page.locator('input[name="correctAnswer"]').nth(1).click();
    await page.click('button:has-text("Add Question")');

    // Verify question was added
    await expect(page.locator('text=What is 2+2?')).toBeVisible();
    await expect(page.locator('text=Questions (1)')).toBeVisible();

    // Create quiz and wait for API response (lottery pattern)
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms') && resp.status() === 201),
      page.click('button:has-text("Create Quiz")'),
    ]);

    // Should redirect to quiz room page
    await page.waitForURL(/\/quiz\//);
    await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();
  });

  test('2.2: Quiz Form Validation - Empty Name', async ({ page }) => {
    await loginAsUser(page, 'alice');
    await navigateTo(page, '/create');
    await expect(page.locator('h1:has-text("Create New Quiz")')).toBeVisible();

    // Try to submit without name (need at least one question for button to be enabled)
    await page.locator('input[placeholder="Enter your question"]').fill('Test?');
    await page.locator('input[placeholder="Option A"]').fill('A');
    await page.locator('input[placeholder="Option B"]').fill('B');
    await page.locator('input[placeholder="Option C"]').fill('C');
    await page.locator('input[placeholder="Option D"]').fill('D');
    await page.click('button:has-text("Add Question")');
    await expect(page.locator('text=Questions (1)')).toBeVisible();

    // Clear name if any - the input has 'required' attribute which triggers browser validation
    await page.locator('input[placeholder="Enter quiz name"]').fill('');
    await page.click('button:has-text("Create Quiz")');

    // Browser validation should prevent submission - page should stay on /create
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/create/);

    // The quiz name input should have browser validation active (required attribute)
    const nameInput = page.locator('input[placeholder="Enter quiz name"]');
    await expect(nameInput).toHaveAttribute('required', '');
  });

  test('2.3: Quiz Form Validation - No Questions', async ({ page }) => {
    await loginAsUser(page, 'alice');
    await navigateTo(page, '/create');
    await expect(page.locator('h1:has-text("Create New Quiz")')).toBeVisible();

    // Fill name but no questions
    await page.locator('input[placeholder="Enter quiz name"]').fill('Test Quiz');

    // Button should be disabled when no questions
    const submitButton = page.locator('button:has-text("Create Quiz")');
    await expect(submitButton).toBeDisabled();
  });
});

/**
 * TS-Q-003: Quiz Room Management
 * Tests quiz room activation and joining
 */
test.describe('TS-Q-003: Quiz Room Management', () => {

  test('3.1: View Quiz Rooms on Home Page', async ({ page }) => {
    await loginAsUser(page, 'alice');

    // Should be on home page showing quiz rooms
    await expect(page.locator('h1:has-text("Quiz")')).toBeVisible();
  });

  test('3.2: Activate Quiz Room', async ({ page }) => {
    await loginAsUser(page, 'alice');
    await page.click('a:has-text("Create Quiz")');

    // Create a quiz
    await page.fill('input[placeholder="Enter quiz name"]', `Activation Test ${Date.now()}`);
    await page.fill('input[placeholder="Enter your question"]', 'Test question?');
    await page.fill('input[placeholder="Option A"]', 'A');
    await page.fill('input[placeholder="Option B"]', 'B');
    await page.fill('input[placeholder="Option C"]', 'C');
    await page.fill('input[placeholder="Option D"]', 'D');
    await page.click('button:has-text("Add Question")');
    await page.click('button:has-text("Create Quiz")');
    await expect(page).toHaveURL(/\/quiz\//);

    // Should see DRAFT status
    await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();

    // Click activate
    await page.click('button:has-text("Activate Room")');

    // Should see ACTIVE status
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible();
  });

  test('3.3: Join Active Quiz Room', async ({ page, context }) => {
    // Alice creates and activates quiz
    await loginAsUser(page, 'alice');
    await navigateTo(page, '/create');

    await page.locator('input[placeholder="Enter quiz name"]').fill(`Join Test ${Date.now()}`);
    await page.locator('input[placeholder="Enter your question"]').fill('Test?');
    await page.locator('input[placeholder="Option A"]').fill('A');
    await page.locator('input[placeholder="Option B"]').fill('B');
    await page.locator('input[placeholder="Option C"]').fill('C');
    await page.locator('input[placeholder="Option D"]').fill('D');
    await page.click('button:has-text("Add Question")');

    // Wait for quiz creation
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms') && resp.status() === 201),
      page.click('button:has-text("Create Quiz")'),
    ]);
    await page.waitForURL(/\/quiz\//);

    // Activate room
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/rooms/') && resp.request().method() === 'PATCH'),
      page.click('button:has-text("Activate Room")'),
    ]);
    await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible();

    const quizUrl = page.url();

    // Bob joins in another tab
    const page2 = await context.newPage();
    await loginAsUser(page2, 'bob');
    await page2.goto(quizUrl);
    await page2.waitForLoadState('networkidle');

    // Bob should see join button
    await Promise.all([
      page2.waitForResponse(resp => resp.url().includes('/participants') && resp.status() === 201),
      page2.click('button:has-text("Join Quiz")'),
    ]);

    // Should see participant count increase - use specific locator from lottery pattern
    const participantCountLocator = page2.locator('.bg-white:has-text("Participants") .text-purple-600');
    await expect(participantCountLocator).toHaveText('2', { timeout: 5000 });

    await page2.close();
  });
});

/**
 * TS-Q-004: Quiz Gameplay
 * Tests the actual quiz game flow
 */
test.describe('TS-Q-004: Quiz Gameplay', () => {

  test('4.1: Organizer Controls Visible', async ({ page }) => {
    await loginAsUser(page, 'alice');
    await page.click('a:has-text("Create Quiz")');

    // Create and activate quiz
    await page.fill('input[placeholder="Enter quiz name"]', `Controls Test ${Date.now()}`);
    await page.fill('input[placeholder="Enter your question"]', 'Question 1?');
    await page.fill('input[placeholder="Option A"]', 'A');
    await page.fill('input[placeholder="Option B"]', 'B');
    await page.fill('input[placeholder="Option C"]', 'C');
    await page.fill('input[placeholder="Option D"]', 'D');
    await page.click('button:has-text("Add Question")');
    await page.click('button:has-text("Create Quiz")');
    await page.click('button:has-text("Activate Room")');

    // Should see quiz controls
    await expect(page.locator('text=Quiz Controls')).toBeVisible();
    await expect(page.locator('button:has-text("Start Quiz")')).toBeVisible();
  });

  test('4.2: Leaderboard Displays', async ({ page }) => {
    await loginAsUser(page, 'alice');
    await page.click('a:has-text("Create Quiz")');

    // Create and activate quiz
    await page.fill('input[placeholder="Enter quiz name"]', `Leaderboard Test ${Date.now()}`);
    await page.fill('input[placeholder="Enter your question"]', 'Q?');
    await page.fill('input[placeholder="Option A"]', 'A');
    await page.fill('input[placeholder="Option B"]', 'B');
    await page.fill('input[placeholder="Option C"]', 'C');
    await page.fill('input[placeholder="Option D"]', 'D');
    await page.click('button:has-text("Add Question")');
    await page.click('button:has-text("Create Quiz")');
    await page.click('button:has-text("Activate Room")');

    // Should see leaderboard section (h3 heading specifically)
    await expect(page.locator('h3:has-text("Leaderboard")')).toBeVisible();
  });

  test('4.3: Delete Quiz as Organizer', async ({ page }) => {
    await loginAsUser(page, 'alice');
    await page.click('a:has-text("Create Quiz")');

    // Create quiz (stay in DRAFT)
    await page.fill('input[placeholder="Enter quiz name"]', `Delete Test ${Date.now()}`);
    await page.fill('input[placeholder="Enter your question"]', 'Q?');
    await page.fill('input[placeholder="Option A"]', 'A');
    await page.fill('input[placeholder="Option B"]', 'B');
    await page.fill('input[placeholder="Option C"]', 'C');
    await page.fill('input[placeholder="Option D"]', 'D');
    await page.click('button:has-text("Add Question")');
    await page.click('button:has-text("Create Quiz")');

    // Delete
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Delete")');

    // Should redirect to home
    await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/`);
  });
});
