# Event Management Platform - Backend Service

Headless backend platform for event management with pluggable application support.

**Stack:** Fastify + Prisma + PostgreSQL + Socket.io + TypeScript

---

## Quick Start

### Install Dependencies
```bash
pnpm install
```

### Setup Database
```bash
# 1. Configure database connection
cp .env.example .env
# Edit .env: DATABASE_URL="postgresql://..."

# 2. Run migrations
pnpm db:migrate

# 3. Seed test data
pnpm db:seed
```

### Development
```bash
# Start dev server
pnpm dev

# Watch mode with auto-reload
pnpm dev
```

---

## Available Commands

### Development
```bash
pnpm dev              # Start dev server (watch mode)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm type-check       # TypeScript type checking
pnpm lint             # Lint code
```

### Database
```bash
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed test data
pnpm db:reset         # Reset database
pnpm db:studio        # Open Prisma Studio
```

### Prisma
```bash
pnpm prisma:generate  # Generate Prisma Client
pnpm prisma:validate  # Validate schema syntax
pnpm prisma:format    # Format schema file
```

### Validation
```bash
pnpm validate:all     # Run all validations (88 checks)
pnpm validate:schema  # Schema completeness check
pnpm test:schema      # Schema type tests
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:ui          # Run tests with UI
```

---

## Project Structure

```
platform/
├── docs/
│   └── validation/          # Schema validation documentation
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Seed data
│   └── schema.test.ts       # Schema validation tests
├── scripts/
│   ├── validate-schema.ts   # Validation script
│   └── validate-all.ts      # Complete validation suite
├── src/                     # Source code (to be created)
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Fastify middleware
│   └── websocket/           # Socket.io handlers
├── .env.example             # Environment variables template
├── package.json             # Dependencies & scripts
└── tsconfig.json            # TypeScript configuration
```

---

## Database Schema

### Models
- **User** - System users with OAuth authentication
- **Session** - JWT session management
- **App** - Registered applications with manifests
- **Room** - Events/rooms with app integration
- **Participant** - User participation in rooms with roles
- **Prize** - Prize fund for rooms
- **Winner** - Winner selection records

### Validation
The database schema is fully validated with **88 automated checks**:

```bash
pnpm validate:all
```

See [docs/validation/](./docs/validation/) for complete validation documentation.

---

## API Documentation

Full API specification available in project root:
- `../docs/api/rest-endpoints.md` - REST API
- `../docs/api/websocket-protocol.md` - WebSocket events
- `../docs/api/authentication.md` - Auth flows
- `../docs/openapi.yaml` - OpenAPI 3.1 spec

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/event_platform"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1h"

# OAuth - Google
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Server
PORT=3000
HOST="0.0.0.0"
NODE_ENV="development"
```

---

## Current Phase

**MVP (v0.1)** - Database schema complete, API implementation next

**Completed:**
- ✅ Database schema design
- ✅ Schema validation (88 automated checks)
- ✅ Seed data
- ✅ API specification

**Next Steps:**
1. Implement REST API routes
2. Implement WebSocket handlers
3. Add authentication middleware
4. Add permission checking
5. Implement first applications (Lottery, Quiz)

---

## Documentation

- [Schema Validation](./docs/validation/) - Complete validation documentation
- [Prisma Schema](./prisma/schema.prisma) - Database schema
- [API Specification](../docs/api/) - REST & WebSocket API

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Fastify 4.x
- **Database:** PostgreSQL 16
- **ORM:** Prisma 5.x
- **WebSocket:** Socket.io 4.x
- **Validation:** Zod 3.x
- **Auth:** JWT + OAuth2
- **Testing:** Vitest 1.x

---

## Development Workflow

1. **Design** - API/schema designed before implementation
2. **Validate** - Run `pnpm validate:all` before committing
3. **Test** - Write tests for new features
4. **Type Check** - Run `pnpm type-check`
5. **Commit** - Git commit with descriptive message

---

## Contributing

See project root `CLAUDE.md` for:
- Architecture principles
- Code style guidelines
- Security checklist
- Available subagents and commands

---

## License

Private - Internal use only

---

**Status:** Database schema complete, validated, ready for API implementation
**Last Updated:** 2025-12-28
