# Quiz App Testing Scenarios

Comprehensive testing scenarios for the Quiz "Who's First?" application.

## Test Environment

- **Quiz Frontend**: http://localhost:5174
- **Platform Backend**: http://localhost:3000
- **Database**: PostgreSQL with seeded test data

## Test Data

### Test Users

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| alice@example.com | password123 | Organizer | Creates and runs quizzes |
| bob@example.com | password123 | Participant | Answers questions |
| charlie@example.com | password123 | Participant | Competes with Bob |
| diana@example.com | password123 | Viewer | Observer |

### Seeded Quiz Room

The database seed includes a quiz app registration. New quiz rooms are created per test.

---

## Test Files

| File | Tests | Description |
|------|-------|-------------|
| `auth.spec.ts` | 4 | Login, logout, protected routes |
| `quiz-flow.spec.ts` | 8 | Quiz creation, navigation, room management |
| `quiz-gameplay.spec.ts` | 10 | Real-time gameplay, answers, winners |
| `websocket-events.spec.ts` | 10 | WebSocket broadcasts, multi-user sync |

**Total: 32 tests**

---

## Test Scenarios

### TS-Q-001: Authentication Flow

**File:** `auth.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| 1.1 | Successful Login | Critical |
| 1.2 | Failed Login - Invalid Credentials | Critical |
| 1.3 | Logout | Critical |
| 1.4 | Protected Route Redirect | High |

#### Test 1.1: Successful Login

```typescript
await page.goto(`${TEST_CONFIG.quizUrl}/login`);
await page.fill('input[type="email"]', 'alice@example.com');
await page.fill('input[type="password"]', 'password123');
await page.click('button:has-text("Login")');

await expect(page).toHaveURL(`${TEST_CONFIG.quizUrl}/`);
await expect(page.locator('header').locator('text=Alice Johnson')).toBeVisible();
```

---

### TS-Q-002: Quiz Creation

**File:** `quiz-flow.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| 2.1 | Create Quiz with Questions | Critical |
| 2.2 | Form Validation - Empty Name | High |
| 2.3 | Form Validation - No Questions | High |
| 2.4 | Navigate to Home Page | Medium |
| 2.5 | View Quiz Room After Creation | High |

#### Test 2.1: Create Quiz with Questions

```typescript
await loginAsUser(page, 'alice');
await navigateTo(page, '/create');

// Fill quiz details
await page.locator('input[placeholder="Enter quiz name"]').fill('Test Quiz');
await page.locator('textarea[placeholder="Optional description"]').fill('A test quiz');

// Add question
await page.locator('input[placeholder="Enter your question"]').fill('What is 2+2?');
await page.locator('input[placeholder="Option A"]').fill('3');
await page.locator('input[placeholder="Option B"]').fill('4');
await page.locator('input[placeholder="Option C"]').fill('5');
await page.locator('input[placeholder="Option D"]').fill('6');

// Select correct answer (B = 4)
await page.locator('input[name="correctAnswer"]').nth(1).click();
await page.click('button:has-text("Add Question")');

// Create quiz (wait for API response)
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/rooms') && resp.status() === 201),
  page.click('button:has-text("Create Quiz")'),
]);

await page.waitForURL(/\/quiz\//);
await expect(page.locator('span.rounded-full:has-text("DRAFT")')).toBeVisible();
```

---

### TS-Q-003: Quiz Room Management

**File:** `quiz-flow.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| 3.1 | Activate Room | Critical |
| 3.2 | View Leaderboard (Empty) | Medium |
| 3.3 | View Quiz Controls (Organizer Only) | High |

---

### TS-Q-004: Quiz Gameplay

**File:** `quiz-gameplay.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| 5.1 | Organizer Starts Quiz, Question Displayed | Critical |
| 5.2 | Participant Sees Question via WebSocket | Critical |
| 5.3 | Participant Submits Answer | Critical |
| 5.4 | First Correct Answer Wins | Critical |
| 5.5 | Wrong Answer Doesn't Win | High |
| 5.6 | Organizer Advances to Next Question | Critical |
| 5.7 | Quiz Completion with Leaderboard | Critical |
| 5.8 | Leaderboard Updates After Each Round | High |
| 5.9 | Organizer Cannot Answer | Medium |
| 5.10 | Participant Cannot Answer Twice | Medium |

#### Test 5.1: Organizer Starts Quiz

```typescript
// Setup: Create quiz with questions via API
const room = await createQuizRoom(request, aliceToken, 'Gameplay Test', [
  { text: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctIndex: 1 },
]);

// Activate room
await request.patch(`${PLATFORM_URL}/api/v1/rooms/${room.id}`, {
  headers: authHeader(aliceToken),
  data: { status: 'ACTIVE' },
});

// Navigate to quiz
await alicePage.goto(`${TEST_CONFIG.quizUrl}/quiz/${room.id}`);
await alicePage.waitForLoadState('networkidle');

// Start quiz
await Promise.all([
  alicePage.waitForResponse(resp => resp.url().includes('/rooms/')),
  alicePage.click('button:has-text("Start Quiz")'),
]);
await alicePage.waitForTimeout(1500);

// Question should appear
await expect(alicePage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });
```

#### Test 5.4: First Correct Answer Wins

```typescript
// Both Alice and Bob in quiz room, question active
// Bob submits correct answer (index 1 = "4")
await bobPage.click('button:has-text("4")');
await bobPage.waitForTimeout(1500);

// Winner announcement should appear
await expect(bobPage.locator('text=/Round Winner|You Win This Round/i')).toBeVisible({ timeout: 10000 });

// Alice (organizer) also sees winner
await expect(alicePage.locator('text=Bob Smith')).toBeVisible({ timeout: 10000 });
```

---

### TS-Q-005: WebSocket Events

**File:** `websocket-events.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| 6.1 | Participant Joined Event | High |
| 6.2 | Question Shown Broadcast | Critical |
| 6.3 | Round Winner Broadcast | Critical |
| 6.4 | Quiz Status Transitions | High |
| 6.5 | Quiz Finished with Leaderboard | Critical |
| 6.6 | Multiple Users See Same Updates | Critical |
| 6.7 | WebSocket Reconnection | Medium |
| 6.8 | Room Status Change Events | High |
| 6.9 | Answer Submitted Visual Feedback | Medium |
| 6.10 | Participant Count Updates | Medium |

#### Test 6.2: Question Shown Broadcast

```typescript
// Alice (organizer) and Bob (participant) both connected
await alicePage.goto(`${TEST_CONFIG.quizUrl}/quiz/${room.id}`);
await bobPage.goto(`${TEST_CONFIG.quizUrl}/quiz/${room.id}`);
await alicePage.waitForLoadState('networkidle');
await bobPage.waitForLoadState('networkidle');

// Alice starts quiz
await Promise.all([
  alicePage.waitForResponse(resp => resp.url().includes('/rooms/')),
  alicePage.click('button:has-text("Start Quiz")'),
]);
await alicePage.waitForTimeout(1500);

// Both should see the question
await expect(alicePage.locator('h2:has-text("Q1?")')).toBeVisible({ timeout: 10000 });
await expect(bobPage.locator('h2:has-text("Q1?")')).toBeVisible({ timeout: 10000 });
```

---

## Test Helpers

### Quiz Fixtures (`tests/helpers/quiz-fixtures.ts`)

```typescript
import { createQuizRoom, createQuizPrize, updateQuizSettings } from '../../../tests/helpers/quiz-fixtures';

// Create quiz with questions
const room = await createQuizRoom(request, token, 'My Quiz', [
  { text: 'Question 1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
  { text: 'Question 2?', options: ['W', 'X', 'Y', 'Z'], correctIndex: 2 },
]);

// Create prize for winner tracking
await createQuizPrize(request, token, room.id);

// Update quiz settings
await updateQuizSettings(request, token, room.id, {
  currentQuestionIndex: 0,
  quizStatus: 'QUESTION_ACTIVE',
});
```

### Login Helper

```typescript
async function loginAsUser(page: Page, user: keyof typeof TEST_USERS) {
  await page.goto(`${TEST_CONFIG.quizUrl}/login`);
  await page.fill('input[type="email"]', TEST_USERS[user].email);
  await page.fill('input[type="password"]', TEST_USERS[user].password);
  await page.click('button:has-text("Login")');
  await page.waitForURL(`${TEST_CONFIG.quizUrl}/`);
}
```

### Navigate Helper

```typescript
async function navigateTo(page: Page, path: string) {
  await page.goto(`${TEST_CONFIG.quizUrl}${path}`);
  await page.waitForLoadState('networkidle');
}
```

---

## Running Quiz Tests

```bash
# All quiz tests
pnpm test:e2e --project=quiz-app

# Specific test file
pnpm test:e2e apps/quiz/tests/quiz-gameplay.spec.ts

# Single test by line number
pnpm test:e2e apps/quiz/tests/quiz-gameplay.spec.ts:42

# With visible browser
pnpm test:e2e --project=quiz-app --headed

# Interactive UI mode
pnpm test:e2e --project=quiz-app --ui
```

---

## Key Locators

### Status Badges

```typescript
// Quiz status
page.locator('span:has-text("Waiting")')
page.locator('span:has-text("Question Active")')
page.locator('span:has-text("Between Rounds")')
page.locator('span:has-text("Finished")')

// Room status
page.locator('span.rounded-full:has-text("DRAFT")')
page.locator('span.rounded-full:has-text("ACTIVE")')
page.locator('span.rounded-full:has-text("COMPLETED")')
```

### Quiz Controls (Organizer)

```typescript
page.locator('h3:has-text("Quiz Controls")')
page.locator('button:has-text("Start Quiz")')
page.locator('button:has-text("Next Question")')
page.locator('button:has-text("Show Final Results")')
```

### Question Display

```typescript
page.locator('h2:has-text("What is 2 + 2?")')
page.locator('text=Question 1 of 3').first()
```

### Answer Buttons

```typescript
page.locator('button:has-text("Option A")')
page.locator('button:has-text("4")') // For numbered options
```

### Leaderboard

```typescript
page.locator('h3:has-text("Leaderboard")')
page.locator('.bg-white:has-text("Name")')
```

### Winner Announcement

```typescript
page.locator('text=/Round Winner|You Win This Round/i')
page.locator('h2:has-text("Quiz Complete!")')
```

---

## Common Issues & Solutions

### Question Doesn't Appear After Start Quiz

**Cause:** WebSocket not connected when event broadcast.

**Solution:**
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Extra wait for WebSocket subscription
// Now click Start Quiz
```

### Multiple Matches for "Leaderboard"

**Cause:** Text appears in heading and sidebar.

**Solution:**
```typescript
// Use tag-scoped locator
page.locator('h3:has-text("Leaderboard")')
```

### Participant Can't See Question

**Cause:** Clicked Start Quiz before participant's page loaded.

**Solution:** Ensure both pages are loaded and connected:
```typescript
await alicePage.waitForLoadState('networkidle');
await bobPage.waitForLoadState('networkidle');
await alicePage.waitForTimeout(500);
await bobPage.waitForTimeout(500);
// Now start quiz
```

### Winner Not Announced

**Cause:** Race condition - answer processed but broadcast not received.

**Solution:**
```typescript
await expect(page.locator('text=Round Winner')).toBeVisible({ timeout: 10000 });
```

---

## WebSocket Events Reference

| Event | Trigger | Contains |
|-------|---------|----------|
| `quiz:question_shown` | Start Quiz / Next Question | question, index, total |
| `quiz:answer_submitted` | Participant answers | participantId, name |
| `quiz:round_winner` | Correct answer received | winner details, responseTimeMs |
| `quiz:status_changed` | State transition | quizStatus |
| `quiz:finished` | Quiz ends | leaderboard array |

See [Quiz Protocol](../api/quiz-protocol.md) for full event specifications.
