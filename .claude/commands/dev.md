---
description: Start development servers. Runs platform backend and application frontends in watch mode.
---

# Development Mode

Start all development servers with hot reload.

## Usage

```bash
# Start all (platform + apps)
pnpm dev

# Platform only
pnpm dev --filter platform

# Specific app
pnpm dev --filter @apps/lottery

# Multiple workspaces
pnpm dev --filter platform --filter @apps/quiz
```

## What Runs

### Platform Backend
- Fastify server on http://localhost:3000
- Socket.io WebSocket server
- API routes with auto-reload
- Prisma Client in development mode
- Hot module reload enabled

### Applications
- Next.js dev servers (3001, 3002, etc.)
- React Fast Refresh
- TypeScript watch mode

## Environment Setup

Ensure `.env` files exist:
```bash
# platform/.env
DATABASE_URL="postgresql://localhost/mymozhem_platform"
JWT_SECRET="dev-secret-change-in-production"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# apps/lottery/.env.local
NEXT_PUBLIC_PLATFORM_API="http://localhost:3000"
NEXT_PUBLIC_PLATFORM_WS="http://localhost:3000"
```

## Turborepo

Using Turbo for parallel execution:
- Watches all dependencies
- Rebuilds on changes to shared packages
- Caches build outputs

## Logs

View logs for specific workspace:
```bash
pnpm --filter platform dev
```

## Database

Ensure PostgreSQL is running:
```bash
# Check connection
pnpm prisma db pull --schema=platform/prisma/schema.prisma

# Start local PostgreSQL (if using Docker)
docker-compose up -d postgres
```
