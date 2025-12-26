---
description: Fetch latest documentation via Context7. Gets current docs for project dependencies.
---

# Fetch Documentation

Use Context7 MCP to fetch up-to-date documentation for libraries and frameworks.

## Usage

Just mention "use context7" in your prompts to Claude:

```
"use context7 to check latest Fastify plugin API"
"use context7 for Socket.io namespace documentation"
"use context7 for Prisma relation syntax"
```

## Supported Libraries

Context7 has docs for:
- **Fastify** — Routing, plugins, lifecycle hooks
- **Prisma** — Schema, queries, migrations
- **Socket.io** — Events, rooms, namespaces
- **TypeScript** — Language features, types
- **Next.js** — App router, API routes
- **PostgreSQL** — SQL syntax, data types

## Why Context7?

Claude's training data has a cutoff date (January 2025). Libraries update frequently. Context7 fetches current documentation to ensure:
- Latest API changes
- New features
- Deprecated patterns
- Best practices

## Manual Fetch

If Context7 isn't working, check official docs:
- Fastify: https://fastify.dev
- Prisma: https://prisma.io/docs
- Socket.io: https://socket.io/docs
- Next.js: https://nextjs.org/docs

## Configuration

Context7 configured in `.mcp.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

Start with: `/mcp` to authenticate MCP servers.
