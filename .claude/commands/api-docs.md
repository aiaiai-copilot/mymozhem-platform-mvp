---
description: Generate and update API documentation. Creates OpenAPI/Swagger specs from code.
---

# API Documentation

Generate and maintain API documentation.

## Generate Docs

```bash
# Generate OpenAPI spec
pnpm run docs:generate

# Serve interactive docs (Swagger UI)
pnpm run docs:serve

# Validate OpenAPI spec
pnpm run docs:validate
```

## Documentation Format

### OpenAPI 3.1 Spec
Location: `docs/openapi.yaml`

Includes:
- All REST endpoints
- Request/response schemas
- Authentication methods
- Error responses
- Examples

### WebSocket Protocol
Location: `docs/websocket-protocol.md`

Documents:
- Connection flow
- Event catalog
- Payload schemas
- Error handling

## Auto-generation

Use Fastify plugins for automatic spec generation:
- `@fastify/swagger` — Generate OpenAPI from routes
- `@fastify/swagger-ui` — Interactive API explorer

Example route with schema:
```typescript
fastify.post('/api/rooms', {
  schema: {
    description: 'Create a new room',
    tags: ['rooms'],
    body: createRoomSchema,
    response: {
      201: roomResponseSchema,
      400: errorSchema
    }
  }
}, createRoomHandler);
```

## Viewing Docs

### Local Development
- Swagger UI: http://localhost:3000/docs
- ReDoc: http://localhost:3000/redoc
- OpenAPI JSON: http://localhost:3000/docs/json

### Static Export
```bash
# Export to static HTML
pnpm run docs:export
# Output: docs/api.html
```

## SDK Generation

Generate client SDKs from OpenAPI:
```bash
# TypeScript SDK
npx openapi-typescript docs/openapi.yaml -o packages/sdk/src/types.ts

# Other languages (future)
npx @openapitools/openapi-generator-cli generate
```
