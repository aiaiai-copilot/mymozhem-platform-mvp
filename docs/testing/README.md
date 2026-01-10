# Testing Documentation

End-to-end testing guide for the Event Platform.

## Overview

The platform uses **Playwright** for E2E testing with tests colocated alongside their respective apps.

**Test Count:** 76 tests total
- Platform API: 6 tests
- Lottery App: 38 tests
- Quiz App: 32 tests

## Quick Start

### 1. Start All Services

```bash
# Terminal 1: Platform backend (test mode)
cd platform && pnpm dev:test

# Terminal 2: Lottery app
pnpm --filter @event-platform/lottery dev

# Terminal 3: Quiz app
pnpm --filter @event-platform/quiz dev
```

### 2. Run Tests

```bash
# Run all tests
pnpm test:e2e

# Run specific project
pnpm test:e2e --project=platform-api
pnpm test:e2e --project=lottery-app
pnpm test:e2e --project=quiz-app

# Run specific test file
pnpm test:e2e apps/quiz/tests/quiz-gameplay.spec.ts

# Run with UI mode (interactive)
pnpm test:e2e --ui

# Run headed (see browser)
pnpm test:e2e --headed
```

## Test Structure

```
project-root/
├── platform/tests/           # Platform API tests
│   └── auth.spec.ts
├── apps/
│   ├── lottery/tests/        # Lottery app tests
│   │   ├── auth.spec.ts
│   │   ├── room-actions.spec.ts
│   │   ├── room-management.spec.ts
│   │   ├── room-status.spec.ts
│   │   ├── websocket-events.spec.ts
│   │   └── winner-draw.spec.ts
│   └── quiz/tests/           # Quiz app tests
│       ├── auth.spec.ts
│       ├── quiz-flow.spec.ts
│       ├── quiz-gameplay.spec.ts
│       └── websocket-events.spec.ts
├── tests/
│   ├── helpers/              # Shared utilities
│   │   ├── config.ts         # URLs and endpoints
│   │   ├── auth.ts           # Login helpers
│   │   ├── fixtures.ts       # Lottery fixtures
│   │   └── quiz-fixtures.ts  # Quiz fixtures
│   └── global-setup.ts       # Pre-test setup
└── playwright.config.ts      # Playwright configuration
```

## Test Projects

| Project | Port | Tests | Description |
|---------|------|-------|-------------|
| `platform-api` | 3000 | 6 | REST API authentication |
| `lottery-app` | 5173 | 38 | Lottery UI + WebSocket |
| `quiz-app` | 5174 | 32 | Quiz UI + WebSocket |

## Test Users

Seeded test users (password: `password123`):

| User | Email | Typical Role |
|------|-------|--------------|
| Alice | alice@example.com | Organizer |
| Bob | bob@example.com | Participant |
| Charlie | charlie@example.com | Participant |
| Diana | diana@example.com | Viewer |

## Shared Helpers

### Authentication

```typescript
import { loginAsUser, loginViaUI, TEST_USERS } from '../../../tests/helpers/auth';

// API login (returns token)
const token = await loginAsUser(request, 'alice');

// UI login (navigates browser)
await loginViaUI(page, 'alice');
```

### Configuration

```typescript
import { TEST_CONFIG } from '../../../tests/helpers/config';

// TEST_CONFIG.platformUrl = 'http://localhost:3000'
// TEST_CONFIG.lotteryUrl = 'http://localhost:5173'
// TEST_CONFIG.quizUrl = 'http://localhost:5174'
```

### Quiz Fixtures

```typescript
import { createQuizRoom, createQuizPrize } from '../../../tests/helpers/quiz-fixtures';

// Create quiz with questions
const room = await createQuizRoom(request, token, 'My Quiz', [
  { text: 'Question 1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 }
]);
```

## Documentation

| Document | Description |
|----------|-------------|
| [E2E Patterns](./e2e-patterns.md) | Reliable test patterns for WebSocket apps |
| [Lottery Testing](./lottery-app-testing.md) | Lottery test scenarios |
| [Quiz Testing](./quiz-app-testing.md) | Quiz test scenarios |
| [Manual Testing](./manual-testing-scenarios.md) | Manual test checklist |

## Configuration

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: '.',
  testMatch: [
    'platform/tests/**/*.spec.ts',
    'apps/*/tests/**/*.spec.ts',
  ],
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  // ...
});
```

### Environment Variables

```bash
# Override default URLs
PLATFORM_URL=http://localhost:3000
LOTTERY_URL=http://localhost:5173
QUIZ_URL=http://localhost:5174
```

## Reports

After running tests:

```bash
# Open HTML report
npx playwright show-report

# Report location
playwright-report/index.html
```

## Troubleshooting

### Tests Timeout

1. Ensure all servers are running
2. Check correct ports (3000, 5173, 5174)
3. Verify database is seeded: `cd platform && pnpm db:seed`

### WebSocket Tests Flaky

See [E2E Patterns](./e2e-patterns.md) for reliable patterns:
- Use `waitForResponse()` after button clicks
- Use `waitForLoadState('networkidle')` for page loads
- Add 1500ms wait after WebSocket-triggering actions

### CORS Errors in Tests

Ensure `platform/.env` includes test app origins:
```
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"
```

### Database State Issues

Reset to clean state:
```bash
cd platform && pnpm db:reset && pnpm db:seed
```
