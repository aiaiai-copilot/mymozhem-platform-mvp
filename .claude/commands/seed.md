---
description: Seed database with test data. Populates database with sample users, rooms, participants, and prizes.
---

# Seed Database

Populate database with test data for development.

## Usage

```bash
pnpm prisma db seed
```

## Seed Data

Create realistic test data:
- **Users** — Multiple test accounts (organizer, participants, admin)
- **Apps** — Lottery and Quiz applications with manifests
- **Rooms** — Sample events in different states
- **Participants** — Users enrolled in rooms with various roles
- **Prizes** — Prize pools for rooms
- **Winners** — Some completed rooms with winners

## Idempotency

Seed script should be idempotent:
- Check if data exists before creating
- Use `upsert` for critical records
- Clear existing test data if needed

## Location

Seed script: `prisma/seed.ts`

Configured in `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```
