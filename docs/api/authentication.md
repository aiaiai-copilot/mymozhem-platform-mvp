# Authentication & Authorization

## Overview

The platform uses a dual authentication model:
- **User Authentication** - OAuth 2.0 (Google) for end users with JWT access tokens
- **Application Authentication** - API Key + JWT for applications

## User Authentication

### Token Architecture

**Access Token (JWT):**
- **Type:** Self-contained JWT (not stored in database)
- **Validation:** Signature verification only (no DB lookup)
- **Expiry:** 1 hour
- **Storage:** Client-side (memory or secure storage)
- **Revocation:** Via blacklist table (only when needed)

**Refresh Token:**
- **Type:** Opaque random token (stored in database)
- **Validation:** Database lookup required
- **Expiry:** 30 days
- **Storage:** Database Session table
- **Rotation:** New token issued on each refresh

### OAuth Flow (Google)

1. User initiates login via application frontend
2. Application redirects to Platform OAuth endpoint
3. User authenticates with Google
4. Platform creates/updates User record
5. Platform generates JWT access token (NOT stored) and refresh token (stored in Session table)
6. Application stores both tokens for API calls

### Endpoints

#### Initiate OAuth Login
```http
GET /api/v1/auth/google
```

**Response:** Redirects to Google OAuth consent screen

#### OAuth Callback
```http
GET /api/v1/auth/google/callback?code={code}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://..."
    }
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "current_refresh_token"
}
```

**Process:**
1. Extract user ID from access token JWT
2. Add access token hash to blacklist (immediate revocation)
3. Delete session by refresh token
4. Return success

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

**Note:** Access token is immediately revoked via blacklist, preventing further API calls even before natural expiry.

---

## Authentication Flow Details

### API Request Validation (Fast Path)

When a user makes an API request with access token:

1. **Extract JWT** from `Authorization: Bearer {token}` header
2. **Verify signature** using JWT secret (< 0.1ms, no DB)
3. **Check expiration** from JWT payload
4. **Extract user ID** from JWT payload
5. **Proceed with request** (no database lookup needed)

**Performance:** ~0.1ms per request (signature verification only)

### Logout Flow (Blacklist Write)

When user logs out:

1. **Hash access token** using SHA-256
2. **Write to blacklist** table with expiry matching token expiry
3. **Delete session** record by refresh token
4. **Return success**

**Performance:** ~5ms (two DB writes)

### Token Refresh Flow (Session Validation)

When access token expires:

1. **Client sends** refresh token to `/api/v1/auth/refresh`
2. **Platform validates** refresh token in Session table (~1ms DB read)
3. **Generate new** JWT access token (not stored)
4. **Rotate refresh token** (optional, recommended)
5. **Update session** lastUsedAt timestamp
6. **Return new tokens**

**Performance:** ~2ms (DB read + write)

### Revocation Check (When Needed)

Only perform blacklist check in specific scenarios:
- **High-security endpoints** (e.g., payment, admin actions)
- **User explicitly logs out** (token added to blacklist)
- **Admin revokes user access** (manual revocation)

```typescript
// Fast path (99% of requests)
const payload = jwt.verify(token, JWT_SECRET);
// No DB lookup - proceed immediately

// Secure path (1% of requests - high-security endpoints)
const payload = jwt.verify(token, JWT_SECRET);
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const isBlacklisted = await db.tokenBlacklist.findUnique({ where: { tokenHash } });
if (isBlacklisted) throw new Error('Token revoked');
```

### Performance Comparison

| Scenario | Database Queries | Response Time |
|----------|-----------------|---------------|
| **Old Design** (token in DB) | 1 query per request | ~1-2ms |
| **New Design** (JWT validation) | 0 queries per request | ~0.1ms |
| **New Design** (with blacklist check) | 1 query per request | ~1-2ms |
| **Token refresh** | 2 queries (read + write) | ~2ms |
| **Logout** | 2 queries (write + delete) | ~5ms |

**Result:** 99% of API requests have no database overhead for authentication.

---

## Application Authentication

### Registration Flow

1. Admin registers application via Platform API
2. Platform generates `appId` and `appSecret`
3. Application stores credentials securely
4. Application uses credentials to obtain access tokens

### Endpoints

#### Register Application (Admin Only)
```http
POST /api/v1/apps
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "manifest": {
    "meta": {
      "name": "Holiday Lottery",
      "version": "1.0.0",
      "description": "Application for conducting lotteries"
    },
    "baseUrl": "https://lottery.example.com",
    "capabilities": ["winnerSelection"],
    "permissions": [
      "users:read",
      "rooms:read",
      "rooms:write",
      "participants:read",
      "participants:write",
      "prizes:read",
      "prizes:write",
      "realtime:subscribe"
    ],
    "settings": {
      "type": "object",
      "properties": {
        "ticketCount": {
          "type": "integer",
          "minimum": 1
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "appId": "app_lottery_v1",
    "appSecret": "sk_live_abc123def456...",
    "manifest": { /* ... */ },
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### Get Application Token
```http
POST /api/v1/apps/token
Content-Type: application/json

{
  "appId": "app_lottery_v1",
  "appSecret": "sk_live_abc123def456..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

---

## Authorization Model

### Roles

| Role | Scope | Description |
|------|-------|-------------|
| `admin` | Platform | Platform administrator |
| `organizer` | Room | Room creator/owner |
| `moderator` | Room | Organizer's assistant |
| `participant` | Room | Event participant |
| `viewer` | Room | Observer without participation |

### Permissions

#### User Permissions (per room)
- `room:read` - View room details
- `room:write` - Modify room settings (organizer only)
- `room:delete` - Delete room (organizer only)
- `participant:read` - View participants
- `participant:write` - Add/remove participants (organizer/moderator)
- `participant:join` - Join as participant
- `prize:read` - View prizes
- `prize:write` - Add/modify prizes (organizer/moderator)
- `winner:read` - View winners
- `winner:write` - Select winners (organizer/moderator)

#### Application Permissions (manifest-declared)
- `users:read` - Read user profiles
- `rooms:read` - Read room data
- `rooms:write` - Create/modify rooms
- `participants:read` - Read participant list
- `participants:write` - Add/remove participants
- `prizes:read` - Read prize data
- `prizes:write` - Create/modify prizes
- `winners:read` - Read winner data
- `winners:write` - Select winners
- `realtime:subscribe` - Subscribe to WebSocket events
- `realtime:publish` - Publish custom events

### Permission Checks

API endpoints validate:
1. **User authentication** - Valid user token
2. **Application authentication** - Valid app token (for delegated operations)
3. **User role** - User has required role in room
4. **Application permissions** - App manifest includes required permission

### Headers

**User requests:**
```http
Authorization: Bearer {userAccessToken}
```

**Application requests (on behalf of user):**
```http
Authorization: Bearer {userAccessToken}
X-App-Token: {appAccessToken}
X-App-Id: app_lottery_v1
```

**Application requests (system operations):**
```http
Authorization: Bearer {appAccessToken}
X-App-Id: app_lottery_v1
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": {
      "required": "rooms:write",
      "granted": ["rooms:read"]
    }
  }
}
```

### 403 App Permission Denied
```json
{
  "error": {
    "code": "APP_PERMISSION_DENIED",
    "message": "Application lacks required permission",
    "details": {
      "appId": "app_lottery_v1",
      "required": "prizes:write",
      "granted": ["prizes:read", "rooms:read"]
    }
  }
}
```

---

## Security Best Practices

1. **Token Storage**
   - Store `appSecret` in environment variables (never in code)
   - Use secure storage for user tokens (httpOnly cookies or secure storage)

2. **Token Expiration**
   - User access tokens: 1 hour
   - User refresh tokens: 30 days
   - App tokens: 1 hour

3. **HTTPS Only**
   - All API calls must use HTTPS in production

4. **Rate Limiting**
   - User endpoints: 100 requests/minute
   - App endpoints: 1000 requests/minute

5. **CORS**
   - Configure allowed origins in app manifest
   - Validate `Origin` header on requests

---

## Database Maintenance

### Automatic Cleanup Tasks

**Daily cleanup job (recommended):**

```typescript
// Remove expired blacklist entries
await prisma.tokenBlacklist.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),
    },
  },
});

// Remove expired sessions
await prisma.session.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),
    },
  },
});
```

**Weekly cleanup job:**

```typescript
// Remove stale sessions (not used in 90 days)
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

await prisma.session.deleteMany({
  where: {
    lastUsedAt: {
      lt: ninetyDaysAgo,
    },
  },
});
```

### Migration to Redis (High Traffic)

For platforms with > 100K users:

1. **Keep PostgreSQL** for refresh tokens (Session table)
2. **Migrate blacklist** to Redis with TTL
3. **Use Redis** for fast blacklist lookups

```typescript
// Redis blacklist check (sub-millisecond)
const isBlacklisted = await redis.exists(`blacklist:${tokenHash}`);

// Add to Redis with automatic expiry
await redis.setex(`blacklist:${tokenHash}`, 3600, userId);
```

### Session Management Features

**View active sessions:**
```typescript
// Get user's active sessions with metadata
const sessions = await prisma.session.findMany({
  where: {
    userId: 'usr_123',
    expiresAt: { gt: new Date() },
  },
  orderBy: { lastUsedAt: 'desc' },
  select: {
    id: true,
    deviceInfo: true,
    ipAddress: true,
    createdAt: true,
    lastUsedAt: true,
  },
});
```

**Revoke specific session:**
```typescript
// User can terminate a specific device session
await prisma.session.delete({
  where: { id: 'session_id' },
});
```

**Force logout all devices:**
```typescript
// Revoke all user sessions (e.g., password change)
await prisma.session.deleteMany({
  where: { userId: 'usr_123' },
});
```

---

## Security Considerations

### Token Hash Storage

Always hash tokens before storing in blacklist:

```typescript
import crypto from 'crypto';

// CORRECT: Store hash of token
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
await prisma.tokenBlacklist.create({
  data: { tokenHash, userId, expiresAt, reason: 'logout' },
});

// WRONG: Never store raw token
await prisma.tokenBlacklist.create({
  data: { tokenHash: token, ... }, // SECURITY RISK
});
```

### JWT Secret Management

- **Development:** Store in `.env` file
- **Production:** Use secure secret manager (AWS Secrets Manager, HashiCorp Vault)
- **Rotation:** Implement JWT secret rotation strategy
- **Length:** Minimum 256 bits (32 bytes)

### Blacklist Growth

Expected blacklist table growth:

| Users | Daily Logouts | Entries/Day | 30-Day Total |
|-------|---------------|-------------|--------------|
| 1K    | 100           | 100         | 3K           |
| 10K   | 1K            | 1K          | 30K          |
| 100K  | 10K           | 10K         | 300K         |
| 1M    | 100K          | 100K        | 3M           |

**Mitigation:**
- Daily cleanup removes expired entries
- Access tokens have 1-hour TTL (rapid cleanup)
- Consider Redis for > 100K users

### Audit Trail

Track revocations for security analysis:

```typescript
// Get revocation history
const revocations = await prisma.tokenBlacklist.findMany({
  where: { userId: 'usr_123' },
  orderBy: { revokedAt: 'desc' },
  include: {
    revokedBy: true, // Admin who revoked
  },
});
```

### IP and Device Tracking

Session metadata helps detect suspicious activity:

```typescript
// Detect login from new location
const recentSessions = await prisma.session.findMany({
  where: {
    userId: 'usr_123',
    createdAt: { gt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
  },
  select: { ipAddress: true, deviceInfo: true },
});

// Alert if new IP/device
const knownIPs = new Set(recentSessions.map(s => s.ipAddress));
if (!knownIPs.has(newIPAddress)) {
  // Send security alert email
}
```

---

## Migration Guide

### From Old Schema to New Schema

**Step 1: Create migration**
```bash
npx prisma migrate dev --name auth_redesign
```

**Step 2: Data migration**
- No data migration needed (Session table is ephemeral)
- Existing sessions will be invalidated
- Users will need to re-authenticate

**Step 3: Update authentication middleware**
```typescript
// OLD: Validate access token in database
const session = await prisma.session.findUnique({
  where: { accessToken },
});

// NEW: Validate JWT signature only
const payload = jwt.verify(accessToken, JWT_SECRET);
// Optional: Check blacklist for high-security endpoints
```

**Step 4: Update logout handler**
```typescript
// OLD: Delete session
await prisma.session.delete({ where: { accessToken } });

// NEW: Add to blacklist + delete session
const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
await prisma.tokenBlacklist.create({ data: { tokenHash, ... } });
await prisma.session.delete({ where: { refreshToken } });
```

**Step 5: Deploy cleanup job**
Schedule daily task to clean expired blacklist entries.

---

## FAQ

**Q: Why not store access tokens in the database?**
A: JWT tokens are self-contained and can be validated by signature. Storing them adds unnecessary database load (1 query per API request).

**Q: How do you revoke a JWT if it's not in the database?**
A: Use a blacklist table. Only revoked tokens are stored, not all tokens. Blacklist checks are optional (only for logout/security events).

**Q: What if the blacklist table grows too large?**
A: Access tokens have 1-hour TTL. Daily cleanup removes expired entries. For high traffic, migrate blacklist to Redis.

**Q: How do you track active sessions?**
A: Session table stores refresh tokens with metadata (device, IP, last activity). Each session represents one authenticated device.

**Q: What happens if JWT secret is compromised?**
A: Rotate the secret immediately. All existing tokens become invalid. Users must re-authenticate.

**Q: Should every API request check the blacklist?**
A: No. Only check blacklist for high-security endpoints or if you detect suspicious activity. Most requests only verify JWT signature (fast).
