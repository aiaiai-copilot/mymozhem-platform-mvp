---
description: Reset database to clean state. Drops all data, reapplies migrations, and runs seed.
---

# Reset Database

**WARNING:** This deletes ALL data and recreates the database.

## Usage

```bash
# Full reset - drop, migrate, seed
pnpm prisma migrate reset

# Skip seed
pnpm prisma migrate reset --skip-seed
```

## What Happens

1. **Drop database** — All tables and data deleted
2. **Recreate database** — Empty database created
3. **Apply migrations** — All migrations run in order
4. **Run seed** — Test data populated (unless --skip-seed)

## When to Use

- Starting fresh on local development
- Switching branches with incompatible schema changes
- Testing migration flow from scratch
- Clearing corrupted test data

## Safety

- **ONLY for development** — Never run on production
- Commit your work first — changes are irreversible
- Verify DATABASE_URL points to local database
