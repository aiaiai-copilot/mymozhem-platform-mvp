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

### Create Session

```typescript
const session = await prisma.session.create({
  data: {
    userId: 'usr_abc123',
    accessToken: 'generated_access_token',
    refreshToken: 'generated_refresh_token',
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
  },
});
```

### Validate Access Token

```typescript
const session = await prisma.session.findFirst({
  where: {
    accessToken: 'token_value',
    expiresAt: {
      gt: new Date(), // Greater than current time
    },
  },
  include: {
    user: true,
  },
});
```

### Delete Session (Logout)

```typescript
await prisma.session.delete({
  where: {
    accessToken: 'token_value',
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

## App Queries

### Register Application

```typescript
const app = await prisma.app.create({
  data: {
    appId: 'app_lottery_v1',
    appSecret: 'sk_live_generated_secret',
    manifest: {
      meta: {
        name: 'Holiday Lottery',
        version: '1.0.0',
        description: 'Lottery application',
      },
      baseUrl: 'https://lottery.example.com',
      capabilities: ['winnerSelection'],
      permissions: ['users:read', 'rooms:read'],
      settings: { /* JSON Schema */ },
    },
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
const app = await prisma.app.update({
  where: { appId: 'app_lottery_v1' },
  data: {
    manifest: {
      /* updated manifest */
    },
  },
});
```

## Room Queries

### Create Room

```typescript
const room = await prisma.room.create({
  data: {
    name: 'New Year Lottery 2025',
    description: 'Win amazing prizes!',
    appId: 'app_lottery_v1',
    appSettings: {
      ticketCount: 100,
      drawDate: '2025-12-31T23:00:00Z',
    },
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
