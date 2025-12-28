# Database Index Strategy

## Overview

This document explains the indexing strategy for the Event Management Platform database, including justification for each index and performance considerations.

## Index Types

### 1. Primary Key Indexes (Automatic)

All tables use CUID as primary key, which PostgreSQL automatically indexes:
- `users(id)`
- `sessions(id)`
- `apps(id)`
- `rooms(id)`
- `participants(id)`
- `prizes(id)`
- `winners(id)`

**Benefits:**
- Fast lookups by ID
- Automatic for all JOIN operations
- Sortable (CUIDs are time-ordered)

### 2. Foreign Key Indexes (Automatic in PostgreSQL)

PostgreSQL automatically creates indexes on foreign key columns:
- `sessions(userId)`
- `rooms(appId, createdBy)`
- `participants(userId, roomId)`
- `prizes(roomId)`
- `winners(roomId, participantId, prizeId)`

**Benefits:**
- Fast JOIN operations
- Referential integrity checks
- ON DELETE CASCADE performance

### 3. Unique Constraint Indexes

#### users Table
```sql
CREATE UNIQUE INDEX ON users(email)
CREATE UNIQUE INDEX ON users(provider, providerId)
```

**Queries optimized:**
- User login by email
- OAuth provider lookup
- Duplicate account prevention

**Justification:**
```sql
-- Login query
SELECT * FROM users WHERE email = 'user@example.com';

-- OAuth callback
SELECT * FROM users WHERE provider = 'google' AND providerId = 'abc123';
```

#### sessions Table
```sql
CREATE UNIQUE INDEX ON sessions(accessToken)
CREATE UNIQUE INDEX ON sessions(refreshToken)
```

**Queries optimized:**
- Authentication middleware token validation
- Token refresh operations

**Justification:**
```sql
-- Every authenticated request
SELECT * FROM sessions WHERE accessToken = 'token' AND expiresAt > NOW();

-- Token refresh
SELECT * FROM sessions WHERE refreshToken = 'refresh_token';
```

#### apps Table
```sql
CREATE UNIQUE INDEX ON apps(appId)
CREATE UNIQUE INDEX ON apps(appSecret)
```

**Queries optimized:**
- App authentication
- Room creation validation

**Justification:**
```sql
-- App token generation
SELECT * FROM apps WHERE appId = 'app_lottery_v1' AND appSecret = 'sk_live_...';

-- Room creation
SELECT * FROM apps WHERE appId = 'app_lottery_v1';
```

#### participants Table
```sql
CREATE UNIQUE INDEX ON participants(userId, roomId)
```

**Queries optimized:**
- Duplicate participant prevention
- Join room validation

**Justification:**
```sql
-- Check if user already in room
SELECT * FROM participants WHERE userId = 'usr_123' AND roomId = 'room_456';
```

### 4. Single-Column Indexes

#### users Table
```sql
CREATE INDEX ON users(deletedAt)
```

**Queries optimized:**
- Active user filtering
- Soft delete exclusion

**Justification:**
```sql
-- List active users
SELECT * FROM users WHERE deletedAt IS NULL;
```

#### sessions Table
```sql
CREATE INDEX ON sessions(expiresAt)
```

**Queries optimized:**
- Expired session cleanup
- Active session validation

**Justification:**
```sql
-- Cleanup job
DELETE FROM sessions WHERE expiresAt < NOW();

-- Active sessions
SELECT * FROM sessions WHERE userId = 'usr_123' AND expiresAt > NOW();
```

#### apps Table
```sql
CREATE INDEX ON apps(isActive)
CREATE INDEX ON apps(deletedAt)
```

**Queries optimized:**
- Active app listings
- Soft delete filtering

**Justification:**
```sql
-- List available apps
SELECT * FROM apps WHERE isActive = true AND deletedAt IS NULL;
```

#### rooms Table
```sql
CREATE INDEX ON rooms(status)
CREATE INDEX ON rooms(isPublic)
CREATE INDEX ON rooms(createdAt)
CREATE INDEX ON rooms(deletedAt)
```

**Queries optimized:**
- Room listings by status
- Public room discovery
- Recent rooms sorting
- Active room filtering

**Justification:**
```sql
-- Public active rooms
SELECT * FROM rooms WHERE isPublic = true AND status = 'ACTIVE' AND deletedAt IS NULL;

-- Recent rooms
SELECT * FROM rooms ORDER BY createdAt DESC LIMIT 20;
```

#### participants Table
```sql
CREATE INDEX ON participants(role)
CREATE INDEX ON participants(deletedAt)
```

**Queries optimized:**
- Role-based filtering
- Active participant lists

**Justification:**
```sql
-- List organizers
SELECT * FROM participants WHERE roomId = 'room_123' AND role = 'ORGANIZER';

-- Active participants only
SELECT * FROM participants WHERE deletedAt IS NULL;
```

#### prizes Table
```sql
CREATE INDEX ON prizes(deletedAt)
```

**Queries optimized:**
- Active prize listings

**Justification:**
```sql
-- Room prizes
SELECT * FROM prizes WHERE roomId = 'room_123' AND deletedAt IS NULL;
```

#### winners Table
```sql
CREATE INDEX ON winners(createdAt)
CREATE INDEX ON winners(deletedAt)
```

**Queries optimized:**
- Winner announcement ordering
- Active winner filtering

**Justification:**
```sql
-- Recent winners first
SELECT * FROM winners WHERE roomId = 'room_123' ORDER BY createdAt DESC;
```

### 5. Composite Indexes

#### rooms Table
```sql
CREATE INDEX ON rooms(status, isPublic, appId)
```

**Queries optimized:**
- Complex room filtering with multiple criteria

**Justification:**
```sql
-- Common API query with multiple filters
SELECT * FROM rooms
WHERE status = 'ACTIVE'
  AND isPublic = true
  AND appId = 'app_lottery_v1'
  AND deletedAt IS NULL
ORDER BY createdAt DESC;
```

**Why composite?**
- PostgreSQL can use leftmost prefix of index
- Covers common filtering patterns
- Reduces need for multiple index scans

**Supported queries:**
- `WHERE status = ?`
- `WHERE status = ? AND isPublic = ?`
- `WHERE status = ? AND isPublic = ? AND appId = ?`

#### participants Table
```sql
CREATE INDEX ON participants(roomId, role)
```

**Queries optimized:**
- Role-based participant queries within rooms

**Justification:**
```sql
-- Get all organizers/moderators for a room
SELECT * FROM participants
WHERE roomId = 'room_123'
  AND role IN ('ORGANIZER', 'MODERATOR')
  AND deletedAt IS NULL;
```

**Why composite?**
- Very common query pattern
- roomId filters to specific room, role further narrows
- Used in permission checks

#### winners Table
```sql
CREATE INDEX ON winners(roomId, prizeId)
```

**Queries optimized:**
- Prize-specific winner lookups
- Prize distribution tracking

**Justification:**
```sql
-- Winners for specific prize
SELECT * FROM winners
WHERE roomId = 'room_123'
  AND prizeId = 'prize_456';

-- Count winners per prize
SELECT prizeId, COUNT(*)
FROM winners
WHERE roomId = 'room_123'
GROUP BY prizeId;
```

## Index Maintenance

### Automatic Maintenance

PostgreSQL automatically maintains indexes on:
- INSERT operations
- UPDATE operations
- DELETE operations

### Vacuum & Analyze

Run periodically to optimize index performance:

```sql
-- Vacuum entire database
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE rooms;
```

**Recommendation:** Run weekly or after bulk operations.

### Index Usage Monitoring

Check if indexes are actually being used:

```sql
-- View index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**Unused indexes (idx_scan = 0)** should be investigated for removal.

### Query Performance Analysis

Use EXPLAIN ANALYZE to verify index usage:

```sql
EXPLAIN ANALYZE
SELECT * FROM rooms
WHERE status = 'ACTIVE'
  AND isPublic = true
  AND deletedAt IS NULL;
```

Look for:
- `Index Scan` or `Bitmap Index Scan` (good)
- `Seq Scan` on large tables (bad)

## Index Size Considerations

Monitor index sizes:

```sql
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Trade-offs:**
- Indexes speed up reads but slow down writes
- Each index takes disk space
- Too many indexes can confuse query planner

## Common Query Patterns

### 1. List Active Public Rooms
```sql
SELECT * FROM rooms
WHERE status = 'ACTIVE'
  AND isPublic = true
  AND deletedAt IS NULL
ORDER BY createdAt DESC
LIMIT 20;
```

**Indexes used:**
- `rooms(status, isPublic, appId)` for filtering
- `rooms(createdAt)` for sorting

### 2. Get Room with Details
```sql
SELECT r.*, a.manifest
FROM rooms r
JOIN apps a ON r.appId = a.appId
WHERE r.id = 'room_123';
```

**Indexes used:**
- `rooms(id)` - primary key
- `apps(appId)` - unique constraint

### 3. List Room Participants
```sql
SELECT p.*, u.name, u.avatar
FROM participants p
JOIN users u ON p.userId = u.id
WHERE p.roomId = 'room_123'
  AND p.deletedAt IS NULL
ORDER BY p.joinedAt ASC;
```

**Indexes used:**
- `participants(roomId)` - foreign key
- `users(id)` - primary key
- `participants(deletedAt)` for filtering

### 4. Check User Permission in Room
```sql
SELECT role FROM participants
WHERE userId = 'usr_123'
  AND roomId = 'room_456'
  AND deletedAt IS NULL;
```

**Indexes used:**
- `participants(userId, roomId)` - unique composite

### 5. Winner Selection Validation
```sql
SELECT COUNT(*) FROM winners
WHERE participantId = 'part_123'
  AND prizeId = 'prize_456';
```

**Indexes used:**
- `winners(participantId)` - foreign key
- `winners(prizeId)` - foreign key

### 6. Prize Availability Check
```sql
SELECT quantityRemaining FROM prizes
WHERE id = 'prize_123'
  AND roomId = 'room_456';
```

**Indexes used:**
- `prizes(id)` - primary key
- `prizes(roomId)` - foreign key

## Future Optimization Opportunities

### Partial Indexes

For very large tables, consider partial indexes:

```sql
-- Only index non-deleted users
CREATE INDEX users_active_idx ON users(email) WHERE deletedAt IS NULL;

-- Only index active rooms
CREATE INDEX rooms_active_idx ON rooms(status, isPublic) WHERE deletedAt IS NULL;
```

**Benefits:**
- Smaller index size
- Faster updates
- Better for skewed data

### Full-Text Search

If search functionality is added:

```sql
-- Add tsvector column to rooms
ALTER TABLE rooms ADD COLUMN search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX rooms_search_idx ON rooms USING GIN(search_vector);

-- Update trigger to maintain search_vector
CREATE TRIGGER rooms_search_update
BEFORE INSERT OR UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);
```

### JSONB Indexes

For querying JSON fields:

```sql
-- Index specific JSONB keys
CREATE INDEX room_settings_ticket_count_idx
ON rooms((appSettings->>'ticketCount'));

-- GIN index for flexible JSONB queries
CREATE INDEX room_settings_gin_idx ON rooms USING GIN(appSettings);
```

## Performance Benchmarks

Run these queries to establish baseline performance:

```sql
-- 1. Room listing (should be < 10ms for 1000 rooms)
EXPLAIN ANALYZE
SELECT * FROM rooms
WHERE status = 'ACTIVE' AND isPublic = true
ORDER BY createdAt DESC LIMIT 20;

-- 2. User lookup (should be < 1ms)
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';

-- 3. Participant check (should be < 1ms)
EXPLAIN ANALYZE
SELECT * FROM participants
WHERE userId = 'usr_123' AND roomId = 'room_456';

-- 4. Winner count (should be < 5ms)
EXPLAIN ANALYZE
SELECT COUNT(*) FROM winners WHERE roomId = 'room_123';
```

## Recommendations

1. **Monitor index usage monthly** - Remove unused indexes
2. **Run VACUUM ANALYZE weekly** - Keep statistics current
3. **Review slow query log** - Identify missing indexes
4. **Test with production data volumes** - Indexes behave differently at scale
5. **Consider partitioning** - For very large tables (> 10M rows)
6. **Use connection pooling** - Reduce connection overhead
7. **Enable query logging** - Track slow queries (> 100ms)

## Conclusion

The current index strategy balances:
- Read performance (optimized for common queries)
- Write performance (not over-indexed)
- Storage space (indexes are relatively small)
- Maintainability (clear purpose for each index)

All indexes have been justified by actual API query patterns documented in `docs/api/rest-endpoints.md`.
