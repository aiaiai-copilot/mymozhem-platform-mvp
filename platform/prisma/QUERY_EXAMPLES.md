# Prisma Query Examples

This document provides practical Prisma Client query examples for common operations in the Event Management Platform.

## Setup

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
```

## User Queries

### Create User (OAuth)

```typescript
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    provider: 'google',
    providerId: 'google_123456',
    emailVerified: new Date(),
  },
});
```

### Find User by Email

```typescript
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});
```

### Find User by OAuth Provider

```typescript
const user = await prisma.user.findUnique({
  where: {
    provider_providerId: {
      provider: 'google',
      providerId: 'google_123456',
    },
  },
});
```

### Update User Profile

```typescript
const user = await prisma.user.update({
  where: { id: 'usr_abc123' },
  data: {
    name: 'Jane Doe',
    avatar: 'https://example.com/new-avatar.jpg',
  },
});
```

### Soft Delete User

```typescript
const user = await prisma.user.update({
  where: { id: 'usr_abc123' },
  data: {
    deletedAt: new Date(),
  },
});
```

### List Active Users

```typescript
const users = await prisma.user.findMany({
  where: {
    deletedAt: null,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 20,
  skip: 0,
});
```

## Session Queries

### Create Session (on login)

```typescript
const session = await prisma.session.create({
  data: {
    userId: 'usr_abc123',
    refreshToken: 'generated_refresh_token',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
    deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    ipAddress: '192.168.1.1',
  },
});

// Note: Access token is generated as JWT but NOT stored in database
```

### Validate Refresh Token

```typescript
const session = await prisma.session.findFirst({
  where: {
    refreshToken: 'token_value',
    expiresAt: {
      gt: new Date(), // Greater than current time
    },
  },
  include: {
    user: true,
  },
});

// Update last used timestamp
if (session) {
  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });
}
```

### Rotate Refresh Token

```typescript
// Generate new refresh token and update session
const updatedSession = await prisma.session.update({
  where: { id: 'session_id' },
  data: {
    refreshToken: 'new_generated_refresh_token',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
    lastUsedAt: new Date(),
  },
});

// Return new access token (JWT) and new refresh token
```

### Delete Session (Logout)

```typescript
import crypto from 'crypto';

// 1. Add access token to blacklist
const tokenHash = crypto
  .createHash('sha256')
  .update(accessToken)
  .digest('hex');

await prisma.tokenBlacklist.create({
  data: {
    tokenHash,
    userId: 'usr_abc123',
    expiresAt: new Date(Date.now() + 3600 * 1000), // Match access token expiry
    reason: 'logout',
  },
});

// 2. Delete session (refresh token)
await prisma.session.delete({
  where: { refreshToken: 'refresh_token_value' },
});
```

### Get User's Active Sessions

```typescript
const sessions = await prisma.session.findMany({
  where: {
    userId: 'usr_abc123',
    expiresAt: {
      gt: new Date(),
    },
  },
  orderBy: {
    lastUsedAt: 'desc',
  },
});
```

### Cleanup Expired Sessions

```typescript
await prisma.session.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),
    },
  },
});
```

### Cleanup Stale Sessions (not used in 90 days)

```typescript
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

await prisma.session.deleteMany({
  where: {
    lastUsedAt: {
      lt: ninetyDaysAgo,
    },
  },
});
```

## Token Blacklist Queries

### Check if Access Token is Revoked

```typescript
import crypto from 'crypto';

// Hash the access token
const tokenHash = crypto
  .createHash('sha256')
  .update(accessToken)
  .digest('hex');

// Check blacklist
const blacklisted = await prisma.tokenBlacklist.findUnique({
  where: { tokenHash },
});

const isRevoked = blacklisted !== null;
```

### Revoke Access Token (Security Breach)

```typescript
import crypto from 'crypto';

const tokenHash = crypto
  .createHash('sha256')
  .update(accessToken)
  .digest('hex');

await prisma.tokenBlacklist.create({
  data: {
    tokenHash,
    userId: 'usr_abc123',
    expiresAt: new Date(Date.now() + 3600 * 1000), // Match token expiry
    reason: 'security_breach',
    revokedBy: 'admin_user_id',
  },
});
```

### Revoke All User Tokens (Admin Action)

```typescript
import crypto from 'crypto';

// Get all user's active sessions
const sessions = await prisma.session.findMany({
  where: { userId: 'usr_abc123' },
});

// Delete all sessions
await prisma.session.deleteMany({
  where: { userId: 'usr_abc123' },
});

// Note: Access tokens will naturally expire (1 hour TTL)
// If immediate revocation needed, add them to blacklist
```

### Cleanup Expired Blacklist Entries

```typescript
await prisma.tokenBlacklist.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),
    },
  },
});
```

### Get User's Revoked Tokens (Audit)

```typescript
const revokedTokens = await prisma.tokenBlacklist.findMany({
  where: { userId: 'usr_abc123' },
  orderBy: { revokedAt: 'desc' },
});
```

## App Queries

### Register Application

```typescript
const manifest = {
  meta: {
    name: 'Holiday Lottery',
    version: '1.0.0',
    description: 'Lottery application',
  },
  baseUrl: 'https://lottery.example.com',
  capabilities: ['winnerSelection'],
  permissions: ['users:read', 'rooms:read'],
  settings: { /* JSON Schema */ },
};

const app = await prisma.app.create({
  data: {
    appId: 'app_lottery_v1',
    appSecret: 'sk_live_generated_secret',
    manifest: manifest,
    manifestVersion: manifest.meta.version, // Extract from manifest
    manifestHistory: [], // Empty for first version
    isActive: true,
  },
});
```

### Find App by ID

```typescript
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});
```

### Authenticate App

```typescript
const app = await prisma.app.findFirst({
  where: {
    appId: 'app_lottery_v1',
    appSecret: 'provided_secret',
    isActive: true,
    deletedAt: null,
  },
});
```

### List Active Apps

```typescript
const apps = await prisma.app.findMany({
  where: {
    isActive: true,
    deletedAt: null,
  },
  select: {
    appId: true,
    manifest: true,
    createdAt: true,
  },
});
```

### Update App Manifest

```typescript
// Fetch current app state
const currentApp = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

const newManifest = {
  meta: {
    name: 'Holiday Lottery',
    version: '1.1.0', // Incremented version
    description: 'Lottery application with new features',
  },
  // ... rest of manifest
};

// Archive current version to history
const historyEntry = {
  version: currentApp.manifestVersion,
  manifest: currentApp.manifest,
  publishedAt: currentApp.updatedAt.toISOString(),
  deprecatedAt: null,
};

const updatedHistory = [...(currentApp.manifestHistory as any[]), historyEntry];

// Update app with new manifest
const app = await prisma.app.update({
  where: { appId: 'app_lottery_v1' },
  data: {
    manifest: newManifest,
    manifestVersion: newManifest.meta.version,
    manifestHistory: updatedHistory,
  },
});
```

### Get Manifest for Specific Version

```typescript
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

// Get manifest for version 1.0.0
let manifestV1_0_0;

if (app.manifestVersion === '1.0.0') {
  // Current version
  manifestV1_0_0 = app.manifest;
} else {
  // Search in history
  const historyEntry = (app.manifestHistory as any[]).find(
    (entry) => entry.version === '1.0.0'
  );
  manifestV1_0_0 = historyEntry?.manifest;
}
```

### Find Apps by Manifest Version

```typescript
const appsV1 = await prisma.app.findMany({
  where: {
    manifestVersion: {
      startsWith: '1.', // All v1.x.x versions
    },
    isActive: true,
  },
});
```

## Room Queries

### Create Room

```typescript
// Fetch app to get current manifest version
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

// Validate settings against current manifest (done in service layer)
// ...

// Create room locked to current manifest version
const room = await prisma.room.create({
  data: {
    name: 'New Year Lottery 2025',
    description: 'Win amazing prizes!',
    appId: 'app_lottery_v1',
    appSettings: {
      ticketCount: 100,
      drawDate: '2025-12-31T23:00:00Z',
    },
    appManifestVersion: app.manifestVersion, // Lock to current version
    status: 'ACTIVE',
    isPublic: true,
    createdBy: 'usr_abc123',
  },
  include: {
    app: true,
    organizer: true,
  },
});
```

### Get Room with Details

```typescript
const room = await prisma.room.findUnique({
  where: { id: 'room_xyz789' },
  include: {
    app: {
      select: {
        appId: true,
        manifest: true,
      },
    },
    organizer: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
    _count: {
      select: {
        participants: true,
        prizes: true,
        winners: true,
      },
    },
  },
});
```

### List Rooms with Filters

```typescript
const rooms = await prisma.room.findMany({
  where: {
    status: 'ACTIVE',
    isPublic: true,
    appId: 'app_lottery_v1',
    deletedAt: null,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 20,
  skip: 0,
  include: {
    _count: {
      select: {
        participants: true,
        prizes: true,
      },
    },
  },
});
```

### Update Room Status

```typescript
const room = await prisma.room.update({
  where: { id: 'room_xyz789' },
  data: {
    status: 'COMPLETED',
  },
});
```

### Get User's Rooms

```typescript
const rooms = await prisma.room.findMany({
  where: {
    createdBy: 'usr_abc123',
    deletedAt: null,
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

## Participant Queries

### Join Room

```typescript
const participant = await prisma.participant.create({
  data: {
    userId: 'usr_abc123',
    roomId: 'room_xyz789',
    role: 'PARTICIPANT',
    metadata: {
      ticketNumber: 42,
    },
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
  },
});
```

### Check if User in Room

```typescript
const participant = await prisma.participant.findUnique({
  where: {
    userId_roomId: {
      userId: 'usr_abc123',
      roomId: 'room_xyz789',
    },
  },
});
```

### Get User's Role in Room

```typescript
const participant = await prisma.participant.findUnique({
  where: {
    userId_roomId: {
      userId: 'usr_abc123',
      roomId: 'room_xyz789',
    },
    deletedAt: null,
  },
  select: {
    role: true,
  },
});
```

### List Room Participants

```typescript
const participants = await prisma.participant.findMany({
  where: {
    roomId: 'room_xyz789',
    deletedAt: null,
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
  },
  orderBy: {
    joinedAt: 'asc',
  },
});
```

### Update Participant Role

```typescript
const participant = await prisma.participant.update({
  where: {
    id: 'part_123abc',
  },
  data: {
    role: 'MODERATOR',
  },
});
```

### Leave Room (Soft Delete)

```typescript
const participant = await prisma.participant.update({
  where: {
    id: 'part_123abc',
  },
  data: {
    deletedAt: new Date(),
  },
});
```

### Count Participants by Role

```typescript
const counts = await prisma.participant.groupBy({
  by: ['role'],
  where: {
    roomId: 'room_xyz789',
    deletedAt: null,
  },
  _count: {
    role: true,
  },
});
```

## Prize Queries

### Create Prize

```typescript
const prize = await prisma.prize.create({
  data: {
    roomId: 'room_xyz789',
    name: 'iPhone 15 Pro',
    description: 'Latest iPhone model',
    imageUrl: 'https://example.com/iphone.jpg',
    quantity: 1,
    quantityRemaining: 1,
    metadata: {
      value: 999.99,
      sponsor: 'TechCorp',
    },
  },
});
```

### List Room Prizes

```typescript
const prizes = await prisma.prize.findMany({
  where: {
    roomId: 'room_xyz789',
    deletedAt: null,
  },
  include: {
    _count: {
      select: {
        winners: true,
      },
    },
  },
});
```

### Check Prize Availability

```typescript
const prize = await prisma.prize.findUnique({
  where: { id: 'prize_def456' },
  select: {
    quantityRemaining: true,
  },
});

const isAvailable = prize && prize.quantityRemaining > 0;
```

### Update Prize Quantity

```typescript
const prize = await prisma.prize.update({
  where: { id: 'prize_def456' },
  data: {
    quantityRemaining: {
      decrement: 1,
    },
  },
});
```

## Winner Queries

### Select Winner (Transaction)

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Check prize availability
  const prize = await tx.prize.findUnique({
    where: { id: 'prize_def456' },
  });

  if (!prize || prize.quantityRemaining < 1) {
    throw new Error('Prize not available');
  }

  // Create winner
  const winner = await tx.winner.create({
    data: {
      roomId: 'room_xyz789',
      participantId: 'part_123abc',
      prizeId: 'prize_def456',
      metadata: {
        drawNumber: 1,
        algorithm: 'random',
        timestamp: new Date().toISOString(),
      },
    },
    include: {
      participant: {
        include: {
          user: true,
        },
      },
      prize: true,
    },
  });

  // Update prize quantity
  await tx.prize.update({
    where: { id: 'prize_def456' },
    data: {
      quantityRemaining: {
        decrement: 1,
      },
    },
  });

  return winner;
});
```

### List Room Winners

```typescript
const winners = await prisma.winner.findMany({
  where: {
    roomId: 'room_xyz789',
    deletedAt: null,
  },
  include: {
    participant: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    },
    prize: {
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

### Get Winners by Prize

```typescript
const winners = await prisma.winner.findMany({
  where: {
    roomId: 'room_xyz789',
    prizeId: 'prize_def456',
  },
  include: {
    participant: {
      include: {
        user: true,
      },
    },
  },
});
```

### Check if Participant Already Won Prize

```typescript
const existingWinner = await prisma.winner.findFirst({
  where: {
    participantId: 'part_123abc',
    prizeId: 'prize_def456',
  },
});
```

### Revoke Winner (Soft Delete)

```typescript
const winner = await prisma.winner.update({
  where: { id: 'winner_ghi789' },
  data: {
    deletedAt: new Date(),
  },
});

// Restore prize quantity
await prisma.prize.update({
  where: { id: winner.prizeId },
  data: {
    quantityRemaining: {
      increment: 1,
    },
  },
});
```

## Complex Queries

### Get Room with Full Details

```typescript
const room = await prisma.room.findUnique({
  where: { id: 'room_xyz789' },
  include: {
    app: {
      select: {
        appId: true,
        manifest: true,
      },
    },
    organizer: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
    participants: {
      where: {
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    },
    prizes: {
      where: {
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            winners: true,
          },
        },
      },
    },
    winners: {
      where: {
        deletedAt: null,
      },
      include: {
        participant: {
          include: {
            user: true,
          },
        },
        prize: true,
      },
    },
  },
});
```

### Get User's Participations with Rooms

```typescript
const userParticipations = await prisma.participant.findMany({
  where: {
    userId: 'usr_abc123',
    deletedAt: null,
  },
  include: {
    room: {
      include: {
        app: true,
        _count: {
          select: {
            participants: true,
            prizes: true,
          },
        },
      },
    },
  },
  orderBy: {
    joinedAt: 'desc',
  },
});
```

### Search Rooms (Case-Insensitive)

```typescript
const rooms = await prisma.room.findMany({
  where: {
    OR: [
      {
        name: {
          contains: 'lottery',
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: 'lottery',
          mode: 'insensitive',
        },
      },
    ],
    status: 'ACTIVE',
    deletedAt: null,
  },
});
```

### Get Leaderboard (Winners Count)

```typescript
const leaderboard = await prisma.participant.findMany({
  where: {
    roomId: 'room_xyz789',
    deletedAt: null,
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
    _count: {
      select: {
        winners: true,
      },
    },
  },
  orderBy: {
    winners: {
      _count: 'desc',
    },
  },
  take: 10,
});
```

### Batch Delete (Soft Delete All Room Data)

```typescript
await prisma.$transaction([
  prisma.winner.updateMany({
    where: { roomId: 'room_xyz789' },
    data: { deletedAt: new Date() },
  }),
  prisma.participant.updateMany({
    where: { roomId: 'room_xyz789' },
    data: { deletedAt: new Date() },
  }),
  prisma.prize.updateMany({
    where: { roomId: 'room_xyz789' },
    data: { deletedAt: new Date() },
  }),
  prisma.room.update({
    where: { id: 'room_xyz789' },
    data: { deletedAt: new Date() },
  }),
]);
```

## Pagination Helpers

### Standard Pagination

```typescript
async function paginateRooms(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [rooms, total] = await prisma.$transaction([
    prisma.room.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: skip,
    }),
    prisma.room.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    }),
  ]);

  return {
    data: rooms,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

### Cursor-Based Pagination

```typescript
async function cursorPaginateRooms(cursor?: string, limit: number = 20) {
  const rooms = await prisma.room.findMany({
    take: limit + 1, // Fetch one extra to check if there's more
    ...(cursor && {
      skip: 1, // Skip the cursor
      cursor: {
        id: cursor,
      },
    }),
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const hasMore = rooms.length > limit;
  const data = hasMore ? rooms.slice(0, -1) : rooms;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    meta: {
      hasMore,
      nextCursor,
    },
  };
}
```

## Raw SQL Queries (Use Sparingly)

### Complex Aggregation

```typescript
const result = await prisma.$queryRaw`
  SELECT
    r.id,
    r.name,
    COUNT(DISTINCT p.id) as participant_count,
    COUNT(DISTINCT pr.id) as prize_count,
    COUNT(DISTINCT w.id) as winner_count
  FROM rooms r
  LEFT JOIN participants p ON r.id = p."roomId" AND p."deletedAt" IS NULL
  LEFT JOIN prizes pr ON r.id = pr."roomId" AND pr."deletedAt" IS NULL
  LEFT JOIN winners w ON r.id = w."roomId" AND w."deletedAt" IS NULL
  WHERE r."deletedAt" IS NULL
  GROUP BY r.id, r.name
  ORDER BY participant_count DESC
  LIMIT 10
`;
```

## Best Practices

1. **Always use transactions** for operations that modify multiple records
2. **Use select** to limit fields returned and improve performance
3. **Use include wisely** - don't over-fetch nested relations
4. **Use where filters** to exclude soft-deleted records
5. **Add indexes** for frequently queried fields
6. **Use pagination** for large result sets
7. **Validate input** before database queries
8. **Handle unique constraint violations** gracefully
9. **Use connection pooling** in production
10. **Monitor query performance** with Prisma's built-in logging

## Error Handling

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.participant.create({
    data: {
      userId: 'usr_123',
      roomId: 'room_456',
      role: 'PARTICIPANT',
    },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('User already joined this room');
    }
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      throw new Error('Invalid user or room ID');
    }
  }
  throw error;
}
```

## Logging

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## Manifest Versioning Queries

### Validate Room Settings Against Locked Version

```typescript
/**
 * Validate room settings against the manifest version it was created with
 */
async function validateRoomSettings(roomId: string) {
  // Fetch room with app data
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { app: true },
  });

  // Get manifest for room's locked version
  let manifest;

  if (room.app.manifestVersion === room.appManifestVersion) {
    // Room uses current version
    manifest = room.app.manifest;
  } else {
    // Room uses historical version - fetch from history
    const historyEntry = (room.app.manifestHistory as any[]).find(
      (entry) => entry.version === room.appManifestVersion
    );

    if (!historyEntry) {
      throw new Error(
        `Manifest version ${room.appManifestVersion} not found in history`
      );
    }

    manifest = historyEntry.manifest;
  }

  // Validate settings against correct schema
  const settingsSchema = manifest.settings;
  // Use JSON Schema validator here
  // const isValid = validateJsonSchema(room.appSettings, settingsSchema);

  return { manifest, settingsSchema };
}
```

### Find Rooms by Manifest Version

```typescript
// Find all rooms using v1.0.0
const roomsV1_0_0 = await prisma.room.findMany({
  where: {
    appId: 'app_lottery_v1',
    appManifestVersion: '1.0.0',
    deletedAt: null,
  },
  include: {
    _count: {
      select: {
        participants: true,
        prizes: true,
      },
    },
  },
});
```

### Count Rooms per Manifest Version

```typescript
// Get distribution of rooms across manifest versions
const versionDistribution = await prisma.room.groupBy({
  by: ['appManifestVersion'],
  where: {
    appId: 'app_lottery_v1',
    deletedAt: null,
  },
  _count: {
    id: true,
  },
  orderBy: {
    _count: {
      id: 'desc',
    },
  },
});

// Result: [
//   { appManifestVersion: '1.0.0', _count: { id: 42 } },
//   { appManifestVersion: '1.1.0', _count: { id: 18 } },
//   { appManifestVersion: '1.2.0', _count: { id: 5 } },
// ]
```

### Find Rooms Needing Upgrade

```typescript
// Find active rooms using outdated manifest versions
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

const currentVersion = app.manifestVersion;

const outdatedRooms = await prisma.room.findMany({
  where: {
    appId: 'app_lottery_v1',
    appManifestVersion: {
      not: currentVersion, // Not using current version
    },
    status: {
      in: ['DRAFT', 'ACTIVE'], // Only active rooms
    },
    deletedAt: null,
  },
  include: {
    organizer: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
  orderBy: {
    createdAt: 'asc', // Oldest first
  },
});
```

### Upgrade Room to New Manifest Version

```typescript
/**
 * Upgrade a room to a new manifest version
 * Should validate settings against new schema first
 */
async function upgradeRoomManifest(roomId: string, targetVersion: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { app: true },
  });

  // Get target manifest
  let targetManifest;

  if (room.app.manifestVersion === targetVersion) {
    targetManifest = room.app.manifest;
  } else {
    const historyEntry = (room.app.manifestHistory as any[]).find(
      (entry) => entry.version === targetVersion
    );

    if (!historyEntry) {
      throw new Error(`Target version ${targetVersion} not found`);
    }

    targetManifest = historyEntry.manifest;
  }

  // Validate current settings against new schema
  const settingsSchema = targetManifest.settings;
  // const isValid = validateJsonSchema(room.appSettings, settingsSchema);
  // if (!isValid) throw new Error('Settings incompatible with target version');

  // Upgrade room
  return await prisma.room.update({
    where: { id: roomId },
    data: {
      appManifestVersion: targetVersion,
    },
  });
}
```

### Find Deprecated Manifest Versions

```typescript
/**
 * Find deprecated manifest versions from history
 */
async function getDeprecatedVersions(appId: string) {
  const app = await prisma.app.findUnique({
    where: { appId },
  });

  const deprecatedVersions = (app.manifestHistory as any[]).filter(
    (entry) => entry.deprecatedAt !== null
  );

  return deprecatedVersions.map((entry) => ({
    version: entry.version,
    deprecatedAt: entry.deprecatedAt,
    deprecationReason: entry.deprecationReason,
  }));
}
```

### Get Rooms Affected by Deprecation

```typescript
/**
 * Find active rooms using a specific deprecated version
 */
async function getRoomsOnDeprecatedVersion(
  appId: string,
  deprecatedVersion: string
) {
  return await prisma.room.findMany({
    where: {
      appId: appId,
      appManifestVersion: deprecatedVersion,
      status: {
        in: ['DRAFT', 'ACTIVE'],
      },
      deletedAt: null,
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          participants: true,
          prizes: true,
        },
      },
    },
  });
}
```

### Bulk Upgrade Rooms (with Transaction)

```typescript
/**
 * Bulk upgrade compatible rooms to new manifest version
 * Only upgrades rooms where settings are compatible
 */
async function bulkUpgradeRooms(
  appId: string,
  fromVersion: string,
  toVersion: string
) {
  // Find rooms to upgrade
  const roomsToUpgrade = await prisma.room.findMany({
    where: {
      appId: appId,
      appManifestVersion: fromVersion,
      deletedAt: null,
    },
  });

  // Get target manifest for validation
  const app = await prisma.app.findUnique({
    where: { appId },
  });

  let targetManifest;
  if (app.manifestVersion === toVersion) {
    targetManifest = app.manifest;
  } else {
    const entry = (app.manifestHistory as any[]).find(
      (e) => e.version === toVersion
    );
    targetManifest = entry?.manifest;
  }

  // Validate and upgrade in transaction
  const results = await prisma.$transaction(
    roomsToUpgrade.map((room) => {
      // Validate settings against target schema
      // const isValid = validateJsonSchema(room.appSettings, targetManifest.settings);

      // Only upgrade if compatible
      // if (isValid) {
        return prisma.room.update({
          where: { id: room.id },
          data: { appManifestVersion: toVersion },
        });
      // } else {
      //   return null; // Skip incompatible rooms
      // }
    })
  );

  return {
    totalRooms: roomsToUpgrade.length,
    upgradedCount: results.filter((r) => r !== null).length,
  };
}
```

### Get Manifest Version Timeline

```typescript
/**
 * Get complete version history for an app
 */
async function getManifestTimeline(appId: string) {
  const app = await prisma.app.findUnique({
    where: { appId },
  });

  // Combine current version with history
  const timeline = [
    ...(app.manifestHistory as any[]).map((entry) => ({
      version: entry.version,
      publishedAt: entry.publishedAt,
      deprecatedAt: entry.deprecatedAt,
      isCurrent: false,
    })),
    {
      version: app.manifestVersion,
      publishedAt: app.updatedAt.toISOString(),
      deprecatedAt: null,
      isCurrent: true,
    },
  ];

  // Sort by version (newest first)
  return timeline.sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true })
  );
}
```

### Manifest Version Analytics

```typescript
/**
 * Get analytics about manifest version adoption
 */
async function getVersionAnalytics(appId: string) {
  const app = await prisma.app.findUnique({
    where: { appId },
  });

  // Count rooms per version
  const versionCounts = await prisma.room.groupBy({
    by: ['appManifestVersion'],
    where: {
      appId: appId,
      deletedAt: null,
    },
    _count: {
      id: true,
    },
  });

  // Calculate percentages
  const totalRooms = versionCounts.reduce((sum, v) => sum + v._count.id, 0);

  const analytics = versionCounts.map((v) => {
    const isDeprecated = (app.manifestHistory as any[]).some(
      (entry) => entry.version === v.appManifestVersion && entry.deprecatedAt !== null
    );

    return {
      version: v.appManifestVersion,
      roomCount: v._count.id,
      percentage: ((v._count.id / totalRooms) * 100).toFixed(2),
      isCurrent: v.appManifestVersion === app.manifestVersion,
      isDeprecated: isDeprecated,
    };
  });

  return {
    currentVersion: app.manifestVersion,
    totalRooms,
    versionBreakdown: analytics,
  };
}
```

---

## Billing & Subscription Queries

### Create Subscription Plan

```typescript
const freePlan = await prisma.subscriptionPlan.create({
  data: {
    tier: 'FREE',
    name: 'Free Plan',
    description: 'Perfect for trying out the platform',
    price: 0,
    currency: 'USD',
    billingInterval: 'MONTHLY',
    isActive: true,
    displayOrder: 0,
    features: {
      maxRooms: 3,
      maxParticipantsPerRoom: 50,
      maxPrizesPerRoom: 10,
      apps: ['app_lottery_v1'],
      features: ['basic_analytics', 'community_support'],
      trialDays: 0,
    },
  },
});
```

### Create User Subscription

```typescript
const subscription = await prisma.subscription.create({
  data: {
    userId: 'usr_abc123',
    planId: freePlan.id,
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
  },
  include: {
    plan: true,
    user: {
      select: {
        id: true,
        email: true,
        name: true,
      },
    },
  },
});
```

### Get User's Active Subscription

```typescript
const activeSubscription = await prisma.subscription.findFirst({
  where: {
    userId: 'usr_abc123',
    status: 'ACTIVE',
    deletedAt: null,
  },
  include: {
    plan: true,
  },
});

// Extract features
const features = activeSubscription.plan.features as any;
const maxRooms = features.maxRooms;
const hasAdvancedAnalytics = features.features?.includes('advanced_analytics');
```

### Start Trial Subscription

```typescript
const proPlan = await prisma.subscriptionPlan.findFirst({
  where: {
    tier: 'PRO',
    billingInterval: 'MONTHLY',
  },
});

const features = proPlan.features as any;
const trialDays = features.trialDays || 14;

const trialSubscription = await prisma.subscription.create({
  data: {
    userId: 'usr_abc123',
    planId: proPlan.id,
    status: 'TRIALING',
    trialStart: new Date(),
    trialEnd: new Date(Date.now() + trialDays * 24 * 3600 * 1000),
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  },
});
```

### Convert Trial to Paid

```typescript
// After successful Stripe payment
await prisma.subscription.update({
  where: { id: trialSubscription.id },
  data: {
    status: 'ACTIVE',
    stripeCustomerId: 'cus_xxx',
    stripeSubscriptionId: 'sub_xxx',
  },
});

// Create payment record
await prisma.payment.create({
  data: {
    subscriptionId: trialSubscription.id,
    userId: 'usr_abc123',
    amount: 2999, // $29.99
    currency: 'USD',
    status: 'succeeded',
    paymentMethod: 'card',
    stripePaymentIntentId: 'pi_xxx',
    stripeChargeId: 'ch_xxx',
  },
});
```

### Cancel Subscription

```typescript
// User cancels (but subscription stays active until period end)
await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    cancelAtPeriodEnd: true,
    canceledAt: new Date(),
    cancelReason: 'Too expensive',
    status: 'CANCELED',
  },
});
```

### Check Subscription Limits

```typescript
async function checkRoomLimit(userId: string): Promise<boolean> {
  // Get active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: { plan: true },
  });

  const features = subscription.plan.features as any;
  const maxRooms = features.maxRooms;

  // -1 means unlimited
  if (maxRooms === -1) return true;

  // Count user's rooms
  const roomCount = await prisma.room.count({
    where: {
      createdBy: userId,
      deletedAt: null,
    },
  });

  return roomCount < maxRooms;
}
```

### Track Usage

```typescript
// Track room creation
await prisma.usageRecord.create({
  data: {
    subscriptionId: subscription.id,
    userId: 'usr_abc123',
    metricName: 'rooms_created',
    quantity: 1,
    metadata: {
      roomId: 'room_xyz789',
      appId: 'app_lottery_v1',
    },
  },
});

// Track participant addition
await prisma.usageRecord.create({
  data: {
    subscriptionId: subscription.id,
    userId: 'usr_abc123',
    metricName: 'participants_added',
    quantity: 1,
    metadata: {
      roomId: 'room_xyz789',
      participantId: 'part_123abc',
    },
  },
});
```

### Get Usage for Current Period

```typescript
const subscription = await prisma.subscription.findUnique({
  where: { id: 'sub_xxx' },
});

const usage = await prisma.usageRecord.groupBy({
  by: ['metricName'],
  where: {
    subscriptionId: subscription.id,
    timestamp: {
      gte: subscription.currentPeriodStart,
      lte: subscription.currentPeriodEnd,
    },
    deletedAt: null,
  },
  _sum: {
    quantity: true,
  },
});

// Result:
// [
//   { metricName: 'rooms_created', _sum: { quantity: 5 } },
//   { metricName: 'participants_added', _sum: { quantity: 42 } },
// ]
```

### Create Invoice

```typescript
const invoice = await prisma.invoice.create({
  data: {
    subscriptionId: subscription.id,
    userId: 'usr_abc123',
    invoiceNumber: 'INV-2025-001',
    amount: 2999,
    currency: 'USD',
    status: 'open',
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
    stripeInvoiceId: 'in_xxx',
    lineItems: [
      {
        description: 'Pro Plan - January 2025',
        quantity: 1,
        unitPrice: 2999,
        total: 2999,
      },
    ],
  },
});
```

### Mark Invoice as Paid

```typescript
await prisma.invoice.update({
  where: { id: invoice.id },
  data: {
    status: 'paid',
    paidAt: new Date(),
  },
});
```

### Get Expiring Subscriptions

```typescript
// Find subscriptions expiring in next 7 days
const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 3600 * 1000);

const expiring = await prisma.subscription.findMany({
  where: {
    status: 'ACTIVE',
    currentPeriodEnd: {
      lte: sevenDaysFromNow,
      gte: new Date(),
    },
    deletedAt: null,
  },
  include: {
    user: {
      select: {
        id: true,
        email: true,
        name: true,
      },
    },
    plan: true,
  },
  orderBy: {
    currentPeriodEnd: 'asc',
  },
});
```

### Get Subscriptions by Status

```typescript
// Get all active subscriptions
const activeSubscriptions = await prisma.subscription.findMany({
  where: {
    status: 'ACTIVE',
    deletedAt: null,
  },
  include: {
    user: true,
    plan: true,
  },
});

// Get trialing subscriptions
const trials = await prisma.subscription.findMany({
  where: {
    status: 'TRIALING',
    deletedAt: null,
  },
  include: {
    user: true,
    plan: true,
  },
});

// Get past due subscriptions (payment failed)
const pastDue = await prisma.subscription.findMany({
  where: {
    status: 'PAST_DUE',
    deletedAt: null,
  },
  include: {
    user: true,
    plan: true,
  },
});
```

### Calculate MRR (Monthly Recurring Revenue)

```typescript
// Get all active monthly subscriptions
const monthlySubscriptions = await prisma.subscription.findMany({
  where: {
    status: 'ACTIVE',
    deletedAt: null,
  },
  include: {
    plan: {
      where: {
        billingInterval: 'MONTHLY',
      },
    },
  },
});

// Sum up monthly revenue
const mrr = monthlySubscriptions.reduce((total, sub) => {
  return total + (sub.plan?.price || 0);
}, 0);

console.log(`MRR: $${mrr / 100}`);
```

### Get Payment History for User

```typescript
const payments = await prisma.payment.findMany({
  where: {
    userId: 'usr_abc123',
    deletedAt: null,
  },
  orderBy: {
    createdAt: 'desc',
  },
  include: {
    subscription: {
      include: {
        plan: true,
      },
    },
  },
});
```

### Subscription Analytics

```typescript
// Count subscriptions by tier
const tierDistribution = await prisma.subscription.groupBy({
  by: ['planId'],
  where: {
    status: 'ACTIVE',
    deletedAt: null,
  },
  _count: {
    id: true,
  },
});

// Get plan details
for (const tier of tierDistribution) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: tier.planId },
  });

  console.log(`${plan.name}: ${tier._count.id} subscriptions`);
}
```

### Failed Payments

```typescript
// Get failed payments in last 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

const failedPayments = await prisma.payment.findMany({
  where: {
    status: 'failed',
    createdAt: {
      gte: thirtyDaysAgo,
    },
    deletedAt: null,
  },
  include: {
    subscription: {
      include: {
        user: true,
        plan: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// Calculate failure rate
const totalPayments = await prisma.payment.count({
  where: {
    createdAt: { gte: thirtyDaysAgo },
  },
});

const failureRate = (failedPayments.length / totalPayments) * 100;
console.log(`Payment failure rate: ${failureRate.toFixed(2)}%`);
```

### Upgrade Subscription

```typescript
// User upgrades from Free to Pro
const currentSubscription = await prisma.subscription.findFirst({
  where: {
    userId: 'usr_abc123',
    status: 'ACTIVE',
  },
});

const proPlan = await prisma.subscriptionPlan.findFirst({
  where: {
    tier: 'PRO',
    billingInterval: 'MONTHLY',
  },
});

// Mark old subscription as expired
await prisma.subscription.update({
  where: { id: currentSubscription.id },
  data: {
    status: 'EXPIRED',
    deletedAt: new Date(),
  },
});

// Create new subscription
const newSubscription = await prisma.subscription.create({
  data: {
    userId: 'usr_abc123',
    planId: proPlan.id,
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    stripeCustomerId: currentSubscription.stripeCustomerId,
    stripeSubscriptionId: 'sub_new_xxx',
  },
});
```

### Downgrade Subscription (at period end)

```typescript
// Mark for downgrade at end of current period
await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    metadata: {
      downgradeToTier: 'FREE',
      downgradePlanId: freePlan.id,
      downgradeAt: subscription.currentPeriodEnd,
    },
  },
});

// In a cron job, check for pending downgrades
const now = new Date();

const pendingDowngrades = await prisma.subscription.findMany({
  where: {
    status: 'ACTIVE',
    currentPeriodEnd: {
      lte: now,
    },
    // Check metadata for downgrade flag
  },
});

for (const sub of pendingDowngrades) {
  const metadata = sub.metadata as any;

  if (metadata.downgradeToTier) {
    // Expire current subscription
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'EXPIRED',
        deletedAt: new Date(),
      },
    });

    // Create new subscription with lower tier
    await prisma.subscription.create({
      data: {
        userId: sub.userId,
        planId: metadata.downgradePlanId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  }
}
```

---

## Manifest Versioning Best Practices

### 1. Always Lock Rooms to Manifest Version

```typescript
// GOOD: Lock room to current manifest version
const app = await prisma.app.findUnique({ where: { appId } });
await prisma.room.create({
  data: {
    // ... other fields
    appManifestVersion: app.manifestVersion, // Lock to current
  },
});

// BAD: Don't create rooms without version lock
await prisma.room.create({
  data: {
    // ... other fields
    // Missing appManifestVersion!
  },
});
```

### 2. Validate Against Locked Version

```typescript
// GOOD: Fetch manifest for room's locked version
const room = await prisma.room.findUnique({
  where: { id: roomId },
  include: { app: true },
});

const manifest = getManifestForVersion(room.app, room.appManifestVersion);
validateSettings(room.appSettings, manifest.settings);

// BAD: Validate against current manifest
validateSettings(room.appSettings, room.app.manifest.settings); // Wrong version!
```

### 3. Archive Before Updating

```typescript
// GOOD: Archive current version before updating
const currentApp = await prisma.app.findUnique({ where: { appId } });

const updatedHistory = [
  ...(currentApp.manifestHistory as any[]),
  {
    version: currentApp.manifestVersion,
    manifest: currentApp.manifest,
    publishedAt: currentApp.updatedAt.toISOString(),
    deprecatedAt: null,
  },
];

await prisma.app.update({
  where: { appId },
  data: {
    manifest: newManifest,
    manifestVersion: newVersion,
    manifestHistory: updatedHistory,
  },
});

// BAD: Update without archiving
await prisma.app.update({
  where: { appId },
  data: {
    manifest: newManifest, // Old version lost forever!
  },
});
```

### 4. Check Compatibility Before Upgrade

```typescript
// GOOD: Validate before upgrading
const isCompatible = validateSettings(room.appSettings, targetManifest.settings);

if (isCompatible) {
  await upgradeRoom(roomId, targetVersion);
} else {
  throw new Error('Room settings incompatible with target version');
}

// BAD: Upgrade without validation
await prisma.room.update({
  where: { id: roomId },
  data: { appManifestVersion: targetVersion }, // May break room!
});
```
