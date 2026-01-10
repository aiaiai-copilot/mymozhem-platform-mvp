# E2E Testing Patterns

Reliable patterns for testing WebSocket-based real-time applications with Playwright.

These patterns were developed through iterative debugging of quiz and lottery tests. Following them prevents flaky tests.

---

## Core Patterns

### 1. Wait for API Response Before Assertions

**Problem:** Clicking a button triggers an API call, but the test asserts before the response updates the UI.

**Solution:** Use `waitForResponse()` with the button click.

```typescript
// BAD - Race condition
await page.click('button:has-text("Start Quiz")');
await expect(page.locator('text=Question 1')).toBeVisible();

// GOOD - Wait for API response
await Promise.all([
  page.waitForResponse(resp =>
    resp.url().includes('/rooms/') &&
    resp.request().method() === 'PATCH'
  ),
  page.click('button:has-text("Start Quiz")'),
]);
await expect(page.locator('text=Question 1')).toBeVisible();
```

**When to use:**
- Form submissions
- Status changes (Start Quiz, Activate Room, etc.)
- Any button that calls an API

### 2. Wait for Network Idle After Navigation

**Problem:** Page loads but WebSocket not yet connected, missing real-time events.

**Solution:** Use `waitForLoadState('networkidle')` after navigation.

```typescript
// BAD - WebSocket may not be ready
await page.goto(`${TEST_CONFIG.quizUrl}/quiz/${roomId}`);
// WebSocket events may be missed here

// GOOD - Wait for all connections
await page.goto(`${TEST_CONFIG.quizUrl}/quiz/${roomId}`);
await page.waitForLoadState('networkidle');
```

**Helper function:**
```typescript
async function navigateTo(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}
```

### 3. Add Wait After WebSocket-Triggering Actions

**Problem:** WebSocket broadcast takes time to reach all clients.

**Solution:** Add explicit wait after actions that trigger WebSocket events.

```typescript
// After clicking "Start Quiz" (triggers quiz:question_shown)
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/rooms/')),
  page.click('button:has-text("Start Quiz")'),
]);
await page.waitForTimeout(1500); // Wait for WebSocket propagation

// Now check other participant's page
await expect(participantPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible();
```

**Recommended waits:**
- 1500ms after quiz actions (Start, Next Question, End)
- 1000ms after room status changes
- 500ms after participant joins

### 4. Use Specific Locators with Scoping

**Problem:** `text=Leaderboard` matches both heading and sidebar item, causing strict mode violation.

**Solution:** Use tag-scoped or parent-scoped locators.

```typescript
// BAD - Multiple matches
await expect(page.locator('text=Leaderboard')).toBeVisible();

// GOOD - Tag-scoped
await expect(page.locator('h3:has-text("Leaderboard")')).toBeVisible();

// GOOD - Parent-scoped
await expect(page.locator('.sidebar:has-text("Leaderboard")')).toBeVisible();

// GOOD - Nested scoping
await expect(
  page.locator('.bg-white:has-text("Participants")')
      .locator('.text-purple-600')
).toContainText('3');
```

### 5. Use .first() for Known Multiple Matches

**Problem:** Element appears in multiple places (e.g., "Question 1 of 3" in main area AND sidebar).

**Solution:** Use `.first()` when multiple matches are expected.

```typescript
// BAD - Strict mode error if multiple matches
await expect(page.locator('text=Question 1 of 3')).toBeVisible();

// GOOD - Explicitly take first match
await expect(page.locator('text=Question 1 of 3').first()).toBeVisible();
```

### 6. Increase Timeouts for WebSocket Events

**Problem:** Default 5000ms timeout insufficient for WebSocket propagation under load.

**Solution:** Use 10000ms+ timeouts for WebSocket-dependent assertions.

```typescript
// BAD - May timeout before WebSocket delivers
await expect(page.locator('text=Round Winner')).toBeVisible({ timeout: 5000 });

// GOOD - Allow time for WebSocket
await expect(page.locator('text=Round Winner')).toBeVisible({ timeout: 10000 });
```

---

## Multi-User Test Patterns

### Setup Multiple Browser Contexts

```typescript
test('two users see real-time updates', async ({ browser }) => {
  // Create separate contexts (isolated sessions)
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();

  // Login each user
  await loginViaUI(alicePage, 'alice');
  await loginViaUI(bobPage, 'bob');

  // Navigate both to same room
  await alicePage.goto(`${TEST_CONFIG.quizUrl}/quiz/${roomId}`);
  await bobPage.goto(`${TEST_CONFIG.quizUrl}/quiz/${roomId}`);
  await alicePage.waitForLoadState('networkidle');
  await bobPage.waitForLoadState('networkidle');

  // Alice (organizer) performs action
  await Promise.all([
    alicePage.waitForResponse(resp => resp.url().includes('/rooms/')),
    alicePage.click('button:has-text("Start Quiz")'),
  ]);
  await alicePage.waitForTimeout(1500);

  // Bob (participant) should see result
  await expect(bobPage.locator('h2:has-text("What is 2 + 2?")')).toBeVisible({ timeout: 10000 });

  // Cleanup
  await aliceContext.close();
  await bobContext.close();
});
```

### Order of Operations for Multi-User Tests

```typescript
// 1. Login all users first
await loginViaUI(alicePage, 'alice');
await loginViaUI(bobPage, 'bob');

// 2. Navigate all to room
await alicePage.goto(roomUrl);
await bobPage.goto(roomUrl);

// 3. Wait for all connections
await alicePage.waitForLoadState('networkidle');
await bobPage.waitForLoadState('networkidle');

// 4. Add extra wait for WebSocket subscriptions
await alicePage.waitForTimeout(500);
await bobPage.waitForTimeout(500);

// 5. NOW perform the action
await alicePage.click('button:has-text("Start Quiz")');
```

---

## Common Fixes for Flaky Tests

### Status Badge Locators

```typescript
// For quiz status badges
await expect(page.locator('span:has-text("Waiting")')).toBeVisible();
await expect(page.locator('span:has-text("Question Active")')).toBeVisible();

// For room status badges (with specific class)
await expect(page.locator('span.rounded-full:has-text("ACTIVE")')).toBeVisible();
await expect(page.locator('span.rounded-full:has-text("COMPLETED")')).toBeVisible();
```

### Form Validation

```typescript
// Check HTML5 validation (required attribute)
const input = page.locator('input[name="quizName"]');
await expect(input).toHaveAttribute('required', '');

// Check button disabled state
await expect(page.locator('button:has-text("Create Quiz")')).toBeDisabled();
```

### Winner Announcement Locators

```typescript
// Use regex for text variations
await expect(
  page.locator('text=/Round Winner|You Win This Round/i')
).toBeVisible({ timeout: 10000 });
```

### Leaderboard Locators

```typescript
// Table-like structures
await expect(
  page.locator('.bg-white:has-text("Name")').locator('text=Alice')
).toBeVisible();

// Final standings (different styling)
await expect(
  page.locator('.bg-white\\/50:has-text("Name")')
).toBeVisible();
```

---

## Anti-Patterns to Avoid

### 1. Don't Use Fixed Sleeps Without Reason

```typescript
// BAD - Arbitrary sleep
await page.waitForTimeout(5000);
await expect(page.locator('text=Winner')).toBeVisible();

// GOOD - Specific wait + timeout
await page.waitForTimeout(1500); // WebSocket propagation
await expect(page.locator('text=Winner')).toBeVisible({ timeout: 10000 });
```

### 2. Don't Assert Immediately After Click

```typescript
// BAD
await page.click('button:has-text("Submit")');
await expect(page.locator('text=Success')).toBeVisible();

// GOOD
await Promise.all([
  page.waitForResponse(resp => resp.status() === 200),
  page.click('button:has-text("Submit")'),
]);
await expect(page.locator('text=Success')).toBeVisible();
```

### 3. Don't Use Loose Text Selectors

```typescript
// BAD - May match partial text
await page.locator('text=Start');

// GOOD - Exact or scoped
await page.locator('button:has-text("Start Quiz")');
await page.locator('h2:has-text("Quiz Started")');
```

### 4. Don't Forget Cleanup in Multi-User Tests

```typescript
// Always close contexts
try {
  // ... test code
} finally {
  await aliceContext.close();
  await bobContext.close();
}
```

---

## Debugging Tips

### Run Single Test

```bash
pnpm test:e2e apps/quiz/tests/quiz-gameplay.spec.ts:42
```

### Run Headed (See Browser)

```bash
pnpm test:e2e --headed
```

### Pause on Failure

```typescript
test('my test', async ({ page }) => {
  // Add this to pause browser on failure
  await page.pause();
});
```

### Trace Viewer

```bash
# Enable tracing
pnpm test:e2e --trace on

# View trace after failure
npx playwright show-trace trace.zip
```

### Console Logs from Browser

```typescript
page.on('console', msg => console.log('PAGE:', msg.text()));
page.on('pageerror', err => console.log('ERROR:', err.message));
```

---

## Summary Checklist

For every WebSocket-dependent test:

- [ ] `waitForLoadState('networkidle')` after navigation
- [ ] `waitForResponse()` wrapped with button clicks
- [ ] 1500ms wait after WebSocket-triggering actions
- [ ] 10000ms+ timeouts for WebSocket assertions
- [ ] Specific locators (`h2:has-text()`, not `text=`)
- [ ] `.first()` for known multiple matches
- [ ] Context cleanup in multi-user tests
