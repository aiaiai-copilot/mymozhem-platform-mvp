# Event Management Platform - MVP

A platform for organizing celebratory events (lotteries, quizzes, tastings, contests) with unified application integration through a standard protocol.

**Architecture:** Headless backend platform + pluggable applications
**Stack:** Fastify + Prisma + PostgreSQL + Socket.io + TypeScript
**Deployment:** Platform on Railway, Applications on Vercel

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16
- pnpm 8+

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup database (from platform directory)
cd platform
cp .env.example .env
# Edit .env: DATABASE_URL="postgresql://..."

# 3. Run migrations
pnpm db:migrate

# 4. Seed test data
pnpm db:seed

# 5. Start development server
pnpm dev
```

---

## Project Structure

```
/
├── docs/                    # API & Architecture documentation
│   ├── api/                 # REST & WebSocket API specs
│   │   ├── rest-endpoints.md
│   │   ├── websocket-protocol.md
│   │   └── authentication.md
│   ├── openapi.yaml         # OpenAPI 3.1 specification
│   └── event-platform-context.md  # Architecture decisions
│
├── platform/                # Backend platform (Fastify + Prisma)
│   ├── docs/                # Platform documentation
│   ├── prisma/              # Database schema & migrations
│   ├── scripts/             # Utility scripts
│   ├── src/                 # Source code (to be implemented)
│   └── README.md
│
├── apps/                    # Applications (to be created)
│   ├── lottery/             # Holiday Lottery app
│   └── quiz/                # Quiz "Who's First?" app
│
├── packages/                # Shared packages (to be created)
│   └── platform-sdk/        # TypeScript SDK for apps
│
├── CLAUDE.md                # Development instructions
├── handoff.md               # Session handoff notes
└── README.md                # This file
```

---

## Architecture

### Core Principles

1. **API First** - REST + WebSocket protocol designed before implementation
2. **Headless Core** - Platform is a backend service, Docker-ready
3. **Application Plugins** - Apps are separate services with own frontend/backend
4. **Function Delegation** - Apps can override platform functions via manifest
5. **Permission Model** - Fine-grained permissions declared in app manifest

### Core Entities

- **User** - System users with OAuth authentication (Google)
- **Session** - JWT session management
- **App** - Registered applications with manifests
- **Room** - Events/rooms with application integration
- **Participant** - User participation in rooms with roles
- **Prize** - Prize fund for rooms
- **Winner** - Winner selection records

### Roles (per room)

- **Admin** - Platform administrator
- **Organizer** - Room creator/owner
- **Moderator** - Organizer's assistant
- **Participant** - Event participant
- **Viewer** - Observer without participation

---

## Documentation

### For Developers

- **[CLAUDE.md](./CLAUDE.md)** - Development instructions, subagents, commands
- **[docs/event-platform-context.md](./docs/event-platform-context.md)** - Architecture decisions (source of truth)
- **[platform/README.md](./platform/README.md)** - Platform backend documentation

### API Specifications

- **[docs/api/README.md](./docs/api/README.md)** - API overview
- **[docs/api/rest-endpoints.md](./docs/api/rest-endpoints.md)** - REST API reference
- **[docs/api/websocket-protocol.md](./docs/api/websocket-protocol.md)** - WebSocket events
- **[docs/api/authentication.md](./docs/api/authentication.md)** - Auth flows
- **[docs/openapi.yaml](./docs/openapi.yaml)** - OpenAPI 3.1 spec

### Session Notes

- **[handoff.md](./handoff.md)** - Latest session notes and next steps

---

## Current Status

### ✅ Completed

- **API Design** - Complete REST & WebSocket specifications
- **Database Schema** - Validated with 88 automated checks
- **Seed Data** - Test data for development
- **Documentation** - Comprehensive API and architecture docs
- **Validation System** - Automated schema validation (< 10 seconds)

### 🚧 In Progress

- **Platform Implementation** - API routes and WebSocket handlers

### 📋 Next Steps

1. Implement REST API routes (Fastify)
2. Implement WebSocket handlers (Socket.io)
3. Add authentication middleware (OAuth + JWT)
4. Add permission checking middleware
5. Create monorepo structure (Turborepo)
6. Develop first applications (Lottery, Quiz)

---

## Technology Stack

### Backend Platform
- **Runtime:** Node.js 18+
- **Framework:** Fastify 4.x
- **Database:** PostgreSQL 16
- **ORM:** Prisma 5.x
- **WebSocket:** Socket.io 4.x
- **Validation:** Zod 3.x
- **Authentication:** JWT + OAuth2 (Google)
- **Testing:** Vitest 1.x

### Applications (Future)
- **Frontend:** Next.js 14+ (React)
- **Deployment:** Vercel
- **SDK:** TypeScript platform-sdk

### Infrastructure
- **Platform Hosting:** Railway
- **Database:** PostgreSQL (managed)
- **Monorepo:** Turborepo

---

## Development Workflow

### Available Commands

**Platform (from `platform/` directory):**
```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm test             # Run tests
pnpm validate:all     # Validate schema (88 checks)
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed test data
pnpm db:studio        # Open Prisma Studio
```

**Project-wide (from root):**
```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
```

### Subagents & Commands

The project includes specialized subagents for common tasks:

- **`api-designer`** - Design REST/WebSocket APIs
- **`schema-architect`** - Design database schemas
- **`code-reviewer`** - Review code quality

See [CLAUDE.md](./CLAUDE.md) for full list of available commands.

---

## Authentication

### User Authentication (OAuth)
1. User → `GET /api/auth/google`
2. Platform → Redirect to Google OAuth
3. Google → User authenticates
4. Platform → Creates User, returns JWT token

### Application Authentication
1. Admin → `POST /api/apps` (register app, get appId + appSecret)
2. App → `POST /api/apps/token` { appId, appSecret }
3. Platform → Returns JWT token (expires 1 hour)

### Dual Authentication (App on behalf of User)
```http
Authorization: Bearer {userToken}
X-App-Token: {appToken}
X-App-Id: app_lottery_v1
```

---

## Contributing

See [CLAUDE.md](./CLAUDE.md) for:
- Code style guidelines
- Security checklist
- Development principles
- Available tools and subagents

---

## MCP Servers

Project uses 2 MCP servers for development:

| Server | Purpose |
|--------|---------|
| **context7** | Up-to-date library docs (Fastify, Prisma, Socket.io) |
| **postgres** | Direct PostgreSQL access for queries |

Configuration: `.mcp.json`

---

## Database Schema

**7 Models:**
- User, Session, App, Room, Participant, Prize, Winner

**Validation:**
- 88 automated checks
- < 10 seconds validation time
- No database required for validation

See [platform/docs/validation/](./platform/docs/validation/) for details.

---

## API Endpoints

### REST API
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/rooms/*` - Room CRUD
- `/api/rooms/:id/participants/*` - Participant management
- `/api/rooms/:id/prizes/*` - Prize management
- `/api/rooms/:id/winners/*` - Winner selection
- `/api/apps/*` - Application management

### WebSocket Events
- `room:join`, `room:leave` - Room participation
- `room:update` - Room state changes
- `participant:join`, `participant:leave` - Participant events
- `winner:selected` - Winner announcement

See [docs/api/](./docs/api/) for complete API reference.

---

## MVP Scope (v0.1)

### Core Platform
- ✅ Database schema
- 🚧 REST API implementation
- 🚧 WebSocket implementation
- 🚧 OAuth authentication
- 🚧 Permission system

### First Applications
- 📋 **Holiday Lottery** - Async winner selection
- 📋 **Quiz "Who's First?"** - Sync real-time competition

---

## License

Private - Internal use only

---

## Links

- **Repository:** https://github.com/aiaiai-copilot/mymozhem-platform-mvp
- **Documentation:** [docs/](./docs/)
- **API Specification:** [docs/api/](./docs/api/)
- **Platform Backend:** [platform/](./platform/)

---

**Status:** Database schema complete, API implementation in progress
**Last Updated:** 2025-12-28
