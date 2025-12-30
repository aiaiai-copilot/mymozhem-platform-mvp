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

2. **Tables (8 Core MVP Tables):**
   - `users` - User accounts with OAuth data
   - `sessions` - Refresh token storage with session metadata
   - `token_blacklist` - Revoked access tokens (blacklist pattern)
   - `apps` - Registered applications with manifests and versioning
   - `rooms` - Event/room records with manifest version locking
   - `participants` - User participation in rooms
   - `prizes` - Prize records
   - `winners` - Winner records

**Note:** Billing tables (subscription_plans, subscriptions, payments, invoices, usage_records) will be added POST-MVP after platform validation.

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
| **Prize → Winner** | **RESTRICT** | **Prevent hard prize deletion if has winners (see Prize Deletion Policy below)** |

### Prize Deletion Policy

**CRITICAL RULE:** Prizes must ONLY be deleted via soft delete (setting `deletedAt` field).

#### Why This Matters

The `Winner → Prize` relation uses `onDelete: Restrict` to protect historical data integrity. If you attempt to hard delete a Prize that has Winners:

```
Error: P2003 - Foreign key constraint failed on the field
```

This is **intentional protection** to prevent accidental loss of winner history.

#### Implementation Requirements

All code that deletes prizes MUST:

1. **Use soft delete only** - Set `deletedAt` instead of calling `delete()`
2. **Validate before deletion** - Check business rules (e.g., can't delete prize with winners)
3. **Handle Restrict errors** - Catch and explain the error if hard delete is attempted

#### Middleware/Service Layer Validation

Implement in `platform/src/services/prize.service.ts`:

```typescript
/**
 * Delete a prize (soft delete)
 *
 * @throws {Error} If prize has winners and business rules prevent deletion
 */
async function deletePrize(prizeId: string): Promise<Prize> {
  // 1. Check if prize has active winners
  const winnerCount = await prisma.winner.count({
    where: {
      prizeId: prizeId,
      deletedAt: null, // Only count active winners
    },
  });

  // 2. Business rule: Cannot delete prize with active winners
  if (winnerCount > 0) {
    throw new Error(
      `Cannot delete prize: ${winnerCount} winner(s) exist. ` +
      `Revoke winners first or soft delete the prize.`
    );
  }

  // 3. Perform soft delete
  return await prisma.prize.update({
    where: { id: prizeId },
    data: { deletedAt: new Date() },
  });
}
```

#### Error Handling for Restrict Violations

If a hard delete is attempted (e.g., via admin tool or direct Prisma call):

```typescript
import { Prisma } from '@prisma/client';

try {
  // This will fail if winners exist
  await prisma.prize.delete({
    where: { id: prizeId },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2003') {
      // Foreign key constraint violation (onDelete: Restrict)
      throw new Error(
        'Cannot hard delete Prize: Winners exist. ' +
        'Use soft delete instead: ' +
        'await prisma.prize.update({ where: { id }, data: { deletedAt: new Date() } })'
      );
    }
  }
  throw error;
}
```

#### Database-Level Protection

The database enforces this through foreign key constraints:

```sql
-- Generated migration includes:
ALTER TABLE "winners"
  ADD CONSTRAINT "winners_prizeId_fkey"
  FOREIGN KEY ("prizeId")
  REFERENCES "prizes"("id")
  ON DELETE RESTRICT;
```

This means:
- **Database will reject** hard delete of Prize if Winners reference it
- **Application MUST use** soft delete pattern
- **No way to bypass** this protection (even with raw SQL)

### Other Models with Restrict Protection

Similar protection exists for other critical relations:

#### User → Room (Organizer)

**Rule:** Cannot hard delete User if they created any Rooms.

```typescript
// Safe user deletion
async function deleteUser(userId: string) {
  // 1. Soft delete all rooms created by user
  await prisma.room.updateMany({
    where: { createdBy: userId },
    data: { deletedAt: new Date() },
  });

  // 2. Soft delete the user
  return await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });
}
```

**Why:** Preserves historical records of who organized events.

#### App → Room

**Rule:** Cannot hard delete App if any Rooms reference it.

```typescript
// Safe app deletion
async function deleteApp(appId: string) {
  // 1. Check for active rooms
  const activeRoomCount = await prisma.room.count({
    where: {
      appId: appId,
      deletedAt: null,
    },
  });

  if (activeRoomCount > 0) {
    throw new Error(
      `Cannot delete app: ${activeRoomCount} active room(s) exist. ` +
      `Soft delete or complete rooms first.`
    );
  }

  // 2. Soft delete the app
  return await prisma.app.update({
    where: { appId: appId },
    data: { deletedAt: new Date() },
  });
}
```

**Why:** Prevents deletion of apps that have active or historical rooms.

### Summary: All Restrict Relations

| Parent Model | Child Model | Field | Reason |
|--------------|-------------|-------|--------|
| **User** | Room | organizer | Preserve event organizer history |
| **App** | Room | app | Prevent deletion of apps with rooms |
| **Prize** | Winner | prize | Preserve winner history and prevent data loss |

All three cases require soft delete pattern for data integrity.

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

## Manifest Versioning Migration

### Adding Versioning Fields

**Migration Name:** `add_manifest_versioning`

**Changes:**
1. Add `manifestVersion` field to `apps` table (String, required)
2. Add `manifestHistory` field to `apps` table (JSON, default `[]`)
3. Add `appManifestVersion` field to `rooms` table (String, required)
4. Add indexes for version fields

**Migration Steps:**

```bash
# Create migration
npx prisma migrate dev --name add_manifest_versioning
```

**Generated SQL (Summary):**
```sql
-- Add versioning fields to apps
ALTER TABLE "apps" ADD COLUMN "manifestVersion" TEXT NOT NULL DEFAULT '1.0.0';
ALTER TABLE "apps" ADD COLUMN "manifestHistory" JSONB NOT NULL DEFAULT '[]';

-- Add version lock field to rooms
ALTER TABLE "rooms" ADD COLUMN "appManifestVersion" TEXT NOT NULL DEFAULT '1.0.0';

-- Add indexes
CREATE INDEX "apps_manifestVersion_idx" ON "apps"("manifestVersion");
CREATE INDEX "rooms_appManifestVersion_idx" ON "rooms"("appManifestVersion");
CREATE INDEX "rooms_appId_appManifestVersion_idx" ON "rooms"("appId", "appManifestVersion");
```

**Data Migration Script:**

If apps and rooms already exist, you need to backfill version fields:

```typescript
// platform/scripts/backfill-manifest-versions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillManifestVersions() {
  console.log('Starting manifest version backfill...');

  // Get all apps
  const apps = await prisma.app.findMany();

  for (const app of apps) {
    // Extract version from manifest
    const manifest = app.manifest as any;
    const version = manifest.meta?.version || '1.0.0';

    // Update app with extracted version
    await prisma.app.update({
      where: { id: app.id },
      data: {
        manifestVersion: version,
        manifestHistory: [],
      },
    });

    console.log(`Updated app ${app.appId} to version ${version}`);

    // Update all rooms for this app
    await prisma.room.updateMany({
      where: { appId: app.appId },
      data: { appManifestVersion: version },
    });

    const roomCount = await prisma.room.count({
      where: { appId: app.appId },
    });

    console.log(`Locked ${roomCount} rooms to version ${version}`);
  }

  console.log('Backfill complete!');
}

backfillManifestVersions()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run Backfill:**
```bash
npx tsx platform/scripts/backfill-manifest-versions.ts
```

### Validation After Migration

```bash
# Verify all apps have versions
npx prisma studio

# Check data:
# 1. All apps.manifestVersion should be populated
# 2. All rooms.appManifestVersion should be populated
# 3. Apps.manifestHistory should be empty array []
```

## Next Steps

After successful migration:

1. [ ] Generate Prisma Client: `npx prisma generate`
2. [ ] Run seed script: `npx prisma db seed`
3. [ ] Test CRUD operations
4. [ ] Verify indexes are used in queries
5. [ ] Set up database backups
6. [ ] Configure connection pooling for production
7. [ ] Document any custom migrations
8. [ ] Run manifest versioning backfill (if existing data)
9. [ ] Test manifest version validation logic
10. [ ] Update API endpoints to handle versioning

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

## Billing & Subscription Migration (POST-MVP)

**Status:** Deferred until after MVP validation with real users.

**Rationale:** The platform will launch with free access for all users. After validating the core product-market fit, we'll design and implement a proper monetization strategy based on actual user behavior and needs.

### Future Billing Implementation (Reference)

When billing is needed POST-MVP, the following will be added:

**Migration Name:** `add_billing_subscription`

**Changes:**
1. Add `SubscriptionPlanTier` enum (FREE, PRO, ENTERPRISE, CUSTOM)
2. Add `SubscriptionStatus` enum (TRIALING, ACTIVE, PAST_DUE, etc.)
3. Add `BillingInterval` enum (MONTHLY, YEARLY, LIFETIME)
4. Add `SubscriptionPlan` table
5. Add `Subscription` table
6. Add `Payment` table
7. Add `Invoice` table
8. Add `UsageRecord` table
9. Add relation from `User` to `Subscription`

**Note:** This section is for future reference only. Do not implement billing for MVP.

**Future Migration Steps (Reference Only):**

<!--

```bash
# FUTURE: Create migration when implementing billing
cd platform
npx prisma migrate dev --name add_billing_subscription
```

**Future Generated SQL Summary:**

```sql
-- Create enums
CREATE TYPE "SubscriptionPlanTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE', 'CUSTOM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE', 'PAUSED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME');

-- Create subscription_plans table
CREATE TABLE "subscription_plans" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tier" "SubscriptionPlanTier" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "price" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "features" JSONB NOT NULL,
  "stripePriceId" TEXT UNIQUE,
  "stripeProductId" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);

-- Create subscriptions table
CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "trialStart" TIMESTAMP(3),
  "trialEnd" TIMESTAMP(3),
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT UNIQUE,
  "stripeCheckoutSessionId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT
);

-- Create payments table
CREATE TABLE "payments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL,
  "paymentMethod" TEXT,
  "failureReason" TEXT,
  "stripePaymentIntentId" TEXT UNIQUE,
  "stripeChargeId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE
);

-- Create invoices table
CREATE TABLE "invoices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL UNIQUE,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "stripeInvoiceId" TEXT UNIQUE,
  "pdfUrl" TEXT,
  "lineItems" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE
);

-- Create usage_records table
CREATE TABLE "usage_records" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "metricName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX ON "subscription_plans"("tier");
CREATE INDEX ON "subscription_plans"("isActive");
CREATE INDEX ON "subscription_plans"("deletedAt");
CREATE INDEX ON "subscription_plans"("displayOrder");
CREATE UNIQUE INDEX ON "subscription_plans"("tier", "billingInterval");

CREATE INDEX ON "subscriptions"("userId");
CREATE INDEX ON "subscriptions"("planId");
CREATE INDEX ON "subscriptions"("status");
CREATE INDEX ON "subscriptions"("currentPeriodEnd");
CREATE INDEX ON "subscriptions"("trialEnd");
CREATE INDEX ON "subscriptions"("stripeCustomerId");
CREATE INDEX ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX ON "subscriptions"("deletedAt");
CREATE INDEX ON "subscriptions"("status", "currentPeriodEnd");
CREATE UNIQUE INDEX ON "subscriptions"("userId", "status", "deletedAt");

CREATE INDEX ON "payments"("subscriptionId");
CREATE INDEX ON "payments"("userId");
CREATE INDEX ON "payments"("status");
CREATE INDEX ON "payments"("createdAt");
CREATE INDEX ON "payments"("stripePaymentIntentId");
CREATE INDEX ON "payments"("deletedAt");

CREATE INDEX ON "invoices"("subscriptionId");
CREATE INDEX ON "invoices"("userId");
CREATE INDEX ON "invoices"("invoiceNumber");
CREATE INDEX ON "invoices"("status");
CREATE INDEX ON "invoices"("issuedAt");
CREATE INDEX ON "invoices"("dueAt");
CREATE INDEX ON "invoices"("stripeInvoiceId");
CREATE INDEX ON "invoices"("deletedAt");

CREATE INDEX ON "usage_records"("subscriptionId");
CREATE INDEX ON "usage_records"("userId");
CREATE INDEX ON "usage_records"("metricName");
CREATE INDEX ON "usage_records"("timestamp");
CREATE INDEX ON "usage_records"("deletedAt");
CREATE INDEX ON "usage_records"("subscriptionId", "metricName", "timestamp");
```

### Seed Subscription Plans

**Script:** `platform/prisma/seed-subscriptions.ts`

```bash
npx tsx platform/prisma/seed-subscriptions.ts
```

Creates:
- Free Plan (MONTHLY) - $0
- Pro Plan (MONTHLY) - $29.99
- Pro Plan (YEARLY) - $288/year (20% discount)
- Enterprise Plan (YEARLY) - $999/year

### Backfill Existing Users

**Script:** `platform/scripts/backfill-free-subscriptions.ts`

```bash
npx tsx platform/scripts/backfill-free-subscriptions.ts
```

Assigns all existing users without active subscription to Free Plan (ensures backward compatibility).

### Validation After Migration

```bash
# Verify schema
npx prisma validate

# Check database state
npx prisma studio

# Verify:
# 1. All subscription_plans created
# 2. All users have active Free subscription
# 3. Indexes created
# 4. Foreign keys enforced
```

### Stripe Integration Setup

```bash
# Install Stripe SDK
npm install stripe @stripe/stripe-js

# Set environment variables
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Create products in Stripe Dashboard
# Update subscription_plans with Stripe IDs
```

## Scheduled Maintenance Tasks - Billing

### Daily Subscription Cleanup

Create `platform/scripts/subscription-maintenance.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function maintenanceSubscriptions() {
  console.log('Starting subscription maintenance...');

  // 1. Expire trials that ended
  const expiredTrials = await prisma.subscription.updateMany({
    where: {
      status: 'TRIALING',
      trialEnd: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });
  console.log(`Expired ${expiredTrials.count} trial subscriptions`);

  // 2. Expire canceled subscriptions at period end
  const expiredCanceled = await prisma.subscription.updateMany({
    where: {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });
  console.log(`Expired ${expiredCanceled.count} canceled subscriptions`);

  // 3. Notify users of trials ending in 3 days
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 3600 * 1000);

  const expiringTrials = await prisma.subscription.findMany({
    where: {
      status: 'TRIALING',
      trialEnd: {
        lte: threeDaysFromNow,
        gte: new Date(),
      },
    },
    include: {
      user: true,
      plan: true,
    },
  });

  console.log(`Found ${expiringTrials.length} trials ending soon`);
  // Send notification emails here

  console.log('Subscription maintenance complete!');
}

maintenanceSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Schedule with cron:**
```bash
# Run daily at 2 AM
0 2 * * * cd /app/platform && node dist/scripts/subscription-maintenance.js
```

-->

## Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Database Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Token Blacklisting Strategies](https://auth0.com/blog/blacklist-json-web-token-api-keys/)
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [SaaS Metrics](https://www.profitwell.com/recur/all/saas-metrics)
