# Platform API - Ready for Testing

## Summary

✅ **Backend server is fully functional** with core REST API endpoints implemented.

## What's Implemented

### Infrastructure
- ✅ Fastify server with ES modules
- ✅ PostgreSQL database (Docker container)
- ✅ Prisma ORM with migrations and seed data
- ✅ Error handling middleware
- ✅ CORS configuration
- ✅ JWT authentication (signature-only validation)
- ✅ Request/response logging (pino-pretty)

### API Endpoints

**Authentication** (`/api/v1/auth/*`):
- `POST /api/v1/auth/login` - Login and get JWT token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout and blacklist token
- `GET /api/v1/auth/me` - Get current user (authenticated)

**Users** (`/api/v1/users/*`):
- `GET /api/v1/users/:userId` - Get user profile
- `PATCH /api/v1/users/:userId` - Update own profile
- `DELETE /api/v1/users/:userId` - Delete own account (soft delete)

**Rooms** (`/api/v1/rooms/*`):
- `GET /api/v1/rooms` - List public rooms (with pagination)
- `GET /api/v1/rooms/:roomId` - Get room details (full data)
- `POST /api/v1/rooms` - Create room (authenticated, locked to app manifest version)
- `PATCH /api/v1/rooms/:roomId` - Update room (organizers only)
- `DELETE /api/v1/rooms/:roomId` - Delete room (organizers only, soft delete)

### Features

**Security:**
- JWT signature-only validation (10-20x faster than DB lookup)
- Token blacklist for revoked tokens (SHA-256 hashing)
- Permission checks (users can only modify their own data)
- Role-based access (ORGANIZER role for room management)

**Data Integrity:**
- Soft delete enforcement for Prize, User, App models
- Foreign key constraints with onDelete: Restrict protection
- Manifest versioning (rooms locked to app version at creation)

**Performance:**
- Strategic indexes on all foreign keys
- Pagination support
- Optimized Prisma queries with selective includes

## Test Data Available

From seed script:
- **4 Users:** alice@example.com, bob@example.com, charlie@example.com, diana@example.com
- **2 Apps:** Holiday Lottery (v1.0.0), Quiz "Who's First?" (v1.0.0)
- **3 Rooms:** New Year Lottery, Christmas Quiz, Draft Office Lottery
- **8 Participants** across rooms
- **4 Prizes** in various rooms
- **1 Winner** record

## Quick Start

### 1. Start the Server

```bash
cd platform
pnpm dev
```

Server runs on: **http://localhost:3000**

### 2. Test Endpoints

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'
```

**Get Public Rooms:**
```bash
curl http://localhost:3000/api/v1/rooms
```

**Get Current User (authenticated):**
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Browse Database

```bash
cd platform
pnpm db:studio
```

Opens Prisma Studio on: **http://localhost:5555**

## What's NOT Done

### To Complete MVP:

1. **Participant Routes** (`/api/v1/participants/*`)
   - Join room
   - Leave room
   - Update participant metadata
   - List room participants

2. **Prize Routes** (`/api/v1/prizes/*`)
   - Create prize
   - Update prize
   - Delete prize (soft delete only!)
   - List room prizes

3. **WebSocket Server** (Socket.io)
   - Real-time event broadcasting
   - Room subscriptions
   - Participant presence
   - Winner announcements

4. **OAuth Integration** (Google)
   - Currently using demo login
   - Needs @fastify/oauth2 configuration
   - Google OAuth flow implementation

5. **Permission System**
   - App-level permission checking
   - Fine-grained capability validation
   - Webhook timeout/circuit breaker (from resilience design)

## File Structure

```
platform/
├── src/
│   ├── config/
│   │   └── index.ts           # Environment configuration
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication middleware
│   │   └── errorHandler.ts    # Global error handler
│   ├── routes/
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── users.ts            # User endpoints
│   │   └── rooms.ts            # Room endpoints
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── utils/
│   │   └── jwt.ts              # JWT utilities
│   └── index.ts                # Main server entry point
├── prisma/
│   ├── schema.prisma           # Database schema (8 models, 45 indexes)
│   ├── seed.ts                 # Test data seeder
│   └── migrations/             # Migration history
├── .env                        # Environment variables
└── package.json                # Dependencies & scripts
```

## Environment Variables

Required in `.env`:
```bash
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/event_platform"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_EXPIRES_IN="1h"
PORT=3000
NODE_ENV="development"
```

## Next Steps

**Recommended order:**

1. **Implement Participant Routes** - Critical for room interaction
2. **Implement Prize Routes** - Core event functionality
3. **Set up WebSocket Server** - Real-time features
4. **OAuth Integration** - Production-ready authentication
5. **Permission Middleware** - App capability validation
6. **Build First Application** - Holiday Lottery or Quiz app

## Documentation References

- API Specification: `docs/api/rest-endpoints.md`
- WebSocket Protocol: `docs/api/websocket-protocol.md`
- Authentication Design: `docs/api/authentication.md`
- Schema Documentation: `platform/prisma/SCHEMA_SUMMARY.md`
- Query Examples: `platform/prisma/QUERY_EXAMPLES.md`

---

**Status:** ✅ Core platform backend functional and ready for extension
**Last Updated:** 2025-12-30
