# Handoff: API Design Complete, Database Schema Next

**Date:** December 28, 2025
**Session:** API design session
**Previous Session:** Project setup and infrastructure
**Next Task:** Database schema design

---

## What Was Accomplished This Session

### 1. Documentation Reorganization
- ✅ Moved `event-platform-context.md` to `docs/` directory
- ✅ Updated all references in `CLAUDE.md` and `handoff.md`
- ✅ Organized documentation structure for scalability

### 2. Complete API Design
- ✅ **7 comprehensive API documentation files** created in `docs/api/`:
  - `README.md` - Overview and getting started guide
  - `authentication.md` - Complete auth & authorization documentation
  - `rest-endpoints.md` - Full REST API endpoint reference
  - `websocket-protocol.md` - WebSocket event protocol specification
  - `app-manifest.md` - Application manifest specification
  - `design-decisions.md` - Architecture decisions and rationale
  - `quick-reference.md` - Quick reference for developers
- ✅ **OpenAPI 3.1 specification** in `docs/openapi.yaml`

### 3. Authentication Model Decision
**Selected: Option D - Combination (App Key + User Context)**

- **Users:** OAuth 2.0 (Google) with JWT tokens
- **Applications:** API Key (appId + appSecret) for app identity
- **Hybrid Operations:** Both tokens for app actions on behalf of users
- **Benefits:** Defense in depth, audit trail, granular permissions

### 4. API Design Highlights

**REST API Endpoints:**
- User Management - OAuth authentication, profile CRUD
- Room Management - Create/update/delete with app integration
- Participant Management - Join/leave with role-based permissions
- Prize Management - CRUD operations for prize fund
- Winner Management - Selection and assignment with validation
- Application Management - Registration, manifest, token exchange
- Function Delegation - Webhook-based platform function delegation

**WebSocket Protocol:**
- Real-time room, participant, prize, and winner events
- Application custom events (e.g., `lottery:draw_started`)
- Presence system for tracking online participants
- Two-way communication with acknowledgments
- Event naming: `entity:action` pattern (e.g., `room:updated`)

**Security Features:**
- Fine-grained permissions (e.g., `users:read`, `prizes:write`)
- Rate limiting with tiered limits (20/100/1000 req/min)
- Input validation with detailed error messages
- HMAC signatures for webhook verification
- HTTPS-only in production

**Design Principles:**
- RESTful conventions with resource-based URLs
- Consistent response format: `{ data, error, meta }`
- Clear error handling with structured error codes
- Pagination with offset-based navigation
- Filtering and sorting via query parameters

### 5. Commits Made
- `e978839` - Design complete REST API and WebSocket protocol
- `1d4a48f` - Fix subagent logging to show semantic names for all agents

---

## Current Project State

### Repository
- **Branch:** master
- **Remote:** https://github.com/aiaiai-copilot/mymozhem-platform-mvp
- **Status:** All changes committed and pushed
- **Total Commits:** 5

### Recent Commits
```
e978839 Design complete REST API and WebSocket protocol
1d4a48f Fix subagent logging to show semantic names for all agents
6253644 Improve subagent logging and add session handoff
05cc786 Ignore Claude Code local settings and log files
8077af1 Add working hook-based logging system for debugging
```

### Project Structure
```
/
├── .claude/
│   ├── agents/          # 3 subagents (api-designer, schema-architect, code-reviewer)
│   ├── commands/        # 13 slash commands
│   ├── hooks/           # 4 logging hooks (with mapping system)
│   ├── logs/            # Log files (gitignored)
│   │   ├── subagents.jsonl          # Agent invocation log
│   │   ├── subagent-map.jsonl       # Task → subagent_type mapping
│   │   ├── subagent-map-used.jsonl  # Consumed mappings
│   │   ├── tools.jsonl              # Tool call log
│   │   ├── skills.jsonl             # Skill/command reads
│   │   └── *-debug.txt              # Raw JSON for debugging
│   ├── settings.json    # Hook configuration
│   └── settings.local.json  # User-specific settings (gitignored)
├── .mcp.json            # MCP server configuration
├── docs/
│   ├── api/
│   │   ├── README.md
│   │   ├── authentication.md
│   │   ├── rest-endpoints.md
│   │   ├── websocket-protocol.md
│   │   ├── app-manifest.md
│   │   ├── design-decisions.md
│   │   └── quick-reference.md
│   ├── openapi.yaml
│   └── event-platform-context.md  # Architecture decisions (source of truth)
├── CLAUDE.md            # Project instructions
├── first-prompt.md      # Original task description
├── .gitignore
└── handoff.md           # This file
```

### Stack & Architecture
- **Platform:** Fastify + Prisma + PostgreSQL + Socket.io + TypeScript
- **Architecture:** Headless backend + pluggable applications
- **Monorepo:** Turborepo (not yet created)
- **Deploy:** Platform on Railway, Apps on Vercel

### Entities Designed (Not Yet Implemented)
- **User** - System user with OAuth authentication
- **Room** - Event/room with app integration
- **Participant** - User participation in room with role
- **Prize** - Prize in room's prize fund
- **Winner** - Participant-prize relationship
- **App** - Registered application with manifest and credentials

### Roles (per room)
- **Admin** - Platform administrator
- **Organizer** - Room creator/owner
- **Moderator** - Organizer's assistant
- **Participant** - Event participant
- **Viewer** - Observer without participation

---

## Known Issues

### ⚠️ Agent Logging Issue (Non-Critical)

**Problem:**
Some agents in `.claude/logs/subagents.jsonl` show hex IDs instead of semantic names:

```json
{"ts":"2025-12-27T13:34:16.910Z","agent":"a2d6725","agent_id":"a2d6725",...}
{"ts":"2025-12-27T22:27:02.279Z","agent":"af61498","agent_id":"af61498",...}
```

Expected:
```json
{"ts":"2025-12-27T13:34:16.910Z","agent":"api-designer","agent_id":"a2d6725",...}
```

**Investigation Findings:**
- Mapping system works correctly for new Task tool calls
- Agents showing hex IDs have NO corresponding Task calls in tools-debug.txt
- These agents were likely:
  1. Resumed agents (using `resume` parameter)
  2. Started before hooks were active
  3. Started in a different session without hooks

**Current Mapping System:**
1. `log-tool-call.js` - When Task tool called → saves mapping to `subagent-map.jsonl`
2. `log-subagent.js` - When agent completes → finds mapping by:
   - Strategy 1: Match prompt content in transcript
   - Strategy 2: Match session ID + first unused
   - Strategy 3: Fallback to oldest unused

**Next Steps for Fix:**
1. Check if agent transcripts contain subagent_type metadata
2. Add fallback to extract type from transcript first line
3. Consider tracking resumed agents separately
4. Document that historical agents without mappings will show hex IDs

**Priority:** Low - doesn't affect functionality, only logging readability

---

## Next Session Tasks

### Immediate Priority: Database Schema Design

Use `schema-architect` subagent to design the Prisma database schema.

**Deliverables:**
1. **Prisma Schema** - `platform/prisma/schema.prisma`
   - User model (OAuth, profile)
   - Room model (with app integration)
   - Participant model (with roles)
   - Prize model
   - Winner model
   - App model (with manifest JSON field)

2. **Relationships:**
   - User ↔ Room (via Participant)
   - Room → App (which app powers this room)
   - Room → Prizes
   - Participant → Winners
   - Prize → Winners

3. **Indexes:**
   - Foreign keys
   - Common query patterns
   - Unique constraints

4. **Migration Strategy:**
   - Initial migration plan
   - Seed data strategy

**Requirements:**
- Follow API design from `docs/api/`
- Support all authentication flows
- Enable soft deletes where needed
- Use Prisma best practices
- Support for JSON fields (app manifest, room settings)

**Command to use:** `/schema-sync` to validate schema after creation

### After Database Schema

1. **Monorepo Setup:**
   - Initialize Turborepo
   - Create `packages/platform-sdk/` with TypeScript types
   - Create `platform/` (Fastify backend)
   - Create `apps/lottery/` and `apps/quiz/`

2. **Platform Implementation:**
   - Implement Fastify routes based on REST API spec
   - Implement Socket.io handlers based on WebSocket protocol
   - Implement authentication middleware
   - Add permission checking middleware

3. **Application Development:**
   - Holiday Lottery (async mechanics)
   - Quiz "Who's First?" (sync real-time mechanics)

---

## Important Notes

### API Authentication Flow

**User Authentication:**
```
1. User → GET /api/auth/google
2. Platform → Redirect to Google OAuth
3. Google → User authenticates
4. Google → Redirect to /api/auth/google/callback
5. Platform → Creates User, returns JWT token
6. User stores token for future requests
```

**Application Authentication:**
```
1. Admin → POST /api/apps (register app, get appId + appSecret)
2. App stores credentials in .env
3. App → POST /api/apps/token { appId, appSecret }
4. Platform → Returns JWT token (expires 1 hour)
5. App includes token in API requests
```

**Dual Authentication (App on behalf of User):**
```http
Authorization: Bearer {userToken}
X-App-Token: {appToken}
X-App-Id: app_lottery_v1
```

### Logging System Usage

**View logs:**
```bash
# Recent subagent invocations
tail -20 .claude/logs/subagents.jsonl

# Recent tool calls
tail -20 .claude/logs/tools.jsonl

# Task → subagent mappings
cat .claude/logs/subagent-map.jsonl

# Debug full JSON
tail -50 .claude/logs/tools-debug.txt
```

**Analyze usage:**
```bash
# Count subagent usage
grep '"agent":' .claude/logs/subagents.jsonl | grep -o '"agent":"[^"]*"' | sort | uniq -c | sort -rn

# Count tool usage
grep '"tool":' .claude/logs/tools.jsonl | grep -o '"tool":"[^"]*"' | sort | uniq -c | sort -rn
```

### Subagent Delegation Rules

**ALWAYS delegate to subagents when:**
1. Designing API endpoints → `api-designer`
2. Designing database schema → `schema-architect`
3. Reviewing code → `code-reviewer`

**Launch subagent:**
```bash
# In conversation
"Use schema-architect subagent to design the database schema"

# Or trigger via keyword
"Design database schema" → Should automatically use schema-architect
```

### MCP Servers

**Available:**
- **context7** - Up-to-date library documentation
- **postgres** - Direct PostgreSQL database access

**Usage:**
```bash
# In conversation
"use context7 for Prisma schema best practices"
"use context7 for Fastify authentication middleware"
"use context7 for Socket.io room management"
```

### Development Philosophy

- **API First:** Design before implementation (✅ Done)
- **Security First:** Validate input, check permissions
- **Type Safety:** No `any` types, explicit interfaces
- **No Raw SQL:** Prisma ORM exclusively

---

## Commands Available

All commands documented in `.claude/commands/`:

```bash
# Database
/migrate          # Run Prisma migrations
/seed             # Seed database with test data
/db-reset         # Reset database to clean state
/schema-sync      # Validate and sync Prisma schema

# API
/api-test         # Test REST API endpoints
/ws-test          # Test WebSocket connections
/api-docs         # Generate/update API documentation
/manifest-validate # Validate app manifest

# Development
/dev              # Start development servers
/build            # Build all packages
/type-check       # Run TypeScript type checking

# Documentation
/docs-fetch       # Fetch latest docs via Context7
/api-design       # Launch API design session
```

---

## Context Files

**Must read before proceeding:**
1. **`docs/event-platform-context.md`** - Architecture decisions (source of truth)
2. **`docs/api/README.md`** - API overview
3. **`docs/api/authentication.md`** - Auth flows (critical for schema design)
4. **`docs/api/rest-endpoints.md`** - All endpoints and their data requirements
5. **`CLAUDE.md`** - Project instructions and conventions
6. This handoff document

---

## Session Context

**What Changed:**
- API design complete (7 docs + OpenAPI spec)
- Authentication model finalized
- All entity relationships defined
- Security model established

**What's Ready:**
- Full API specification for reference
- Clear entity requirements for database schema
- Permission model for access control
- WebSocket event specifications

**What's Needed:**
- Database schema to persist all entities
- Migrations to set up database structure
- Seed data for testing

**Blocked By:**
- Nothing - ready to proceed with schema design

---

## Ready to Proceed

The API design is complete and committed. All documentation is in place.

**Next action:** Use `schema-architect` subagent to design the Prisma database schema based on the API specification.

**Optional:** Fix the agent logging issue to improve debugging experience.
