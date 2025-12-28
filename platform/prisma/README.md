# Prisma Database Schema

This directory contains the complete database schema for the Event Management Platform.

## Files

- **`schema.prisma`** - Main Prisma schema definition
- **`seed.ts`** - Database seed script with test data
- **`MIGRATION_PLAN.md`** - Step-by-step migration strategy
- **`INDEX_STRATEGY.md`** - Comprehensive indexing justification
- **`QUERY_EXAMPLES.md`** - Practical Prisma Client query examples

## Quick Start

### 1. Install Dependencies

```bash
cd platform
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and configure your PostgreSQL connection:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/event_platform?schema=public"
```

### 3. Validate Schema

```bash
pnpm prisma:validate
```

### 4. Format Schema

```bash
pnpm prisma:format
```

### 5. Generate Prisma Client

```bash
pnpm prisma:generate
```

### 6. Create Initial Migration

```bash
pnpm db:migrate
```

When prompted, name it: `init`

### 7. Seed Database

```bash
pnpm db:seed
```

### 8. Explore Data

```bash
pnpm db:studio
```

Opens Prisma Studio at http://localhost:5555

## Schema Overview

### Core Models

| Model | Description | Relations |
|-------|-------------|-----------|
| **User** | System users with OAuth authentication | → Session, Participant, Room (organizer) |
| **Session** | User authentication sessions | → User |
| **App** | Registered applications with manifests | → Room |
| **Room** | Event/room records | → App, User (organizer), Participant, Prize, Winner |
| **Participant** | User participation in rooms | → User, Room, Winner |
| **Prize** | Prize records | → Room, Winner |
| **Winner** | Winner records | → Room, Participant, Prize |

### Enums

- **RoomStatus**: `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- **ParticipantRole**: `ADMIN`, `ORGANIZER`, `MODERATOR`, `PARTICIPANT`, `VIEWER`

### Key Features

1. **CUID Primary Keys** - Collision-resistant, sortable IDs
2. **Soft Deletes** - `deletedAt` field for important data preservation
3. **JSON Fields** - Flexible metadata storage
4. **Cascade Rules** - Proper data integrity with ON DELETE actions
5. **Indexes** - Optimized for common query patterns
6. **Unique Constraints** - Prevent duplicate data

## Common Tasks

### View Schema

```bash
pnpm prisma:validate
```

### Create Migration

```bash
pnpm db:migrate
```

### Apply Migrations (Production)

```bash
pnpm db:migrate:deploy
```

### Push Schema Changes (Dev Only)

```bash
pnpm db:push
```

Skips migration files, directly syncs schema to DB.

### Reset Database

```bash
pnpm db:reset
```

**Warning:** Deletes all data, recreates schema, and runs seed.

### Seed Database

```bash
pnpm db:seed
```

### Browse Data

```bash
pnpm db:studio
```

### Generate Types

```bash
pnpm prisma:generate
```

Run after any schema change to update TypeScript types.

## Database Requirements

- **PostgreSQL**: 14+ recommended
- **Database**: `event_platform` (or custom name)
- **User**: Must have CREATE, ALTER, DROP privileges
- **Extensions**: None required (standard PostgreSQL)

## Migration Strategy

### Development

1. Edit `schema.prisma`
2. Run `pnpm db:migrate` to create migration
3. Review generated SQL in `migrations/` directory
4. Test migration
5. Commit migration files to git

### Production

1. Test migrations in staging environment
2. Run `pnpm db:migrate:deploy` in production
3. Verify with `pnpm db:migrate status`
4. Monitor application logs for errors

**Never use `db:push` or `db:reset` in production!**

## Performance Optimization

### Indexes

All indexes are documented in `INDEX_STRATEGY.md` with justification for each.

**Monitor index usage:**

```sql
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Query Optimization

Use `EXPLAIN ANALYZE` to check query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM rooms WHERE status = 'ACTIVE';
```

### Connection Pooling

Configure in production:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

## Security Considerations

1. **Credentials** - Never commit `.env` file
2. **Migrations** - Review SQL for security implications
3. **Soft Deletes** - Use `deletedAt IS NULL` in WHERE clauses
4. **Permissions** - Grant minimal database privileges in production
5. **Backups** - Implement automated database backups

## Troubleshooting

### Schema Drift

```bash
# Check for differences
pnpm prisma:validate

# Fix with new migration
pnpm db:migrate

# Or reset (dev only)
pnpm db:reset
```

### Migration Conflicts

If migrations conflict with database state:

```bash
# Mark migration as applied (if manually applied)
pnpm prisma migrate resolve --applied 20251228_migration_name

# Or rollback manually and reapply
```

### Connection Issues

1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Test connection: `psql $DATABASE_URL`
4. Check firewall/network settings

### Type Generation Issues

```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma
pnpm prisma:generate
```

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Query Examples](./QUERY_EXAMPLES.md)
- [Index Strategy](./INDEX_STRATEGY.md)
- [Migration Plan](./MIGRATION_PLAN.md)

## Support

For questions or issues:
1. Check documentation files in this directory
2. Review API documentation in `docs/api/`
3. Consult architecture document: `docs/event-platform-context.md`

## Next Steps

After setting up the database:
1. Implement Fastify API routes
2. Set up authentication middleware
3. Implement WebSocket handlers
4. Write integration tests
5. Deploy to Railway
