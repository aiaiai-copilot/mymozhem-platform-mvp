# Prisma Migration Plan

## Overview

This document outlines the migration strategy for the Event Management Platform database schema.

## Database Setup

### Prerequisites

1. PostgreSQL 14+ installed and running
2. Database created with appropriate credentials
3. Environment variables configured

### Environment Variables

Create `.env` file in `platform/` directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/event_platform?schema=public"
JWT_SECRET="your-secret-key-here"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

## Migration Strategy

### Development Environment

#### 1. Initial Migration

```bash
cd platform
npx prisma migrate dev --name init
```

This will:
- Create the initial migration SQL file
- Apply the migration to your development database
- Generate Prisma Client

#### 2. Schema Validation

```bash
npx prisma validate
```

Validates that the schema is correctly formatted and has no errors.

#### 3. Generate Prisma Client

```bash
npx prisma generate
```

Generates the TypeScript Prisma Client for use in your application.

#### 4. Seed Database

```bash
npx prisma db seed
```

Populates database with initial test data (see `prisma/seed.ts`).

### Production Environment

#### 1. Apply Migrations

```bash
npx prisma migrate deploy
```

This applies all pending migrations without prompting. Use this in CI/CD pipelines.

#### 2. Verify Migration

```bash
npx prisma migrate status
```

Shows the current migration status and any pending migrations.

## Migration Files Generated

The initial migration will create:

```
platform/prisma/migrations/
└── 20251228_init/
    └── migration.sql
```

### Expected SQL (Summary)

The migration will create:

1. **Enums:**
   - `RoomStatus` (DRAFT, ACTIVE, COMPLETED, CANCELLED)
   - `ParticipantRole` (ADMIN, ORGANIZER, MODERATOR, PARTICIPANT, VIEWER)

2. **Tables:**
   - `users` - User accounts with OAuth data
   - `sessions` - Refresh token storage with session metadata
   - `token_blacklist` - Revoked access tokens (blacklist pattern)
   - `apps` - Registered applications with manifests
   - `rooms` - Event/room records
   - `participants` - User participation in rooms
   - `prizes` - Prize records
   - `winners` - Winner records

3. **Indexes:**
   - Foreign key indexes (automatic)
   - Email, provider indexes on users
   - Status, appId indexes on rooms
   - Composite indexes for common query patterns

4. **Constraints:**
   - Primary keys on all tables
   - Unique constraints (email, appId, userId+roomId)
   - Foreign key constraints with appropriate ON DELETE actions

## Schema Design Decisions

### ID Generation

**CUID (Collision-resistant Unique ID)** chosen for all primary keys:
- URL-safe
- Sortable by creation time
- More secure than auto-incrementing integers
- Compatible with distributed systems

### Soft Deletes

`deletedAt` fields added to:
- **Users** - Preserve user data for audit trails
- **Apps** - Track historical app registrations
- **Rooms** - Preserve completed event data
- **Participants** - Track who left rooms
- **Prizes** - Track removed prizes
- **Winners** - Track revoked winners

### JSON Fields

Used for flexibility without schema migrations:
- `App.manifest` - Application configuration
- `Room.appSettings` - App-specific room settings
- `Participant.metadata` - App-specific participant data
- `Prize.metadata` - Additional prize information
- `Winner.metadata` - Draw/selection metadata

### Cascade Behavior

| Relation | ON DELETE Action | Reason |
|----------|------------------|--------|
| User → Session | CASCADE | Sessions are meaningless without user |
| User → Participant | CASCADE | Remove participation when user deleted |
| App → Room | RESTRICT | Prevent deletion of apps with active rooms |
| Room → Participant | CASCADE | Remove participants when room deleted |
| Room → Prize | CASCADE | Remove prizes when room deleted |
| Room → Winner | CASCADE | Remove winners when room deleted |
| Participant → Winner | CASCADE | Remove winner record if participant removed |
| Prize → Winner | RESTRICT | Prevent prize deletion if has winners |

### Indexes Strategy

#### Single-Column Indexes
- Foreign keys (automatic in PostgreSQL)
- Frequently filtered fields (status, isPublic, role)
- Unique constraints (email, appId)
- Soft delete fields (deletedAt)

#### Composite Indexes
- `[status, isPublic, appId]` on rooms - Common list filtering
- `[roomId, role]` on participants - Role-based queries
- `[roomId, prizeId]` on winners - Prize winner lookups
- `[provider, providerId]` on users - OAuth lookups

## Common Migration Tasks

### Adding a New Field

1. Update `schema.prisma`:
```prisma
model Room {
  // ... existing fields
  newField String?
}
```

2. Create migration:
```bash
npx prisma migrate dev --name add_new_field
```

### Adding a New Model

1. Add model to `schema.prisma`
2. Define relations
3. Create migration:
```bash
npx prisma migrate dev --name add_new_model
```

### Modifying Existing Field

**Warning:** Data migrations may be required!

1. Update `schema.prisma`
2. Create empty migration:
```bash
npx prisma migrate dev --create-only --name modify_field
```
3. Edit generated SQL to handle data transformation
4. Apply migration:
```bash
npx prisma migrate dev
```

## Rollback Strategy

### Development
```bash
# Reset database to clean state
npx prisma migrate reset
```

This will:
1. Drop database
2. Create database
3. Apply all migrations
4. Run seed script

### Production

**There is no automatic rollback in production!**

Manual steps:
1. Create a new migration that reverses changes
2. Deploy the reverse migration
3. Verify data integrity

## Database Maintenance

### Vacuum PostgreSQL

```sql
VACUUM ANALYZE;
```

Run periodically to optimize database performance.

### Monitor Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

Identify unused indexes for potential removal.

### Check Table Sizes

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### Migration Fails

1. Check error message
2. Review generated SQL
3. Manually fix if needed:
```bash
npx prisma migrate resolve --applied 20251228_init
```

### Schema Drift Detected

When Prisma detects differences between schema and database:

```bash
# Generate migration to sync
npx prisma migrate dev --name fix_drift

# Or reset in development
npx prisma migrate reset
```

### Connection Issues

Verify:
- PostgreSQL is running
- DATABASE_URL is correct
- Database exists
- User has appropriate permissions

## Next Steps

After successful migration:

1. [ ] Generate Prisma Client: `npx prisma generate`
2. [ ] Run seed script: `npx prisma db seed`
3. [ ] Test CRUD operations
4. [ ] Verify indexes are used in queries
5. [ ] Set up database backups
6. [ ] Configure connection pooling for production
7. [ ] Document any custom migrations

## Authentication Schema Changes

### JWT-Based Authentication (Performance Optimization)

**Design Decision:**
- **Remove** `accessToken` from Session table (not needed for JWT)
- **Add** TokenBlacklist table for revoked tokens only
- **Add** session metadata (deviceInfo, ipAddress, lastUsedAt)

**Benefits:**
- **99% faster** authentication (JWT signature verification vs DB lookup)
- **Reduced DB load** - No DB query on every API request
- **Better security** - Track device/IP for suspicious activity detection
- **Scalability** - Stateless tokens work with horizontal scaling

### TokenBlacklist Table

```sql
CREATE TABLE "token_blacklist" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT,
  "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedBy" TEXT
);

CREATE INDEX "token_blacklist_tokenHash_idx" ON "token_blacklist"("tokenHash");
CREATE INDEX "token_blacklist_expiresAt_idx" ON "token_blacklist"("expiresAt");
CREATE INDEX "token_blacklist_userId_idx" ON "token_blacklist"("userId");
```

### Session Table Changes

**Removed:**
- `accessToken` field (JWT not stored)
- `accessToken` index

**Added:**
- `deviceInfo` - User agent string for tracking
- `ipAddress` - IP address for security monitoring
- `lastUsedAt` - Last activity timestamp
- Index on `lastUsedAt` for cleanup queries

## Scheduled Maintenance Tasks

### Daily Cleanup Script

Create `platform/scripts/cleanup-tokens.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTokens() {
  console.log('Starting token cleanup...');

  // Remove expired blacklist entries
  const blacklistResult = await prisma.tokenBlacklist.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  console.log(`Deleted ${blacklistResult.count} expired blacklist entries`);

  // Remove expired sessions
  const sessionResult = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  console.log(`Deleted ${sessionResult.count} expired sessions`);

  console.log('Cleanup complete!');
}

cleanupTokens()
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Schedule with cron:**
```bash
# Run daily at 2 AM
0 2 * * * cd /app/platform && node dist/scripts/cleanup-tokens.js
```

### Weekly Cleanup Script

Create `platform/scripts/cleanup-stale-sessions.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupStaleSessions() {
  console.log('Starting stale session cleanup...');

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const result = await prisma.session.deleteMany({
    where: {
      lastUsedAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  console.log(`Deleted ${result.count} stale sessions (> 90 days inactive)`);
}

cleanupStaleSessions()
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Schedule with cron:**
```bash
# Run weekly on Sunday at 3 AM
0 3 * * 0 cd /app/platform && node dist/scripts/cleanup-stale-sessions.js
```

## Migration from Old Schema

### Step 1: Create Migration

```bash
cd platform
npx prisma migrate dev --name auth_redesign
```

### Step 2: Update Application Code

**Authentication Middleware (BEFORE):**
```typescript
// OLD: Validate access token in database
const session = await prisma.session.findUnique({
  where: { accessToken },
  include: { user: true },
});

if (!session || session.expiresAt < new Date()) {
  throw new Error('Invalid or expired token');
}

req.user = session.user;
```

**Authentication Middleware (AFTER):**
```typescript
import jwt from 'jsonwebtoken';

// NEW: Validate JWT signature only (no DB lookup)
const payload = jwt.verify(accessToken, process.env.JWT_SECRET);

// Optional: Check blacklist for high-security endpoints
if (requireBlacklistCheck) {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  const isBlacklisted = await prisma.tokenBlacklist.findUnique({
    where: { tokenHash },
  });
  if (isBlacklisted) {
    throw new Error('Token has been revoked');
  }
}

// Get user from payload (or fetch from DB if needed)
req.user = { id: payload.userId, email: payload.email };
```

**Login Handler (AFTER):**
```typescript
// Generate JWT access token (NOT stored in DB)
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Generate refresh token (stored in DB)
const refreshToken = generateSecureToken(); // Random 32-byte token

// Create session
await prisma.session.create({
  data: {
    userId: user.id,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  },
});

return { accessToken, refreshToken, expiresIn: 3600 };
```

**Logout Handler (AFTER):**
```typescript
import crypto from 'crypto';

// Hash and blacklist the access token
const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

await prisma.tokenBlacklist.create({
  data: {
    tokenHash,
    userId: user.id,
    expiresAt: new Date(Date.now() + 3600 * 1000), // Match access token expiry
    reason: 'logout',
  },
});

// Delete session
await prisma.session.delete({
  where: { refreshToken: body.refreshToken },
});
```

### Step 3: Deploy

1. Run migration on staging database
2. Test authentication flows (login, API request, refresh, logout)
3. Verify performance improvement (monitor response times)
4. Deploy to production
5. Schedule cleanup jobs

### Step 4: Monitor

Track key metrics:
- Average API request time (should drop from ~1-2ms to ~0.1ms)
- Token blacklist table size
- Session table size
- Cleanup job execution time

## Performance Monitoring

### Query to Check Blacklist Size

```sql
SELECT
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE "expiresAt" > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE "expiresAt" <= NOW()) as expired_entries,
  pg_size_pretty(pg_total_relation_size('token_blacklist')) as table_size
FROM token_blacklist;
```

### Query to Check Session Table

```sql
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE "expiresAt" > NOW()) as active_sessions,
  COUNT(*) FILTER (WHERE "lastUsedAt" > NOW() - INTERVAL '7 days') as recent_sessions,
  pg_size_pretty(pg_total_relation_size('sessions')) as table_size
FROM sessions;
```

## Redis Migration (Optional - High Traffic)

For platforms with > 100K users, migrate blacklist to Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Add to blacklist with automatic expiry
async function blacklistToken(token: string, userId: string, expiresIn: number) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await redis.setex(`blacklist:${tokenHash}`, expiresIn, userId);
}

// Check blacklist (sub-millisecond)
async function isTokenBlacklisted(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const exists = await redis.exists(`blacklist:${tokenHash}`);
  return exists === 1;
}
```

**Benefits:**
- Sub-millisecond blacklist lookups
- Automatic expiry (no cleanup needed)
- Reduced PostgreSQL load

**Keep in PostgreSQL:**
- Session table (refresh tokens) - needed for rotation
- Blacklist audit trail (optional) - for compliance

## Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Database Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Token Blacklisting Strategies](https://auth0.com/blog/blacklist-json-web-token-api-keys/)
