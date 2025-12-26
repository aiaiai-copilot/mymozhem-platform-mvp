---
description: Build all packages for production. Compiles TypeScript, bundles apps, generates Prisma Client.
---

# Production Build

Build all workspaces for production deployment.

## Usage

```bash
# Build everything
pnpm build

# Build specific workspace
pnpm build --filter platform

# Build with dependencies
pnpm build --filter @apps/lottery...
```

## Build Order

Turborepo automatically handles build order based on dependencies:

1. **Shared packages** — `packages/platform-sdk`
2. **Platform** — `platform/` (Fastify backend)
3. **Applications** — `apps/lottery`, `apps/quiz`

## Output

### Platform
- Compiled JS in `platform/dist/`
- Prisma Client generated
- Source maps for debugging

### Applications
- Next.js static export in `apps/*/out/`
- Or Next.js server build in `apps/*/.next/`
- Optimized assets and bundles

### SDK Package
- TypeScript types in `packages/platform-sdk/dist/`
- Ready for npm publish

## Validation

After build:
```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Check bundle sizes
pnpm analyze
```

## Production Preview

```bash
# Build then preview
pnpm build && pnpm preview

# Preview specific app
pnpm --filter @apps/lottery preview
```

## Docker Build

```bash
# Build Docker image
docker build -t mymozhem-platform -f platform/Dockerfile .

# Run container
docker run -p 3000:3000 mymozhem-platform
```

## Deployment

Configured for:
- **Platform** — Railway / Render / Fly.io
- **Apps** — Vercel / Netlify
- **SDK** — npm registry
