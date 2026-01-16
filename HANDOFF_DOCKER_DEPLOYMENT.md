# Handoff: Docker Deployment

**Date:** January 16, 2026
**Status:** ✅ Complete - All containers running

---

## Summary

Created Docker-first, 12-factor compliant deployment setup for portability. All services (PostgreSQL, Platform API, Lottery, Quiz) build and run successfully.

---

## What Was Done

### 1. Created Dockerfiles

**Lottery App** (`apps/lottery/Dockerfile`):
- Multi-stage build: Node 20 Alpine → nginx Alpine
- Builds SDK, then Vite app
- Serves via nginx with SPA routing
- **Status:** ✅ Working

**Quiz App** (`apps/quiz/Dockerfile`):
- Same pattern as lottery
- **Status:** ✅ Working

**Platform Backend** (`platform/Dockerfile`):
- Multi-stage build: Node 20 Alpine for build and runtime
- Builds SDK, generates Prisma client, compiles TypeScript
- Installs `prisma@5` globally for migrations
- **Status:** ⚠️ Needs OpenSSL fix

### 2. Created docker-compose Files

**`docker-compose.yml`** - Local dev (PostgreSQL only)
```bash
docker compose up -d  # Just starts PostgreSQL
```

**`docker-compose.prod.yml`** - Full stack production
```bash
docker compose -f docker-compose.prod.yml up --build
```

### 3. Fixed Build Issues

| Issue | Solution |
|-------|----------|
| corepack network errors | Changed to `npm install -g pnpm@8.15.0` |
| Missing devDependencies | Removed `--prod` flag during build stage |
| SDK .d.ts not generated | Added `declaration: true` to SDK tsconfig |
| Stale tsbuildinfo cache | Added `**/*.tsbuildinfo` to .dockerignore |
| Missing root tsconfig | Added `tsconfig.json` to COPY commands |
| Prisma types not found | Changed to copy all source first, then install |
| prisma not in prod | Installed `prisma@5` globally in production stage |

---

## Current State

| Service | Build | Run | URL |
|---------|-------|-----|-----|
| PostgreSQL | N/A | ✅ Healthy | internal:5432 |
| Lottery | ✅ Built | ✅ Running | http://localhost:5173 |
| Quiz | ✅ Built | ✅ Running | http://localhost:5174 |
| Platform | ✅ Built | ✅ Running | http://localhost:3000 |

---

## OpenSSL Fix Applied

The platform container originally failed at startup because Prisma couldn't find OpenSSL on Alpine Linux:
```
prisma:warn Prisma failed to detect the libssl/openssl version to use
Error: Could not parse schema engine response
```

**Solution:** Switched from Alpine to Debian-based image:
```dockerfile
# Changed from node:20-alpine to node:20-slim
FROM node:20-slim AS builder
FROM node:20-slim AS production

# Debian OpenSSL installation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
```

**Why Alpine failed:** Alpine uses musl libc instead of glibc. Prisma's query engine requires OpenSSL libraries that work differently on Alpine, causing detection failures.

---

## Files Created/Modified

**New Files:**
```
platform/Dockerfile
apps/lottery/Dockerfile
apps/lottery/nginx.conf
apps/quiz/Dockerfile
apps/quiz/nginx.conf
docker-compose.prod.yml
.env.example
.dockerignore
railway.json
```

**Modified Files:**
```
docker-compose.yml          # Added comment header
packages/platform-sdk/tsconfig.json  # Added declaration: true
```

---

## Commands

```bash
# Build all services
docker compose -f docker-compose.prod.yml build

# Start full stack (detached)
docker compose -f docker-compose.prod.yml up -d

# Check status
docker ps
docker logs event-platform-api

# Test endpoints
curl http://localhost:3000/health

# Stop all services
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (clean slate)
docker compose -f docker-compose.prod.yml down -v
```

---

## Next Steps

1. **Commit changes:**
```bash
git add -A
git commit -m "fix: use Debian-based image for Prisma OpenSSL compatibility"
git push
```

2. **Deploy to Railway:**
- Railway will use `railway.json` for build config
- Or use Docker deployment directly

3. **Deploy to Vercel:**
- Import repo, set root to `apps/lottery` or `apps/quiz`
- Set `VITE_PLATFORM_URL` env var

---

## Key Learnings

1. **Alpine + Prisma = Use Debian instead** - Alpine's musl libc causes OpenSSL detection failures with Prisma. Use `node:20-slim` (Debian-based) instead of `node:20-alpine`.
2. **pnpm workspaces in Docker** - need to copy all workspace files for module resolution
3. **TypeScript composite projects** - `declaration: true` must be explicit in child tsconfig
4. **tsbuildinfo files** - must be excluded in .dockerignore to avoid stale builds
5. **Windows Docker** - requires elevated/admin terminal for Docker Desktop commands

---

**Last Updated:** January 16, 2026
**Session 9 Status:** ✅ All services running and tested

---

## Session 9: OpenSSL Fix & Full Stack Verification

### What Was Done

1. **Fixed Platform Dockerfile OpenSSL issue**
   - Changed `node:20-alpine` → `node:20-slim` (Debian-based)
   - Changed `apk add openssl-dev libc6-compat` → `apt-get install openssl`
   - Prisma now works correctly with proper glibc/OpenSSL support

2. **Verified all Docker services running**
   - PostgreSQL: ✅ Healthy
   - Platform API: ✅ `{"status":"ok","database":"connected"}`
   - Lottery App: ✅ Production build served via nginx
   - Quiz App: ✅ Production build served via nginx

3. **Tested API endpoints**
   - `POST /auth/login` - ✅ Returns JWT tokens
   - `GET /auth/me` - ✅ Returns authenticated user
   - `POST /rooms` - ✅ Creates room
   - `GET /rooms` - ✅ Lists rooms with pagination

4. **Seeded test data manually** (Docker DB starts empty)
   - Created test user: `test@example.com` / `password123`
   - Created participant user: `participant@example.com` / `password123`
   - Registered apps: `app_lottery_v1`, `app_quiz_v1`

### Test Users (Docker)

| Email | Password | Role |
|-------|----------|------|
| test@example.com | password123 | Organizer |
| participant@example.com | password123 | Participant |

### Google OAuth Status

**Not configured** in Docker - shows warning:
```
⚠ Google OAuth2 disabled (missing credentials)
```

To enable, add to `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

### Uncommitted Changes

```
Modified:
  - platform/Dockerfile          # OpenSSL fix (Alpine → Debian)
  - apps/lottery/Dockerfile
  - apps/quiz/Dockerfile
  - docker-compose.prod.yml
  - packages/platform-sdk/tsconfig.json

New:
  - .dockerignore
  - HANDOFF_DOCKER_DEPLOYMENT.md
  - docker/
```

### Next Session Options

1. **Commit Docker changes** - `git add -A && git commit -m "fix: use Debian-based image for Prisma OpenSSL compatibility"`
2. **UI/UX refinements** - Polish apps based on manual testing
3. **Deploy to cloud** - Railway (platform) + Vercel (apps)
4. **Add Docker seed script** - Auto-seed test data on container start
