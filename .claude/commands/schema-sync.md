---
description: Validate and sync Prisma schema. Checks schema correctness and syncs with database without migrations.
---

# Schema Sync

Validate Prisma schema and sync with database.

## Usage

```bash
# Validate schema syntax
pnpm prisma validate

# Format schema
pnpm prisma format

# Generate Prisma Client (after schema changes)
pnpm prisma generate

# Push schema to database (dev only, skips migrations)
pnpm prisma db push
```

## Commands Explained

### `prisma validate`
- Checks schema syntax
- Validates relations
- Ensures model consistency

### `prisma format`
- Auto-formats schema.prisma
- Organizes fields and attributes
- Enforces consistent style

### `prisma generate`
- Generates Prisma Client TypeScript types
- Updates `@prisma/client` package
- Run after any schema change

### `prisma db push`
- Syncs schema to database directly (no migration files)
- **Development only** — use migrations for production
- Fast iteration during prototyping

## Workflow

1. Edit `prisma/schema.prisma`
2. Run `prisma format`
3. Run `prisma validate`
4. Run `prisma generate`
5. Test in code
6. When ready, create migration with `/migrate`
