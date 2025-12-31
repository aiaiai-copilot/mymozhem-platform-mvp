# Lottery App Testing Scenarios

Comprehensive testing scenarios for the Holiday Lottery application. Structured for manual testing and future Playwright automation.

## Test Environment

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Database**: PostgreSQL with seeded test data

## Test Data

### Test Users

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| alice@example.com | password123 | Organizer | Creator of "New Year Lottery 2025" |
| bob@example.com | password123 | Participant | Has existing winners |
| charlie@example.com | password123 | Participant | Regular participant |
| diana@example.com | password123 | Viewer | Non-participating viewer |

### Seeded Rooms

**"New Year Lottery 2025"** (ACTIVE):
- Organizer: Alice
- Participants: Bob (PARTICIPANT), Charlie (PARTICIPANT), Diana (VIEWER)
- Prizes: iPhone 15 Pro (qty: 1), AirPods Pro (qty: 2), $50 Gift Cards (qty: 5)
- Existing Winners: 1 (from seed data)

---

## Test Scenarios

### TS-L-001: User Authentication Flow

**Priority**: Critical
**Playwright Ready**: Yes

#### Test Case 1.1: Successful Login

**Given**: User is on login page (http://localhost:5173/login)

**When**:
1. Enter email: `alice@example.com`
2. Enter password: `password123`
3. Click "Login" button

**Expected**:
- Redirected to home page (`/`)
- Header shows "Alice Johnson" (user name)
- Header shows "Logout" link
- No "Login" link visible
- Token stored in localStorage (`token` key)

**Playwright Selectors**:
```typescript
await page.goto('http://localhost:5173/login');
await page.fill('input[type="email"]', 'alice@example.com');
await page.fill('input[type="password"]', 'password123');
await page.click('button:has-text("Login")');
await expect(page).toHaveURL('/');
await expect(page.locator('text=Alice Johnson')).toBeVisible();
await expect(page.locator('text=Logout')).toBeVisible();
```

#### Test Case 1.2: Failed Login - Invalid Credentials

**Given**: User is on login page

**When**:
1. Enter email: `alice@example.com`
2. Enter password: `wrongpassword`
3. Click "Login" button

**Expected**:
- Stays on login page
- Error message displayed: "Invalid credentials"
- No token in localStorage

**Playwright Selectors**:
```typescript
await page.fill('input[type="email"]', 'alice@example.com');
await page.fill('input[type="password"]', 'wrongpassword');
await page.click('button:has-text("Login")');
await expect(page.locator('text=Invalid credentials')).toBeVisible();
```

#### Test Case 1.3: Logout

**Given**: User is logged in

**When**:
1. Click "Logout" link in header

**Expected**:
- Redirected to login page (`/login`)
- Token removed from localStorage
- Header shows "Login" link
- No user name visible

**Playwright Selectors**:
```typescript
await page.click('text=Logout');
await expect(page).toHaveURL('/login');
await expect(page.locator('text=Login')).toBeVisible();
```

#### Test Case 1.4: Auth State Persistence After Login

**Given**: User is on login page

**When**:
1. Login successfully
2. Verify header shows user name immediately (no page refresh)

**Expected**:
- User name appears in header WITHOUT page refresh
- Auth state updates across all components instantly

---

### TS-L-002: Room List Display

**Priority**: High
**Playwright Ready**: Yes

#### Test Case 2.1: View Public Rooms

**Given**: User is logged in as any user

**When**: Navigate to home page (`/`)

**Expected**:
- List of public rooms displayed
- Each room card shows:
  - Room name
  - Description
  - Status badge (ACTIVE/DRAFT/COMPLETED)
  - Participant count
  - Prize count
- "New Lottery" button visible (top right)

**Playwright Selectors**:
```typescript
await page.goto('http://localhost:5173/');
await expect(page.locator('text=New Year Lottery 2025')).toBeVisible();
await expect(page.locator('text=ACTIVE').first()).toBeVisible();
await expect(page.locator('button:has-text("New Lottery")')).toBeVisible();
```

#### Test Case 2.2: Click on Room Card

**Given**: User is on home page with room list

**When**: Click on any room card

**Expected**:
- Navigated to room detail page (`/room/:roomId`)
- Room details displayed
- Prizes shown
- Participants list visible

**Playwright Selectors**:
```typescript
const roomCard = page.locator('text=New Year Lottery 2025').first();
await roomCard.click();
await expect(page).toHaveURL(/\/room\/[a-z0-9-]+/);
```

---

### TS-L-003: Create New Room

**Priority**: Critical
**Playwright Ready**: Yes

#### Test Case 3.1: Create Room with Valid Data

**Given**: User is logged in

**When**:
1. Click "New Lottery" button
2. Fill form:
   - Name: "Test Lottery 2026"
   - Description: "Testing lottery creation"
   - Ticket Count: 50
   - Draw Date: "2026-06-01T18:00" (future date)
3. Click "Create Lottery" button

**Expected**:
- Room created successfully
- Redirected to new room page
- Room status is "DRAFT"
- User is automatically the organizer
- No participants except organizer

**Playwright Selectors**:
```typescript
await page.click('button:has-text("New Lottery")');
await page.fill('input[name="name"]', 'Test Lottery 2026');
await page.fill('textarea[name="description"]', 'Testing lottery creation');
await page.fill('input[name="ticketCount"]', '50');
await page.fill('input[name="drawDate"]', '2026-06-01T18:00');
await page.click('button:has-text("Create Lottery")');
await expect(page).toHaveURL(/\/room\//);
await expect(page.locator('text=DRAFT')).toBeVisible();
```

#### Test Case 3.2: Create Room - Validation Error (Missing Required Field)

**Given**: User is on create room page

**When**:
1. Fill name: "Test Lottery"
2. Leave drawDate empty
3. Click "Create Lottery"

**Expected**:
- Form validation error shown
- Error message: "Draw date is required" or similar
- Form not submitted
- Stay on create page

**Playwright Selectors**:
```typescript
await page.fill('input[name="name"]', 'Test Lottery');
await page.fill('input[name="ticketCount"]', '100');
// Intentionally skip drawDate
await page.click('button:has-text("Create Lottery")');
await expect(page.locator('text=/date.*required/i')).toBeVisible();
```

---

### TS-L-004: Room Status Management

**Priority**: High
**Playwright Ready**: Yes

#### Test Case 4.1: Change Status from DRAFT to ACTIVE

**Given**:
- Logged in as room organizer
- Room status is "DRAFT"

**When**:
1. Navigate to room page
2. Click "Start Lottery" button
3. Confirm dialog

**Expected**:
- Status badge changes to "ACTIVE" (green)
- "Start Lottery" button disappears
- "Complete Lottery" button appears
- "Draw Winner" button becomes visible
- Non-participants can now join

**Playwright Selectors**:
```typescript
await page.goto('http://localhost:5173/room/[roomId]');
await page.click('button:has-text("Start Lottery")');
page.on('dialog', dialog => dialog.accept());
await expect(page.locator('text=ACTIVE')).toBeVisible();
await expect(page.locator('button:has-text("Complete Lottery")')).toBeVisible();
await expect(page.locator('button:has-text("Draw Winner")')).toBeVisible();
```

#### Test Case 4.2: Change Status from ACTIVE to COMPLETED

**Given**:
- Logged in as room organizer
- Room status is "ACTIVE"

**When**:
1. Click "Complete Lottery" button
2. Confirm dialog

**Expected**:
- Status badge changes to "COMPLETED" (gray)
- "Complete Lottery" button disappears
- "Draw Winner" button hidden
- Join button disabled for non-participants

**Playwright Selectors**:
```typescript
await page.click('button:has-text("Complete Lottery")');
page.on('dialog', dialog => dialog.accept());
await expect(page.locator('text=COMPLETED')).toBeVisible();
await expect(page.locator('button:has-text("Draw Winner")')).toBeHidden();
```

#### Test Case 4.3: Status Change - Non-Organizer Cannot See Buttons

**Given**: Logged in as regular participant (not organizer)

**When**: Navigate to room page

**Expected**:
- Status badge visible
- "Start Lottery" button NOT visible
- "Complete Lottery" button NOT visible
- Only participants can see "Join" button if not joined

**Playwright Selectors**:
```typescript
// Login as bob@example.com (non-organizer)
await page.goto('http://localhost:5173/room/[roomId]');
await expect(page.locator('button:has-text("Start Lottery")')).toBeHidden();
await expect(page.locator('button:has-text("Complete Lottery")')).toBeHidden();
```

---

### TS-L-005: Participant Management

**Priority**: High
**Playwright Ready**: Yes

#### Test Case 5.1: Join Room as Participant

**Given**:
- Logged in as user who is NOT in room
- Room status is "ACTIVE"

**When**:
1. Navigate to room page
2. Click "Join Lottery" button

**Expected**:
- User added to participants list
- User shown in sidebar with "PARTICIPANT" role
- "Join Lottery" button disappears
- User is now eligible for winner draw

**Playwright Selectors**:
```typescript
// Login as charlie@example.com
await page.goto('http://localhost:5173/room/[roomId]');
await page.click('button:has-text("Join Lottery")');
await expect(page.locator('text=Charlie Davis')).toBeVisible();
await expect(page.locator('button:has-text("Join Lottery")')).toBeHidden();
```

#### Test Case 5.2: Cannot Join DRAFT Room

**Given**:
- Logged in as non-organizer
- Room status is "DRAFT"

**When**: Navigate to room page

**Expected**:
- "Join Lottery" button NOT visible
- Only organizer can see the room

**Playwright Selectors**:
```typescript
await page.goto('http://localhost:5173/room/[draftRoomId]');
await expect(page.locator('button:has-text("Join Lottery")')).toBeHidden();
```

---

### TS-L-006: Winner Draw Functionality

**Priority**: Critical
**Playwright Ready**: Yes

#### Test Case 6.1: Draw Single Winner (Happy Path)

**Given**:
- Logged in as room organizer
- Room status is "ACTIVE"
- At least 2 participants with PARTICIPANT role
- At least 1 available prize (quantity > 0)

**When**:
1. Navigate to room page
2. Note current winners count
3. Click "Draw Winner" button
4. Wait for API response

**Expected**:
- New winner appears in "Winners" section
- Winner's name displayed with prize won
- Winner badge appears next to participant in sidebar
- Prize quantity decreases by 1
- No error message shown
- Page data refreshes automatically

**Playwright Selectors**:
```typescript
await page.goto('http://localhost:5173/room/[activeRoomId]');
const winnersCountBefore = await page.locator('.winner-card').count();
await page.click('button:has-text("Draw Winner")');
await page.waitForResponse(resp => resp.url().includes('/winners'));
const winnersCountAfter = await page.locator('.winner-card').count();
expect(winnersCountAfter).toBe(winnersCountBefore + 1);
```

#### Test Case 6.2: Draw Multiple Winners Sequentially

**Given**: Same as Test Case 6.1

**When**:
1. Click "Draw Winner" button
2. Wait for completion
3. Click "Draw Winner" button again
4. Wait for completion
5. Repeat 3 times total

**Expected**:
- 3 new winners created
- Each winner assigned different prize (or same prize if quantity > 1)
- Prize quantities updated correctly
- All winners displayed in order drawn
- Participants can win multiple times

**Playwright Selectors**:
```typescript
for (let i = 0; i < 3; i++) {
  await page.click('button:has-text("Draw Winner")');
  await page.waitForTimeout(500); // Wait for API
}
const winners = await page.locator('.winner-card').count();
expect(winners).toBeGreaterThanOrEqual(3);
```

#### Test Case 6.3: Draw Winner - No Eligible Participants

**Given**:
- Logged in as organizer
- Room has only ORGANIZER and VIEWER roles (no PARTICIPANT)

**When**: View room page

**Expected**:
- "Draw Winner" button is disabled
- Button text shows: "No eligible participants"
- Cannot click button

**Playwright Selectors**:
```typescript
const drawButton = page.locator('button:has-text("Draw Winner")');
await expect(drawButton).toBeDisabled();
await expect(page.locator('text=No eligible participants')).toBeVisible();
```

#### Test Case 6.4: Draw Winner - No Available Prizes

**Given**:
- Room has participants
- All prizes have quantity = 0

**When**: View room page

**Expected**:
- "Draw Winner" button is disabled
- Button text shows: "No prizes available"
- Cannot click button

**Playwright Selectors**:
```typescript
const drawButton = page.locator('button:has-text("Draw Winner")');
await expect(drawButton).toBeDisabled();
await expect(page.locator('text=No prizes available')).toBeVisible();
```

#### Test Case 6.5: Winner Data Persistence After Page Reload

**Given**:
- Winners have been drawn previously
- Winners exist in database

**When**:
1. Draw a winner
2. Note winner name and prize
3. Refresh the page (F5)

**Expected**:
- All previous winners still displayed
- Winner data matches before refresh
- Prize quantities still correct
- No duplicates created

**Playwright Selectors**:
```typescript
await page.click('button:has-text("Draw Winner")');
await page.waitForResponse(resp => resp.url().includes('/winners'));
const winnerText = await page.locator('.winner-card').first().textContent();
await page.reload();
await expect(page.locator('.winner-card').first()).toContainText(winnerText);
```

---

### TS-L-007: Delete Room

**Priority**: Medium
**Playwright Ready**: Yes

#### Test Case 7.1: Delete Room as Organizer

**Given**:
- Logged in as room organizer
- On room detail page

**When**:
1. Click "Delete" button
2. Confirm deletion in dialog

**Expected**:
- Redirected to home page (`/`)
- Room no longer appears in room list
- Room soft-deleted in database (deletedAt set)

**Playwright Selectors**:
```typescript
await page.click('button:has-text("Delete")');
page.on('dialog', dialog => dialog.accept());
await expect(page).toHaveURL('/');
await expect(page.locator('text=[Deleted Room Name]')).toBeHidden();
```

#### Test Case 7.2: Delete Room - Cancel Confirmation

**Given**: Logged in as organizer

**When**:
1. Click "Delete" button
2. Cancel in confirmation dialog

**Expected**:
- Dialog closes
- Stay on room page
- Room NOT deleted

**Playwright Selectors**:
```typescript
await page.click('button:has-text("Delete")');
page.on('dialog', dialog => dialog.dismiss());
await expect(page).toHaveURL(/\/room\//); // Still on room page
```

#### Test Case 7.3: Delete Button - Non-Organizer Cannot See

**Given**: Logged in as participant (not organizer)

**When**: Navigate to room page

**Expected**:
- "Delete" button NOT visible
- Only organizer can delete room

**Playwright Selectors**:
```typescript
// Login as bob@example.com (non-organizer)
await page.goto('http://localhost:5173/room/[roomId]');
await expect(page.locator('button:has-text("Delete")')).toBeHidden();
```

---

### TS-L-008: Winner Display

**Priority**: Medium
**Playwright Ready**: Yes

#### Test Case 8.1: Winners Section Displays Correctly

**Given**: Room has at least 1 winner

**When**: Navigate to room page

**Expected**:
- "Winners" section visible
- Each winner card shows:
  - Winner avatar (first letter of name)
  - Winner name
  - Prize name
  - "Won: [Prize Name]" text
- Winners displayed in chronological order (latest first)

**Playwright Selectors**:
```typescript
await expect(page.locator('text=Winners')).toBeVisible();
const winnerCard = page.locator('.winner-card').first();
await expect(winnerCard.locator('.avatar')).toBeVisible();
await expect(winnerCard.locator('text=/Won:/i')).toBeVisible();
```

#### Test Case 8.2: No Winners Yet

**Given**: Room has no winners

**When**: Navigate to room page

**Expected**:
- "Winners" section exists but shows empty state
- Message: "No winners yet" or similar
- No winner cards displayed

**Playwright Selectors**:
```typescript
const winnerCards = await page.locator('.winner-card').count();
expect(winnerCards).toBe(0);
```

#### Test Case 8.3: Winner Badge on Participant

**Given**: Participant has won a prize

**When**: View participants sidebar

**Expected**:
- Participant shows "Winner!" badge
- Badge has distinct styling (gold/yellow)
- Badge appears next to participant name

**Playwright Selectors**:
```typescript
const participant = page.locator('text=Bob Smith').locator('..');
await expect(participant.locator('text=Winner!')).toBeVisible();
```

---

### TS-L-009: Prize Display

**Priority**: Low
**Playwright Ready**: Yes

#### Test Case 9.1: Prize Cards Display Correctly

**Given**: Room has prizes

**When**: Navigate to room page

**Expected**:
- Each prize card shows:
  - Prize image (placeholder if no image)
  - Prize name
  - Prize description
  - Quantity remaining (e.g., "2 / 5 remaining")
- Grid layout (2 columns on desktop)

**Playwright Selectors**:
```typescript
const prizeCard = page.locator('.prize-card').first();
await expect(prizeCard.locator('img')).toBeVisible();
await expect(prizeCard.locator('.prize-name')).toBeVisible();
await expect(prizeCard.locator('text=/remaining/i')).toBeVisible();
```

#### Test Case 9.2: Prize Quantity Updates After Draw

**Given**: Prize has initial quantity

**When**:
1. Note prize quantity (e.g., "2 / 2 remaining")
2. Draw winner who gets that prize
3. Observe prize card

**Expected**:
- Quantity decreases (e.g., "1 / 2 remaining")
- Updates automatically without manual refresh
- Prize card still visible if quantity > 0

**Playwright Selectors**:
```typescript
const prizeQuantity = await page.locator('.prize-card:has-text("iPhone")').locator('text=/remaining/').textContent();
await page.click('button:has-text("Draw Winner")');
await page.waitForResponse(resp => resp.url().includes('/winners'));
const newQuantity = await page.locator('.prize-card:has-text("iPhone")').locator('text=/remaining/').textContent();
expect(newQuantity).not.toBe(prizeQuantity);
```

---

## Edge Cases & Error Scenarios

### TS-L-901: Network Errors

#### Test Case 901.1: API Timeout During Winner Draw

**Given**: Simulated slow network or API timeout

**When**: Click "Draw Winner"

**Expected**:
- Loading state shown ("Drawing...")
- After timeout, error message displayed
- Button re-enabled
- No partial data saved

**Playwright Selectors**:
```typescript
await page.route('**/winners', route => route.abort());
await page.click('button:has-text("Draw Winner")');
await expect(page.locator('text=/error|failed/i')).toBeVisible();
```

### TS-L-902: Concurrent Actions

#### Test Case 902.1: Multiple Organizers Drawing Simultaneously

**Given**:
- Two organizers logged in (different browsers)
- Both viewing same room

**When**: Both click "Draw Winner" at same time

**Expected**:
- Each draw creates separate winner
- No race condition errors
- Prize quantities updated correctly
- Both clients see both new winners

---

## Automation Setup Notes

### Playwright Test Organization

```typescript
// tests/lottery/auth.spec.ts
// tests/lottery/room-management.spec.ts
// tests/lottery/winner-draw.spec.ts
// tests/lottery/participants.spec.ts
```

### Test Data Strategy

- Use seeded database for predictable test data
- Reset database before each test suite
- Use unique test data identifiers (e.g., "Test Lottery [timestamp]")

### Key Selectors to Standardize

Add test IDs to components for reliable automation:

```tsx
// Recommended data-testid attributes
<button data-testid="draw-winner-btn">Draw Winner</button>
<button data-testid="join-room-btn">Join Lottery</button>
<button data-testid="create-room-btn">New Lottery</button>
<div data-testid="winner-card">...</div>
<div data-testid="prize-card">...</div>
```

### API Response Waiting

```typescript
// Wait for specific API calls
await page.waitForResponse(resp =>
  resp.url().includes('/api/v1/winners') && resp.status() === 200
);
```

---

## Test Execution Checklist

Before each test run:
- [ ] Start backend: `cd platform && pnpm dev`
- [ ] Start frontend: `pnpm --filter @event-platform/lottery dev`
- [ ] Reset database: `cd platform && pnpm db:reset`
- [ ] Verify seed data loaded

After test run:
- [ ] Check browser console for errors
- [ ] Verify database state
- [ ] Review network requests
- [ ] Screenshot any failures
