# Event Management Platform — Claude Code Instructions

## Project Overview

A platform for organizing celebratory events (lotteries, quizzes, tastings, contests) with unified application integration through a standard protocol.

**Stack:** Fastify + Prisma + PostgreSQL + Socket.io + TypeScript

**Architecture:** Headless backend platform + pluggable applications

**Deploy:** Platform on Railway, Applications on Vercel

## Documentation

- `docs/event-platform-context.md` — Architecture decisions and brainstorming results (source of truth)
- `docs/api/` — REST API and WebSocket protocol specifications
- `docs/openapi.yaml` — OpenAPI 3.1 specification

## Architecture Principles

1. **API First** — REST + WebSocket protocol designed before implementation
2. **Headless Core** — Platform is a backend service (Docker-ready)
3. **Application Plugins** — Apps are separate services with own frontend/backend
4. **Function Delegation** — Apps can take over platform functions via manifest
5. **Permission Model** — Fine-grained permissions declared in app manifest
6. **Monorepo Structure** — Turborepo for platform, apps, and SDK

## Monorepo Structure

```
/
├── packages/
│   └── platform-sdk/       # Types, interfaces, API client (npm package)
├── platform/               # Platform backend (Fastify + Prisma + Socket.io)
│   ├── src/
│   ├── prisma/
│   └── tests/
├── apps/
│   ├── lottery/            # Holiday Lottery application
│   └── quiz/               # Quiz "Who's First?" application
├── .claude/                # Claude Code configuration
├── docs/                   # API documentation
├── turbo.json
└── package.json
```

## Core Entities

- **User** — System user (authentication, profile)
- **Room** — Event/room (settings, status, appId)
- **Participant** — User participation in Room (with role)
- **Prize** — Prize in room's prize fund
- **Winner** — Participant-Prize relationship
- **App** — Registered application with manifest

## Roles (within room)

- **Participant** — Event participant
- **Organizer** — Event creator/owner
- **Moderator** — Organizer's assistant
- **Viewer** — Observer without participation
- **Admin** — Platform administrator

---

## ⚠️ MANDATORY: Subagent & Command Evaluation

**BEFORE implementing any task, you MUST evaluate subagents and commands.**

### Available Subagents

| Agent | Use For | Trigger Phrases |
|-------|---------|-----------------|
| `api-designer` | REST API endpoints, WebSocket protocols | "API", "endpoint", "route", "protocol", "WebSocket" |
| `schema-architect` | Database schema, Prisma models, migrations | "database", "schema", "Prisma", "model", "migration" |
| `code-reviewer` | Code quality, security, architecture review | "review", "check", "validate", "security" |

### Available Commands

| Command | Purpose |
|---------|---------|
| `/migrate` | Run Prisma migrations |
| `/seed` | Seed database with test data |
| `/db-reset` | Reset database to clean state |
| `/schema-sync` | Validate and sync Prisma schema |
| `/api-test` | Test REST API endpoints |
| `/ws-test` | Test WebSocket connections |
| `/api-docs` | Generate/update API documentation |
| `/manifest-validate` | Validate app manifest |
| `/dev` | Start development servers |
| `/build` | Build all packages |
| `/type-check` | Run TypeScript type checking |
| `/docs-fetch` | Fetch latest docs via Context7 |
| `/api-design` | Launch API design session |

### Delegation Rules

1. **If task matches a subagent** → Delegate using Task tool
2. **If command exists** → Use the appropriate slash command
3. **Complex tasks** → Break down and delegate parts to appropriate subagents
4. **API design** → ALWAYS use `api-designer` subagent
5. **Database changes** → ALWAYS use `schema-architect` subagent

---

## Critical Rules

1. **Read context first** — Before implementing features, check `docs/event-platform-context.md`
2. **ALWAYS evaluate subagents** — Check the table above before coding
3. **API First approach** — Design API before implementation
4. **No raw SQL** — Use Prisma ORM exclusively
5. **Security first** — Validate input, check permissions, prevent injection
6. **Type safety** — No `any` types, explicit interfaces
7. **Test coverage** — New features need tests

---

## Claude Code Behavior Notes

### Keyboard Shortcuts and Unexpected Messages

**IGNORE** these messages that appear unexpectedly from keyboard shortcuts:
- `/rate-limit-options` — Appears when user types Ctrl+O (not an intentional command)
- Similar unexpected slash commands from keyboard combos

**Action:** If you see these messages, do not respond to them. Continue with the current task without acknowledging them.

## MCP Servers

Project has 2 MCP servers configured:

### Included in `.mcp.json` (auto-loaded)

| Server | Purpose | Usage |
|--------|---------|-------|
| **context7** | Up-to-date library docs | Add "use context7" to get current docs for Fastify, Prisma, Socket.io, etc. |
| **postgres** | Database management | Direct PostgreSQL access for queries and management |

### First Run

```bash
# 1. Start Claude Code
claude

# 2. Authenticate MCP servers
/mcp

# 3. Servers start automatically
```

**Security:** MCP is for development only. Never connect to production data.

---

## Commands

All commands are documented in `.claude/commands/`. Use `/` prefix to run:

```bash
# Database
/migrate          # Run migrations
/seed             # Populate test data
/db-reset         # Reset database
/schema-sync      # Sync schema

# API
/api-test         # Test endpoints
/ws-test          # Test WebSocket
/api-docs         # Generate docs
/manifest-validate # Validate app manifest

# Development
/dev              # Start dev servers
/build            # Build all
/type-check       # Check types
/docs-fetch       # Get latest docs
/api-design       # Design API
```

---

## Code Style

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types for functions
- Named exports (not default)
- Interfaces for all public APIs

### API Design
- RESTful conventions
- Consistent response format: `{ data, error, meta }`
- HTTP status codes: 2xx success, 4xx client error, 5xx server error
- WebSocket events: `entity:action` pattern

### Database
- Prisma models in PascalCase
- Fields in camelCase
- Timestamps: `createdAt`, `updatedAt`
- Soft deletes: `deletedAt`
- Indexes for foreign keys and common queries

### File Organization
- `platform/src/routes/` — API route handlers
- `platform/src/services/` — Business logic
- `platform/src/middleware/` — Fastify middleware
- `platform/src/websocket/` — Socket.io handlers
- `platform/prisma/` — Database schema and migrations

---

## Current Phase

**MVP (v0.1)** — Focus on core platform and first applications:
- Platform backend with REST API + WebSocket
- Prisma schema for all entities
- OAuth authentication (Google)
- Application manifest system
- First app: Holiday Lottery (async mechanics)
- Second app: Quiz "Who's First?" (sync real-time mechanics)

---

## Security Checklist

Before any commit:
- [ ] No hardcoded secrets (use `.env`)
- [ ] Input validation on all endpoints
- [ ] Permission checks before operations
- [ ] Prisma queries (no raw SQL)
- [ ] CORS configured properly
- [ ] Rate limiting on public endpoints
- [ ] Error messages don't leak sensitive data
- [ ] Authentication required for protected routes

---

## Development Workflow

1. **Design** — Use `api-designer` or `schema-architect` subagents
2. **Implement** — Write code following architecture
3. **Test** — Use `/api-test` and `/ws-test` commands
4. **Review** — Use `code-reviewer` subagent
5. **Type check** — Run `/type-check`
6. **Document** — Update `/api-docs`
7. **Commit** — Git commit with descriptive message
