# E2E Tests - Event Platform

Automated end-to-end tests for the Event Platform using Playwright.

## Test Structure

```
tests/
├── platform/          # Platform API tests
│   └── auth.spec.ts   # Authentication API tests
├── lottery/           # Lottery app UI tests
│   ├── auth.spec.ts            # User authentication flow
│   ├── room-management.spec.ts # Room list and creation
│   ├── room-status.spec.ts     # Room status transitions
│   ├── room-actions.spec.ts    # Participant & delete
│   └── winner-draw.spec.ts     # Winner selection
├── helpers/           # Shared utilities
│   ├── auth.ts        # Login/logout helpers
│   └── fixtures.ts    # Test data creation
├── global-setup.ts    # Database reset before tests
└── README.md          # This file
```

## Test Scenarios Implemented

### Platform API Tests (TS-P-001)
- ✅ Password login (success)
- ✅ Login with invalid credentials
- ✅ Logout
- ✅ Get current user
- ✅ Unauthorized access
- ✅ Invalid token

### Lottery App UI Tests

**TS-L-001: Authentication Flow**
- ✅ Successful login
- ✅ Failed login with invalid credentials
- ✅ Logout
- ✅ Auth state persistence after login
- ✅ Redirect to login when accessing protected route
- ✅ Multiple users in different sessions

**TS-L-002 & TS-L-003: Room Management**
- ✅ View public rooms
- ✅ Click on room card
- ✅ Create room with valid data
- ✅ Create room validation errors
- ✅ Form pre-filled with defaults

**TS-L-004: Room Status Management**
- ✅ Change status DRAFT → ACTIVE
- ✅ Change status ACTIVE → COMPLETED
- ✅ Non-organizer cannot see status buttons
- ✅ Cancel status change confirmation

**TS-L-005 & TS-L-007: Room Actions**
- ✅ Join room as participant
- ✅ Cannot join DRAFT room
- ✅ Participants list shows roles
- ✅ Delete room as organizer
- ✅ Cancel delete confirmation
- ✅ Non-organizer cannot see delete button
- ✅ Winners section displays correctly
- ✅ Winner badge on participant
- ✅ Prize cards display correctly

**TS-L-006: Winner Draw (Critical)**
- ✅ Draw single winner (happy path)
- ✅ Draw multiple winners sequentially
- ✅ Draw winner - no eligible participants
- ✅ Draw winner - no available prizes
- ✅ Winner data persistence after page reload
- ✅ Prize quantity decreases after draw
- ✅ Only organizer can draw winners

## Prerequisites

1. **Database**: PostgreSQL running with seeded test data
2. **Backend**: Platform API running on `http://localhost:3000`
3. **Frontend**: Lottery app running on `http://localhost:5173`
4. **Browsers**: Playwright browsers installed

## Setup

### 1. Install Dependencies

```bash
# Install Playwright (already done if you're reading this)
pnpm add -D @playwright/test -w

# Install browsers
pnpm exec playwright install chromium
```

### 2. Start Services

Before running tests, start the platform backend and frontend:

```bash
# Terminal 1: Start backend in TEST mode (disables rate limiting)
cd platform
pnpm dev:test

# Terminal 2: Start frontend
pnpm --filter @event-platform/lottery dev

# Note: Use 'pnpm dev:test' instead of 'pnpm dev' to disable rate limiting during tests
```

### 3. Ensure Database is Seeded

Tests rely on seeded data. The global setup will reset the database automatically, but you can manually reset:

```bash
cd platform
pnpm db:reset
```

## Running Tests

### Run All Tests

```bash
pnpm test:e2e
```

### Run Specific Test Suite

```bash
# Platform API tests only
pnpm test:e2e:platform

# Lottery app UI tests only
pnpm test:e2e:lottery
```

### Run Specific Test File

```bash
# Authentication tests
pnpm test:e2e tests/lottery/auth.spec.ts

# Winner draw tests
pnpm test:e2e tests/lottery/winner-draw.spec.ts
```

### Interactive Mode

```bash
# Open Playwright UI (recommended for development)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug
```

### View Test Report

```bash
pnpm test:e2e:report
```

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Workers**: 4 parallel workers locally, 1 in CI
- **Projects**: `platform-api` and `lottery-app`
- **Reports**: HTML report in `playwright-report/`

## Test Data

Tests use these seeded users:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| alice@example.com | password123 | Organizer | Room creator |
| bob@example.com | password123 | Participant | Regular participant |
| charlie@example.com | password123 | Participant | Secondary participant |
| diana@example.com | password123 | Viewer | Read-only viewer |

Seeded room: **"New Year Lottery 2025"**
- Organizer: Alice
- Participants: Bob, Charlie, Diana
- Prizes: iPhone, AirPods, Gift Cards
- Status: ACTIVE

## Writing New Tests

### Example: Create a New Test File

```typescript
import { test, expect } from '@playwright/test';
import { loginViaUI } from '../helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, 'alice');
  });

  test('should do something', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.locator('text=Something')).toBeVisible();
  });
});
```

### Using Helpers

```typescript
import { loginAsUser, loginViaUI } from '../helpers/auth';
import { createTestRoom, createPrize, joinRoom } from '../helpers/fixtures';

// Login via API (for setup)
const token = await loginAsUser(request, 'alice');

// Login via UI (for browser tests)
await loginViaUI(page, 'alice');

// Create test data
const room = await createTestRoom(request, token);
const prize = await createPrize(request, token, room.id);
```

## Debugging Tests

### 1. Run in Headed Mode

```bash
pnpm test:e2e:headed
```

### 2. Use Debug Mode

```bash
pnpm test:e2e:debug
```

### 3. Use Playwright Inspector

```bash
# Add this to your test:
await page.pause();
```

### 4. Check Screenshots

Failed tests automatically capture screenshots in `test-results/`

### 5. View Trace

```bash
# Generate trace on failure
pnpm test:e2e --trace on

# View trace
pnpm exec playwright show-trace trace.zip
```

## Common Issues

### Tests Fail with "Connection Refused"

**Solution**: Ensure backend and frontend are running:
```bash
# Check if services are running
netstat -ano | findstr :3000  # Backend
netstat -ano | findstr :5173  # Frontend
```

### Database State Issues

**Solution**: Reset database before tests:
```bash
cd platform
pnpm db:reset
```

### Token Expired Errors

**Solution**: Tests automatically get fresh tokens. If issues persist, check JWT_EXPIRES_IN in `.env`

## CI/CD Integration

Tests are ready for CI/CD. Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: devpassword
          POSTGRES_DB: event_platform

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: cd platform && pnpm prisma migrate deploy
      - run: cd platform && pnpm db:seed
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
```

## Test Coverage

Current coverage:
- ✅ Authentication: 6 tests
- ✅ Room Management: 5 tests
- ✅ Room Status: 4 tests
- ✅ Room Actions: 8 tests
- ✅ Winner Draw: 7 tests
- ✅ Platform API: 6 tests

**Total: 36 automated tests**

## Documentation

For detailed test scenarios and expected behaviors, see:
- `docs/testing/lottery-app-testing.md` - Lottery app test scenarios
- `docs/testing/manual-testing-scenarios.md` - Platform API test scenarios

## Support

If tests fail unexpectedly:
1. Check that all services are running
2. Reset database: `cd platform && pnpm db:reset`
3. Verify environment variables in `platform/.env`
4. Check Playwright version: `pnpm exec playwright --version`
5. View detailed logs: `pnpm test:e2e --reporter=list`
