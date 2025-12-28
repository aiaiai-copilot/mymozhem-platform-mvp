# Database Schema Diagram

Visual representation of the Event Management Platform database schema.

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVENT PLATFORM SCHEMA                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│      User        │
├──────────────────┤
│ id (PK)          │◄────────┐
│ email (UK)       │         │
│ name             │         │
│ avatar           │         │
│ provider         │         │
│ providerId       │         │
│ emailVerified    │         │
│ createdAt        │         │
│ updatedAt        │         │
│ deletedAt        │         │
└──────────────────┘         │
        │                    │
        │ 1:N                │
        ▼                    │
┌──────────────────┐         │
│    Session       │         │
├──────────────────┤         │
│ id (PK)          │         │
│ userId (FK) ─────┼─────────┘
│ accessToken (UK) │
│ refreshToken (UK)│
│ expiresAt        │
│ createdAt        │
│ updatedAt        │
└──────────────────┘


┌──────────────────┐
│       App        │
├──────────────────┤
│ id (PK)          │◄────────┐
│ appId (UK)       │         │
│ appSecret (UK)   │         │
│ manifest (JSON)  │         │
│ isActive         │         │
│ createdAt        │         │
│ updatedAt        │         │
│ deletedAt        │         │
└──────────────────┘         │
                             │
                             │ 1:N
                             │
┌──────────────────┐         │
│      Room        │         │
├──────────────────┤         │
│ id (PK)          │         │
│ name             │         │
│ description      │         │
│ appId (FK) ──────┼─────────┘
│ appSettings(JSON)│
│ status (enum)    │◄────────┐
│ isPublic         │         │
│ createdBy (FK) ──┼──┐      │
│ createdAt        │  │      │
│ updatedAt        │  │      │
│ deletedAt        │  │      │
└──────────────────┘  │      │
        │             │      │
        │ 1:N         │      │
        │             │      │
        ▼             │      │
┌──────────────────┐  │      │
│   Participant    │  │      │
├──────────────────┤  │      │
│ id (PK)          │  │      │
│ userId (FK) ─────┼──┼──────┼──► User (from above)
│ roomId (FK) ─────┼──┘      │
│ role (enum)      │         │
│ metadata (JSON)  │         │
│ joinedAt         │         │
│ updatedAt        │         │
│ deletedAt        │         │
└──────────────────┘         │
        │                    │
        │ 1:N                │
        │                    │
        ▼                    │
┌──────────────────┐         │
│     Winner       │         │
├──────────────────┤         │
│ id (PK)          │         │
│ roomId (FK) ─────┼─────────┘
│ participantId(FK)│─────────► Participant
│ prizeId (FK)     │─────┐
│ metadata (JSON)  │     │
│ createdAt        │     │
│ deletedAt        │     │
└──────────────────┘     │
                         │
                         │ N:1
                         ▼
                  ┌──────────────────┐
                  │      Prize       │
                  ├──────────────────┤
                  │ id (PK)          │
                  │ roomId (FK) ─────┼──► Room
                  │ name             │
                  │ description      │
                  │ imageUrl         │
                  │ quantity         │
                  │ quantityRemaining│
                  │ metadata (JSON)  │
                  │ createdAt        │
                  │ updatedAt        │
                  │ deletedAt        │
                  └──────────────────┘
```

## Relationship Summary

### User Relationships
- **User → Session** (1:N) - User can have multiple active sessions
- **User → Participant** (1:N) - User can participate in multiple rooms
- **User → Room** (1:N) - User can organize multiple rooms (via createdBy)

### App Relationships
- **App → Room** (1:N) - App can power multiple rooms

### Room Relationships
- **Room → App** (N:1) - Room belongs to one app
- **Room → User** (N:1) - Room has one organizer
- **Room → Participant** (1:N) - Room has many participants
- **Room → Prize** (1:N) - Room has multiple prizes
- **Room → Winner** (1:N) - Room has multiple winners

### Participant Relationships
- **Participant → User** (N:1) - Participant is one user
- **Participant → Room** (N:1) - Participant belongs to one room
- **Participant → Winner** (1:N) - Participant can win multiple prizes

### Prize Relationships
- **Prize → Room** (N:1) - Prize belongs to one room
- **Prize → Winner** (1:N) - Prize can have multiple winners (if quantity > 1)

### Winner Relationships
- **Winner → Room** (N:1) - Winner belongs to one room
- **Winner → Participant** (N:1) - Winner is one participant
- **Winner → Prize** (N:1) - Winner gets one prize instance

## Cascade Behavior

```
DELETE User
  └─► CASCADE delete Sessions
  └─► CASCADE delete Participants
      └─► CASCADE delete Winners
  └─► RESTRICT if created Rooms (must delete/transfer first)

DELETE App
  └─► RESTRICT if has Rooms (must delete rooms first)

DELETE Room
  └─► CASCADE delete Participants
      └─► CASCADE delete Winners
  └─► CASCADE delete Prizes
      └─► RESTRICT if has Winners (must delete winners first)
  └─► CASCADE delete Winners

DELETE Participant
  └─► CASCADE delete Winners

DELETE Prize
  └─► RESTRICT if has Winners (must delete winners first)
```

## Data Flow Diagrams

### User Authentication Flow

```
┌─────────┐     ┌──────────┐     ┌─────────┐
│ OAuth   │────►│   User   │────►│ Session │
│Provider │     │  (create)│     │ (create)│
└─────────┘     └──────────┘     └─────────┘
                      │
                      ▼
              ┌──────────────┐
              │ accessToken  │
              │ refreshToken │
              └──────────────┘
```

### Room Creation Flow

```
┌──────┐     ┌──────┐     ┌──────────────┐
│ User │────►│ Room │────►│ Participant  │
│      │     │      │     │ (ORGANIZER)  │
└──────┘     └──────┘     └──────────────┘
               │
               ▼
          ┌────────┐
          │  App   │
          │validate│
          └────────┘
```

### Join Room Flow

```
┌──────┐     ┌──────────────┐
│ User │────►│ Participant  │
│      │     │ (PARTICIPANT)│
└──────┘     └──────────────┘
                    │
                    ▼
              ┌──────────┐
              │   Room   │
              │ (exists?)│
              └──────────┘
```

### Winner Selection Flow

```
┌──────────────┐     ┌─────────┐     ┌────────┐
│ Participant  │────►│ Winner  │────►│ Prize  │
│   (exists)   │     │ (create)│     │(reduce)│
└──────────────┘     └─────────┘     └────────┘
        │                                  │
        └──────────────────────────────────┘
              (validate availability)
```

## Index Coverage

### Query: List Active Rooms
```sql
WHERE status = 'ACTIVE' AND isPublic = true AND appId = ?
```
**Index Used:** `rooms(status, isPublic, appId)` [Composite]

### Query: User Login
```sql
WHERE email = ?
```
**Index Used:** `users(email)` [Unique]

### Query: Check Permission
```sql
WHERE userId = ? AND roomId = ?
```
**Index Used:** `participants(userId, roomId)` [Unique Composite]

### Query: Session Validation
```sql
WHERE accessToken = ? AND expiresAt > NOW()
```
**Index Used:** `sessions(accessToken)` [Unique], `sessions(expiresAt)` [Single]

### Query: Room Participants by Role
```sql
WHERE roomId = ? AND role = 'MODERATOR'
```
**Index Used:** `participants(roomId, role)` [Composite]

### Query: Prize Winners
```sql
WHERE roomId = ? AND prizeId = ?
```
**Index Used:** `winners(roomId, prizeId)` [Composite]

## JSON Field Structures

### App.manifest
```json
{
  "meta": { "name": "...", "version": "...", "description": "..." },
  "baseUrl": "https://...",
  "capabilities": ["winnerSelection", "notifications"],
  "permissions": ["users:read", "rooms:write"],
  "settings": { /* JSON Schema */ }
}
```

### Room.appSettings
```json
{
  "ticketCount": 100,
  "drawDate": "2025-12-31T23:00:00Z",
  "customField": "value"
}
```
Validated against `App.manifest.settings` schema.

### Participant.metadata
```json
{
  "ticketNumber": 42,
  "score": 150,
  "customData": { /* app-specific */ }
}
```

### Prize.metadata
```json
{
  "value": 999.99,
  "sponsor": "TechCorp",
  "category": "electronics",
  "sku": "IPHONE-15-PRO"
}
```

### Winner.metadata
```json
{
  "drawNumber": 1,
  "algorithm": "random",
  "timestamp": "2025-12-31T23:00:00Z",
  "ticketDrawn": 42
}
```

## Enum Values

### RoomStatus
```
DRAFT      → ACTIVE → COMPLETED
             ↓
           CANCELLED
```

**Transitions:**
- `DRAFT` → `ACTIVE` (room starts)
- `ACTIVE` → `COMPLETED` (room ends normally)
- `ACTIVE` → `CANCELLED` (room cancelled)
- `DRAFT` → `CANCELLED` (cancelled before start)

### ParticipantRole
```
Hierarchy (permissions):
ADMIN > ORGANIZER > MODERATOR > PARTICIPANT > VIEWER
```

**Capabilities:**
- `ADMIN` - Platform-wide permissions
- `ORGANIZER` - Full room control
- `MODERATOR` - Assist organizer
- `PARTICIPANT` - Join, compete, win
- `VIEWER` - Observe only

## Unique Constraints

| Table | Fields | Purpose |
|-------|--------|---------|
| users | `email` | One account per email |
| users | `(provider, providerId)` | One OAuth account per provider |
| sessions | `accessToken` | Token uniqueness |
| sessions | `refreshToken` | Token uniqueness |
| apps | `appId` | App identifier |
| apps | `appSecret` | Credential uniqueness |
| participants | `(userId, roomId)` | No duplicate joins |

## Soft Delete Queries

Always filter out soft-deleted records:

```sql
-- ✅ Correct
SELECT * FROM users WHERE deletedAt IS NULL;

-- ❌ Wrong (includes deleted)
SELECT * FROM users;
```

## Foreign Key Constraints

All foreign keys enforce referential integrity:

```
sessions.userId → users.id
rooms.appId → apps.appId
rooms.createdBy → users.id
participants.userId → users.id
participants.roomId → rooms.id
prizes.roomId → rooms.id
winners.roomId → rooms.id
winners.participantId → participants.id
winners.prizeId → prizes.id
```

## Performance Considerations

### Fast Queries (< 1ms)
- User lookup by email
- Session validation by token
- Permission check by user + room
- Prize availability check

### Medium Queries (< 10ms)
- Room listing with filters
- Participant list for room
- Winner list for room

### Slow Queries (> 10ms)
- Complex aggregations across multiple tables
- Full-text search (not yet implemented)
- Large result sets without pagination

### Optimization Strategies
1. Use pagination for large lists
2. Use `select` to limit returned fields
3. Use `include` sparingly (avoid N+1)
4. Add indexes for new query patterns
5. Use database views for complex joins
6. Implement caching for hot data

## Migration Naming Convention

```
YYYYMMDDHHMMSS_descriptive_name
```

Examples:
- `20251228000000_init` - Initial schema
- `20251229120000_add_user_preferences` - Add preferences table
- `20251230153000_alter_room_add_featured` - Add featured flag to rooms

## Conclusion

This schema provides:
- **Clear relationships** between all entities
- **Data integrity** through constraints
- **Performance** via strategic indexes
- **Flexibility** with JSON fields
- **Audit capability** through soft deletes
- **Security** with role-based access

**Ready for implementation!**
