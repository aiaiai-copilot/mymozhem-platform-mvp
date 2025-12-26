---
description: Run Prisma database migrations. Creates and applies migrations to sync schema with database.
---

# Migrate Database

Run Prisma migrations to sync schema with database.

## Usage

```bash
# Development - create and apply migration
pnpm prisma migrate dev --name <description>

# Production - apply pending migrations
pnpm prisma migrate deploy

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset
```

## Workflow

1. **Check schema** — Ensure `prisma/schema.prisma` is valid
2. **Create migration** — `migrate dev --name add_user_roles`
3. **Review SQL** — Check generated migration file
4. **Test locally** — Verify migration works
5. **Commit** — Add migration files to git
6. **Deploy** — Apply to production with `migrate deploy`

## After Migration

- Run `/seed` to populate with test data
- Run `/type-check` to verify Prisma client types
- Update API code if schema changed
