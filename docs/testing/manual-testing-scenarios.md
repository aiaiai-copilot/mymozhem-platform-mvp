# Manual Testing Scenarios - Event Platform

General testing scenarios for the event management platform core features. Structured for manual testing and future Playwright automation.

## Overview

This document covers platform-level testing scenarios that apply across all applications (lottery, quiz, etc.). For application-specific scenarios, see:
- `lottery-app-testing.md` - Holiday Lottery app
- `quiz-app-testing.md` - Quiz app (future)

---

## Test Environment Setup

### Prerequisites

```bash
# 1. Start PostgreSQL database
# Verify connection: postgresql://postgres:devpassword@localhost:5432/event_platform

# 2. Start backend platform
cd platform
pnpm dev
# Running at: http://localhost:3000

# 3. Start frontend application
pnpm --filter @event-platform/[app-name] dev
# Lottery: http://localhost:5173
# Quiz: http://localhost:5174 (future)

# 4. Seed test data (if needed)
cd platform
pnpm db:reset  # Full reset with seed
# OR
pnpm db:seed   # Seed only
```

### Test Users

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| alice@example.com | password123 | Organizer | Room creator, full permissions |
| bob@example.com | password123 | Participant | Regular participant |
| charlie@example.com | password123 | Participant | Secondary participant |
| diana@example.com | password123 | Viewer | Read-only viewer |

### Environment Variables

```env
# platform/.env
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/event_platform"
JWT_SECRET="dev-secret-key-change-in-production-please"
JWT_EXPIRES_IN="1h"
PORT=3000
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"
```

---

## Platform Core Testing

### TS-P-001: User Authentication (REST API)

**Priority**: Critical
**Playwright Ready**: Yes

#### Test Case 1.1: Password Login (POST /api/v1/auth/login)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "alice@example.com",
      "name": "Alice Johnson",
      "avatar": "https://i.pravatar.cc/150?img=1"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "..."
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.post('http://localhost:3000/api/v1/auth/login', {
  data: {
    email: 'alice@example.com',
    password: 'password123'
  }
});
expect(response.status()).toBe(200);
const body = await response.json();
expect(body.data.user.email).toBe('alice@example.com');
expect(body.data.accessToken).toBeTruthy();
```

#### Test Case 1.2: Login with Invalid Credentials

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.post('http://localhost:3000/api/v1/auth/login', {
  data: {
    email: 'alice@example.com',
    password: 'wrongpassword'
  }
});
expect(response.status()).toBe(401);
```

#### Test Case 1.3: Logout (POST /api/v1/auth/logout)

**Request**:
```bash
TOKEN="eyJhbGc..."  # From login response

curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Validation**:
- Refresh token invalidated in database
- Subsequent requests with same token should fail

**Playwright Test**:
```typescript
const loginResp = await page.request.post('http://localhost:3000/api/v1/auth/login', {
  data: { email: 'alice@example.com', password: 'password123' }
});
const { accessToken } = (await loginResp.json()).data;

const logoutResp = await page.request.post('http://localhost:3000/api/v1/auth/logout', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
expect(logoutResp.status()).toBe(200);
```

#### Test Case 1.4: Get Current User (GET /api/v1/auth/me)

**Request**:
```bash
TOKEN="eyJhbGc..."

curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "...",
    "email": "alice@example.com",
    "name": "Alice Johnson",
    "avatar": "https://i.pravatar.cc/150?img=1",
    "provider": "google",
    "emailVerified": "2025-01-01T00:00:00.000Z"
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.get('http://localhost:3000/api/v1/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
expect(response.status()).toBe(200);
const user = (await response.json()).data;
expect(user.email).toBe('alice@example.com');
```

---

### TS-P-002: Room Management (REST API)

**Priority**: Critical
**Playwright Ready**: Yes

#### Test Case 2.1: List Public Rooms (GET /api/v1/rooms)

**Request**:
```bash
curl http://localhost:3000/api/v1/rooms?isPublic=true&limit=10
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "...",
      "name": "New Year Lottery 2025",
      "description": "Win amazing prizes...",
      "status": "ACTIVE",
      "isPublic": true,
      "appId": "app_lottery_v1",
      "organizer": {
        "id": "...",
        "name": "Alice Johnson",
        "avatar": "..."
      },
      "_count": {
        "participants": 4,
        "prizes": 3,
        "winners": 1
      }
    }
  ]
}
```

**Playwright Test**:
```typescript
const response = await page.request.get('http://localhost:3000/api/v1/rooms?isPublic=true');
expect(response.status()).toBe(200);
const rooms = (await response.json()).data;
expect(rooms.length).toBeGreaterThan(0);
expect(rooms[0]).toHaveProperty('name');
expect(rooms[0]).toHaveProperty('status');
```

#### Test Case 2.2: Get Room by ID (GET /api/v1/rooms/:roomId)

**Request**:
```bash
ROOM_ID="..."

curl http://localhost:3000/api/v1/rooms/$ROOM_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "...",
    "name": "New Year Lottery 2025",
    "status": "ACTIVE",
    "participants": [...],
    "prizes": [...],
    "winners": [...]
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.get(`http://localhost:3000/api/v1/rooms/${roomId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
expect(response.status()).toBe(200);
const room = (await response.json()).data;
expect(room.participants).toBeDefined();
expect(room.prizes).toBeDefined();
```

#### Test Case 2.3: Create Room (POST /api/v1/rooms)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lottery 2026",
    "description": "Test room creation",
    "appId": "app_lottery_v1",
    "appSettings": {
      "ticketCount": 100,
      "drawDate": "2026-06-01T18:00:00Z"
    },
    "isPublic": true
  }'
```

**Expected Response** (201 Created):
```json
{
  "data": {
    "id": "...",
    "name": "Test Lottery 2026",
    "status": "DRAFT",
    "createdBy": "...",
    "organizer": { ... }
  }
}
```

**Validation**:
- Room status initially "DRAFT"
- Creator automatically added as ORGANIZER participant
- appSettings validated against app manifest schema

**Playwright Test**:
```typescript
const response = await page.request.post('http://localhost:3000/api/v1/rooms', {
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  data: {
    name: 'Test Lottery ' + Date.now(),
    appId: 'app_lottery_v1',
    appSettings: {
      ticketCount: 100,
      drawDate: '2026-06-01T18:00:00Z'
    },
    isPublic: true
  }
});
expect(response.status()).toBe(201);
const room = (await response.json()).data;
expect(room.status).toBe('DRAFT');
```

#### Test Case 2.4: Update Room Status (PATCH /api/v1/rooms/:roomId)

**Request**:
```bash
curl -X PATCH http://localhost:3000/api/v1/rooms/$ROOM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}'
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "...",
    "name": "Test Lottery 2026",
    "status": "ACTIVE"
  }
}
```

**Authorization**:
- Only room organizer can update status
- Non-organizers should get 403 Forbidden

**Playwright Test**:
```typescript
const response = await page.request.patch(`http://localhost:3000/api/v1/rooms/${roomId}`, {
  headers: { 'Authorization': `Bearer ${organizerToken}`, 'Content-Type': 'application/json' },
  data: { status: 'ACTIVE' }
});
expect(response.status()).toBe(200);
const room = (await response.json()).data;
expect(room.status).toBe('ACTIVE');
```

#### Test Case 2.5: Delete Room (DELETE /api/v1/rooms/:roomId)

**Request**:
```bash
curl -X DELETE http://localhost:3000/api/v1/rooms/$ROOM_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "message": "Room deleted successfully"
  }
}
```

**Validation**:
- Room soft-deleted (`deletedAt` timestamp set)
- Room no longer appears in public lists
- Can still be accessed by ID (for audit trail)

**Playwright Test**:
```typescript
const response = await page.request.delete(`http://localhost:3000/api/v1/rooms/${roomId}`, {
  headers: { 'Authorization': `Bearer ${organizerToken}` }
});
expect(response.status()).toBe(200);

// Verify room no longer in public list
const listResp = await page.request.get('http://localhost:3000/api/v1/rooms?isPublic=true');
const rooms = (await listResp.json()).data;
expect(rooms.find(r => r.id === roomId)).toBeUndefined();
```

---

### TS-P-003: Participant Management

**Priority**: High
**Playwright Ready**: Yes

#### Test Case 3.1: Join Room (POST /api/v1/rooms/:roomId/participants)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/rooms/$ROOM_ID/participants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "PARTICIPANT",
    "metadata": {
      "ticketNumber": 42
    }
  }'
```

**Expected Response** (201 Created):
```json
{
  "data": {
    "id": "...",
    "userId": "...",
    "roomId": "...",
    "role": "PARTICIPANT",
    "metadata": {
      "ticketNumber": 42
    },
    "user": {
      "name": "Bob Smith",
      "avatar": "..."
    }
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.post(`http://localhost:3000/api/v1/rooms/${roomId}/participants`, {
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  data: { role: 'PARTICIPANT' }
});
expect(response.status()).toBe(201);
```

#### Test Case 3.2: List Room Participants (GET /api/v1/rooms/:roomId/participants)

**Request**:
```bash
curl http://localhost:3000/api/v1/rooms/$ROOM_ID/participants \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "...",
      "role": "ORGANIZER",
      "user": {
        "id": "...",
        "name": "Alice Johnson",
        "avatar": "..."
      }
    },
    {
      "id": "...",
      "role": "PARTICIPANT",
      "user": {
        "name": "Bob Smith"
      }
    }
  ]
}
```

**Playwright Test**:
```typescript
const response = await page.request.get(`http://localhost:3000/api/v1/rooms/${roomId}/participants`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
expect(response.status()).toBe(200);
const participants = (await response.json()).data;
expect(participants.length).toBeGreaterThan(0);
```

---

### TS-P-004: Prize Management

**Priority**: High
**Playwright Ready**: Yes

#### Test Case 4.1: Add Prize (POST /api/v1/rooms/:roomId/prizes)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/rooms/$ROOM_ID/prizes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grand Prize - iPhone 15",
    "description": "Latest iPhone 15 Pro 256GB",
    "quantity": 1,
    "imageUrl": "https://picsum.photos/400/300"
  }'
```

**Expected Response** (201 Created):
```json
{
  "data": {
    "id": "...",
    "roomId": "...",
    "name": "Grand Prize - iPhone 15",
    "quantity": 1,
    "quantityRemaining": 1
  }
}
```

**Authorization**:
- Only room organizer can add prizes

**Playwright Test**:
```typescript
const response = await page.request.post(`http://localhost:3000/api/v1/rooms/${roomId}/prizes`, {
  headers: { 'Authorization': `Bearer ${organizerToken}`, 'Content-Type': 'application/json' },
  data: {
    name: 'Test Prize ' + Date.now(),
    quantity: 1
  }
});
expect(response.status()).toBe(201);
const prize = (await response.json()).data;
expect(prize.quantityRemaining).toBe(1);
```

#### Test Case 4.2: List Prizes (GET /api/v1/rooms/:roomId/prizes)

**Request**:
```bash
curl http://localhost:3000/api/v1/rooms/$ROOM_ID/prizes \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "...",
      "name": "Grand Prize - iPhone 15",
      "quantity": 1,
      "quantityRemaining": 0
    }
  ]
}
```

**Playwright Test**:
```typescript
const response = await page.request.get(`http://localhost:3000/api/v1/rooms/${roomId}/prizes`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
expect(response.status()).toBe(200);
```

---

### TS-P-005: Winner Selection

**Priority**: Critical
**Playwright Ready**: Yes

#### Test Case 5.1: Select Winner (POST /api/v1/rooms/:roomId/winners)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/rooms/$ROOM_ID/winners \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participantId": "...",
    "prizeId": "...",
    "metadata": {
      "algorithm": "random",
      "drawnAt": "2026-01-01T12:00:00Z"
    }
  }'
```

**Expected Response** (201 Created):
```json
{
  "data": {
    "id": "...",
    "roomId": "...",
    "participantId": "...",
    "prizeId": "...",
    "participant": {
      "user": {
        "name": "Bob Smith"
      }
    },
    "prize": {
      "name": "Grand Prize - iPhone 15"
    }
  }
}
```

**Side Effects**:
- Prize `quantityRemaining` decreases by 1
- Winner record created in database

**Playwright Test**:
```typescript
const response = await page.request.post(`http://localhost:3000/api/v1/rooms/${roomId}/winners`, {
  headers: { 'Authorization': `Bearer ${organizerToken}`, 'Content-Type': 'application/json' },
  data: {
    participantId: participantId,
    prizeId: prizeId,
    metadata: { algorithm: 'random' }
  }
});
expect(response.status()).toBe(201);
```

#### Test Case 5.2: List Winners (GET /api/v1/rooms/:roomId/winners)

**Request**:
```bash
curl http://localhost:3000/api/v1/rooms/$ROOM_ID/winners \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "...",
      "participant": {
        "user": {
          "name": "Bob Smith",
          "avatar": "..."
        }
      },
      "prize": {
        "name": "Grand Prize - iPhone 15"
      },
      "createdAt": "2026-01-01T12:00:00Z"
    }
  ]
}
```

**Playwright Test**:
```typescript
const response = await page.request.get(`http://localhost:3000/api/v1/rooms/${roomId}/winners`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
expect(response.status()).toBe(200);
const winners = (await response.json()).data;
expect(winners.length).toBeGreaterThanOrEqual(0);
```

---

### TS-P-006: Error Handling

**Priority**: High
**Playwright Ready**: Yes

#### Test Case 6.1: Unauthenticated Request (401)

**Request**:
```bash
# No Authorization header
curl http://localhost:3000/api/v1/rooms
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.get('http://localhost:3000/api/v1/rooms');
expect(response.status()).toBe(401);
```

#### Test Case 6.2: Invalid Token (401)

**Request**:
```bash
curl http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer invalid-token-here"
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired token"
  }
}
```

#### Test Case 6.3: Permission Denied (403)

**Request**:
```bash
# Try to delete room as non-organizer
curl -X DELETE http://localhost:3000/api/v1/rooms/$ROOM_ID \
  -H "Authorization: Bearer $NON_ORGANIZER_TOKEN"
```

**Expected Response** (403 Forbidden):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only room organizer can delete room"
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.delete(`http://localhost:3000/api/v1/rooms/${roomId}`, {
  headers: { 'Authorization': `Bearer ${participantToken}` }
});
expect(response.status()).toBe(403);
```

#### Test Case 6.4: Resource Not Found (404)

**Request**:
```bash
curl http://localhost:3000/api/v1/rooms/non-existent-id \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (404 Not Found):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Room not found"
  }
}
```

#### Test Case 6.5: Validation Error (400)

**Request**:
```bash
# Missing required field
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "app_lottery_v1"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

**Playwright Test**:
```typescript
const response = await page.request.post('http://localhost:3000/api/v1/rooms', {
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  data: { appId: 'app_lottery_v1' } // Missing name
});
expect(response.status()).toBe(400);
const error = (await response.json()).error;
expect(error.code).toBe('VALIDATION_ERROR');
```

---

### TS-P-007: CORS & Security

**Priority**: Medium
**Playwright Ready**: Partial

#### Test Case 7.1: CORS Headers Present

**Request**:
```bash
curl -I http://localhost:3000/api/v1/rooms \
  -H "Origin: http://localhost:5173"
```

**Expected Headers**:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

#### Test Case 7.2: CORS Preflight (OPTIONS)

**Request**:
```bash
curl -X OPTIONS http://localhost:3000/api/v1/rooms \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

**Expected Response** (204 No Content):
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Database State Validation

### TS-P-100: Database Integrity

#### Test Case 100.1: Soft Delete Verification

**Action**: Delete a room via API

**Database Check**:
```sql
SELECT id, name, "deletedAt" FROM "Room" WHERE id = '[roomId]';
```

**Expected**:
- `deletedAt` is NOT NULL
- Record still exists in database
- Room excluded from public queries

#### Test Case 100.2: Foreign Key Constraints

**Action**: Try to delete a user who has participants

**Expected**:
- Database constraint prevents deletion
- API returns appropriate error
- Data integrity maintained

---

## Performance Testing

### TS-P-200: Response Time Benchmarks

#### Test Case 200.1: Room List Performance

**Request**: GET /api/v1/rooms (50 rooms)

**Expected**:
- Response time < 200ms
- No N+1 query problems
- Single database query with joins

#### Test Case 200.2: Winner Draw Performance

**Request**: POST /api/v1/rooms/:roomId/winners

**Expected**:
- Response time < 500ms
- Atomic transaction (winner + prize update)
- No race conditions

---

## Automation Implementation Guide

### Playwright Project Structure

```
tests/
├── platform/
│   ├── auth.spec.ts           # TS-P-001
│   ├── rooms.spec.ts          # TS-P-002
│   ├── participants.spec.ts   # TS-P-003
│   ├── prizes.spec.ts         # TS-P-004
│   ├── winners.spec.ts        # TS-P-005
│   ├── errors.spec.ts         # TS-P-006
│   └── security.spec.ts       # TS-P-007
├── lottery/
│   └── (see lottery-app-testing.md)
└── helpers/
    ├── auth.ts                # Login helpers
    ├── fixtures.ts            # Test data creation
    └── database.ts            # DB reset utilities
```

### Common Test Helpers

```typescript
// tests/helpers/auth.ts
export async function loginAsUser(page: Page, email: string) {
  const response = await page.request.post('http://localhost:3000/api/v1/auth/login', {
    data: { email, password: 'password123' }
  });
  const { accessToken } = (await response.json()).data;
  return accessToken;
}

// tests/helpers/fixtures.ts
export async function createTestRoom(token: string) {
  const response = await page.request.post('http://localhost:3000/api/v1/rooms', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      name: `Test Room ${Date.now()}`,
      appId: 'app_lottery_v1',
      appSettings: { ticketCount: 100, drawDate: '2026-12-31T23:00:00Z' }
    }
  });
  return (await response.json()).data;
}
```

### Test Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  workers: 4,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'platform-api',
      testMatch: 'tests/platform/**/*.spec.ts',
    },
    {
      name: 'lottery-app',
      testMatch: 'tests/lottery/**/*.spec.ts',
      use: {
        baseURL: 'http://localhost:5173',
      },
    },
  ],

  globalSetup: './tests/global-setup.ts',  // Reset DB before all tests
  globalTeardown: './tests/global-teardown.ts',
});
```

---

## Test Execution

### Manual Testing

```bash
# 1. Start services
pnpm dev

# 2. Run manual tests using curl/HTTPie/Bruno

# 3. Verify in database
cd platform
npx prisma studio
```

### Automated Testing (Future)

```bash
# Install Playwright
pnpm add -D @playwright/test

# Run all tests
pnpm test:e2e

# Run specific suite
pnpm test:e2e platform

# Run with UI
pnpm test:e2e --ui

# Debug mode
pnpm test:e2e --debug
```

---

## Test Coverage Goals

- [ ] **Authentication**: 100% (all endpoints)
- [ ] **Room CRUD**: 100% (create, read, update, delete)
- [ ] **Participant Management**: 90%
- [ ] **Prize Management**: 90%
- [ ] **Winner Selection**: 100% (critical path)
- [ ] **Error Scenarios**: 80%
- [ ] **Security**: 100% (auth, CORS, permissions)

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/e2e-tests.yml
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
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        run: cd platform && pnpm prisma migrate deploy

      - name: Seed database
        run: cd platform && pnpm db:seed

      - name: Build packages
        run: pnpm build

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Connection refused"
**Solution**: Verify backend running on port 3000

**Issue**: Database seed fails
**Solution**: Run `pnpm db:reset` to clear and reseed

**Issue**: Token expired during tests
**Solution**: Generate fresh token or increase JWT_EXPIRES_IN

**Issue**: CORS errors in browser tests
**Solution**: Verify CORS_ORIGIN includes test frontend URL

---

## Additional Resources

- **API Documentation**: `/docs/api/rest-endpoints.md`
- **OpenAPI Spec**: `/docs/openapi.yaml`
- **Lottery App Tests**: `/docs/testing/lottery-app-testing.md`
- **Playwright Docs**: https://playwright.dev
