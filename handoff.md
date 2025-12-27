# Handoff: Event Platform Project Setup Complete

**Date:** December 27, 2025
**Session:** Initial project setup and Claude Code infrastructure
**Next Task:** Design REST API and WebSocket protocol

---

## What Was Accomplished

### 1. Git Repository Setup
- ✅ Initialized git repository
- ✅ Created GitHub remote: https://github.com/aiaiai-copilot/mymozhem-platform-mvp
- ✅ Configured .gitignore for Node.js/TypeScript project

### 2. Claude Code Infrastructure
- ✅ Created `.claude/` directory structure
- ✅ Configured 2 MCP servers (Context7, PostgreSQL)
- ✅ Created 3 subagents:
  - `api-designer` - REST API and WebSocket protocol design
  - `schema-architect` - Prisma database schema design
  - `code-reviewer` - Code quality and security review
- ✅ Created 13 slash commands:
  - Database: `/migrate`, `/seed`, `/db-reset`, `/schema-sync`
  - API: `/api-test`, `/ws-test`, `/api-docs`, `/manifest-validate`
  - Development: `/dev`, `/build`, `/type-check`
  - Documentation: `/docs-fetch`, `/api-design`
- ✅ Written `CLAUDE.md` with project instructions and conventions

### 3. Logging System (FULLY WORKING)
- ✅ Implemented hook-based logging for debugging
- ✅ Tool call tracking (`PreToolUse` hook)
- ✅ Subagent invocation monitoring (`SubagentStop` hook)
- ✅ Skill/command file read logging (`PreToolUse[Read]` hook)
- ✅ Debug files with full JSON input
- ✅ Readable subagent names (e.g., "api-designer" instead of just IDs)

**Log files location:** `.claude/logs/`
- `tools.jsonl` - all tool calls with parameters
- `subagents.jsonl` - subagent invocations with readable names
- `skills.jsonl` - command/skill file reads
- `*-debug.txt` - raw JSON for troubleshooting

**Verified working on:** Windows with MinGW bash, Node.js v22.18.0

### 4. Documentation
- ✅ `docs/event-platform-context.md` - Architecture decisions (source of truth)
- ✅ `CLAUDE.md` - Development instructions for Claude Code
- ✅ All subagents documented with frontmatter
- ✅ All commands documented with usage examples

---

## Current Project State

### Repository
- **Branch:** master
- **Commits:** 3 total
  - Initial setup with Claude Code infrastructure
  - Working hook-based logging system
  - Gitignore for Claude Code settings and logs
- **Uncommitted changes:** Improved subagent logging (ready to commit)

### Project Structure
```
/
├── .claude/
│   ├── agents/          # 3 subagents (api-designer, schema-architect, code-reviewer)
│   ├── commands/        # 13 slash commands
│   ├── hooks/           # 4 logging hooks
│   ├── logs/            # Log files (gitignored)
│   ├── settings.json    # Hook configuration
│   └── settings.local.json  # User-specific settings (gitignored)
├── .mcp.json            # MCP server configuration
├── docs/
│   └── event-platform-context.md  # Architecture decisions
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

### Core Entities (Defined, Not Implemented)
- User, Room, Participant, Prize, Winner, App

### Roles (Defined, Not Implemented)
- Participant, Organizer, Moderator, Viewer, Admin

---

## Next Session Tasks

### Immediate Priority: API Design

**Original Task:**
> Design REST API and WebSocket protocol for platform-application interaction.
> API should support:
> - CRUD for all entities (User, Room, Participant, Prize, Winner, App)
> - Function delegation to applications via manifest
> - Real-time events for synchronous mechanics (quiz)

**Approach:**
1. Use `api-designer` subagent for endpoint design
2. Reference `docs/event-platform-context.md` for architecture decisions
3. Use Context7 MCP for current Fastify/Socket.io documentation
4. Design REST endpoints first, then WebSocket protocol
5. Document in `docs/api/` directory
6. Generate OpenAPI 3.1 spec in `docs/openapi.yaml`

**Unresolved Question (from original session):**
> **Question 1: How should applications authenticate with the Platform API?**
>
> Applications are separate services that need to call the Platform's REST API.
>
> Options:
> - **A) API Keys** (app gets secret key when registered)
> - **B) OAuth Client Credentials** (app exchanges credentials for token)
> - **C) User delegation** (app acts on behalf of user)
> - **D) Combination** (app key + user context)
>
> This affects authorization, permission checks, and entire API security model.

**Must be clarified before API design can proceed.**

### After API Design

1. **Database Schema Design:**
   - Use `schema-architect` subagent
   - Create Prisma schema in `platform/prisma/schema.prisma`
   - Design migrations strategy

2. **Monorepo Setup:**
   - Initialize Turborepo
   - Create `packages/platform-sdk/`
   - Create `platform/` (Fastify backend)
   - Create `apps/lottery/` and `apps/quiz/`

3. **Implementation:**
   - Implement REST API endpoints
   - Implement WebSocket protocol
   - Create application manifest system
   - OAuth authentication

---

## Important Notes

### Logging System Usage

**View logs:**
```bash
# Recent tool calls
cat .claude/logs/tools.jsonl | tail -20

# Subagent invocations
cat .claude/logs/subagents.jsonl | tail -20

# Skill reads
cat .claude/logs/skills.jsonl

# Debug full JSON
cat .claude/logs/tools-debug.txt | tail -50
```

**Analyze usage:**
```bash
# Count tool usage
cat .claude/logs/tools.jsonl | jq -r .tool | sort | uniq -c | sort -rn

# Count subagent usage
cat .claude/logs/subagents.jsonl | jq -r .agent | sort | uniq -c | sort -rn
```

### Subagent Delegation Rules

**ALWAYS delegate to subagents when:**
1. Designing API endpoints → use `api-designer`
2. Designing database schema → use `schema-architect`
3. Reviewing code → use `code-reviewer`

**Use Task tool with appropriate `subagent_type`**

### MCP Servers

**Start MCP servers:**
```bash
# In Claude Code
/mcp
```

**Use Context7 for current docs:**
- "use context7 for Fastify routing"
- "use context7 for Socket.io events"
- "use context7 for Prisma schema"

### Development Philosophy

- **API First:** Design before implementation
- **Security First:** Validate input, check permissions
- **Type Safety:** No `any` types, explicit interfaces
- **No Raw SQL:** Prisma ORM exclusively

---

## Commands Available

All commands documented in `.claude/commands/`:

```bash
/migrate          # Run Prisma migrations
/seed             # Seed database with test data
/db-reset         # Reset database to clean state
/schema-sync      # Validate and sync Prisma schema

/api-test         # Test REST API endpoints
/ws-test          # Test WebSocket connections
/api-docs         # Generate/update API documentation
/manifest-validate # Validate app manifest

/dev              # Start development servers
/build            # Build all packages
/type-check       # Run TypeScript type checking

/docs-fetch       # Fetch latest docs via Context7
/api-design       # Launch API design session
```

---

## Context Files

**Read these before starting:**
1. `docs/event-platform-context.md` - Architecture decisions (source of truth)
2. `CLAUDE.md` - Project instructions and conventions
3. This handoff document

---

## Ready to Proceed

The project infrastructure is complete. All tools, logging, and documentation are in place.

**Next action:** Clarify application authentication approach, then design REST API and WebSocket protocol using the `api-designer` subagent.
