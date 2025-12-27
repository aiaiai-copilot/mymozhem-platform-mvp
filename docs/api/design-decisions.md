# API Design Decisions

## Authentication Architecture

### Decision: Dual Authentication Model (App Key + User Context)

**Chosen Approach:** Option D - Combination (app key + user context)

#### Rationale

The platform serves two distinct types of clients:
1. **End users** - People organizing/participating in events
2. **Applications** - Third-party services integrating with platform

A single authentication model couldn't adequately secure both use cases.

#### Implementation Details

**User Authentication:**
- OAuth 2.0 with Google (extensible to other providers)
- JWT access tokens (1 hour expiry)
- Refresh tokens (30 day expiry)
- Standard flow: Login → Redirect → Callback → Token

**Application Authentication:**
- API keys (`appId` + `appSecret`) issued on registration
- Exchange credentials for JWT access token
- Short-lived tokens (1 hour) for security
- App tokens used for system operations

**Hybrid Operations:**
When app acts on behalf of user:
```http
Authorization: Bearer {userAccessToken}
X-App-Token: {appAccessToken}
X-App-Id: app_lottery_v1
```

Platform validates:
1. User token is valid
2. App token is valid
3. User has required role in room
4. App has required permission in manifest

#### Rejected Alternatives

**Option A: API Keys Only**
- Pros: Simple implementation
- Cons: No user context, can't audit user actions, security risk

**Option B: OAuth Client Credentials**
- Pros: Standard OAuth flow
- Cons: Complex for simple apps, overhead for every request

**Option C: User Delegation Only**
- Pros: Clear user context
- Cons: Apps can't perform system operations, user must be online

#### Security Benefits

1. **Principle of Least Privilege** - Apps only get declared permissions
2. **Audit Trail** - Track which app performed which action for which user
3. **Revocable** - Can revoke app access without affecting user
4. **Granular Control** - Different permission sets per app
5. **Defense in Depth** - Multiple validation layers

---

## REST API Design

### Resource-Based URLs

**Decision:** Use hierarchical resource-based URLs

**Pattern:**
```
/api/{resource}
/api/{resource}/{id}
/api/{resource}/{id}/{subresource}
/api/{resource}/{id}/{subresource}/{subId}
```

**Examples:**
- `/api/rooms` - List rooms
- `/api/rooms/{roomId}` - Get room
- `/api/rooms/{roomId}/participants` - List participants
- `/api/rooms/{roomId}/participants/{participantId}` - Get participant

**Rationale:**
- Clear hierarchy reflects entity relationships
- RESTful conventions widely understood
- Predictable URL structure
- Easy to implement authorization (check room access before participant access)

### HTTP Methods

**Decision:** Standard HTTP method semantics

| Method | Purpose | Idempotent | Response |
|--------|---------|------------|----------|
| GET | Read resource | Yes | 200 with data |
| POST | Create resource | No | 201 with created data |
| PATCH | Partial update | No | 200 with updated data |
| DELETE | Remove resource | Yes | 200/204 with success |

**Rationale:**
- Industry standard conventions
- Clear intent from HTTP method alone
- Works with HTTP caching and proxies
- PATCH over PUT for partial updates (more flexible)

### Response Format

**Decision:** Consistent envelope format

**Success:**
```json
{
  "data": { /* resource or array */ },
  "meta": { /* pagination, etc */ }
}
```

**Error:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* context */ }
  }
}
```

**Rationale:**
- Predictable structure for clients
- Clear separation of data and metadata
- Error responses consistent across endpoints
- Easy to add metadata without breaking changes
- Works well with TypeScript type system

**Rejected Alternative:**
Direct resource in response body (e.g., `{ "id": "...", "name": "..." }`)
- Cons: Harder to add metadata, inconsistent error format

### Pagination

**Decision:** Offset-based pagination with page/limit

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page

**Response:**
```json
{
  "data": [ /* items */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Rationale:**
- Simple to understand and implement
- Works with SQL OFFSET/LIMIT
- Easy to jump to specific page
- Clear metadata about total results

**Trade-offs:**
- Not ideal for real-time data (cursor-based better)
- Performance degrades with high offset (acceptable for MVP)

**Future:** May add cursor-based pagination for real-time feeds

---

## WebSocket Protocol

### Library Choice: Socket.io

**Decision:** Use Socket.io over raw WebSocket

**Rationale:**
- Automatic reconnection
- Fallback to HTTP long-polling
- Room-based broadcasting (perfect for our use case)
- Acknowledgment callbacks
- Battle-tested in production
- Excellent client libraries (JS, iOS, Android, etc.)

**Trade-offs:**
- Slightly larger bundle size
- Custom protocol (not pure WebSocket)
- Acceptable for benefits gained

### Event Naming Convention

**Decision:** `entity:action` pattern

**Examples:**
- `participant:joined`
- `winner:selected`
- `room:status_changed`
- `lottery:draw_started` (app-specific, prefixed with appId)

**Rationale:**
- Clear, self-documenting event names
- Easy to filter/namespace
- Consistent pattern across platform
- App-specific events clearly namespaced

### Connection Architecture

**Decision:** Namespace-based with room subscriptions

**Pattern:**
1. Client connects to platform WebSocket
2. Client emits `room:subscribe` with roomId
3. Server adds client to Socket.io room
4. Server broadcasts events to room
5. Only subscribed clients receive events

**Rationale:**
- Efficient - clients only receive relevant events
- Secure - server validates room access before subscribing
- Scalable - Socket.io rooms handle distribution
- Explicit - clients opt-in to events

**Alternative Considered:**
Separate namespace per room (`/rooms/{roomId}`)
- Cons: More connection overhead, harder to manage

---

## Function Delegation

### Webhook-Based Delegation

**Decision:** Platform calls app webhooks for delegated functions

**Flow:**
1. Room configured to use app with capability
2. User triggers action (e.g., "draw winners")
3. Platform calls app webhook with context
4. App performs custom logic
5. App returns result
6. Platform validates and persists
7. Platform broadcasts events

**Example (Winner Selection):**
```http
POST {appBaseUrl}/api/platform/winner-selection
X-Platform-Signature: sha256=...

{
  "roomId": "room_xyz789",
  "participants": [ /* ... */ ],
  "prizes": [ /* ... */ ]
}
```

**Rationale:**
- Synchronous - platform waits for result
- Validated - platform checks result before persisting
- Secure - HMAC signature verification
- Flexible - app has full context to make decision
- Auditable - platform logs all delegations

**Alternative Considered:**
Event-based (app subscribes to events, performs action, calls platform API)
- Cons: Harder to coordinate, race conditions, eventual consistency issues

### Capability Declaration

**Decision:** Apps declare capabilities in manifest

**Capabilities:**
- `prizeFund` - Prize fund management UI
- `participantRegistration` - Custom registration flow
- `winnerSelection` - Custom winner algorithm
- `notifications` - Custom notification system
- `roomSettings` - Custom settings UI

**Rationale:**
- Explicit contract between app and platform
- Platform knows what to delegate
- Organizers see what app overrides
- Security - can't delegate without declaration

---

## Permission Model

### Fine-Grained Permissions

**Decision:** Resource-based permissions with read/write separation

**Format:** `{resource}:{operation}`

**Examples:**
- `rooms:read` - Read room data
- `rooms:write` - Create/modify rooms
- `prizes:write` - Manage prizes
- `realtime:publish` - Publish custom events

**Rationale:**
- Granular control - apps request only what they need
- Clear semantics - obvious what permission allows
- Extensible - easy to add new permissions
- Standard pattern - similar to OAuth scopes

**Implementation:**
```javascript
// Middleware checks permission
function requirePermission(permission) {
  return async (request, reply) => {
    const app = request.app; // from token
    if (!app.permissions.includes(permission)) {
      reply.code(403).send({
        error: {
          code: 'APP_PERMISSION_DENIED',
          message: 'App lacks required permission',
          details: { required: permission }
        }
      });
    }
  };
}
```

---

## Rate Limiting

### Tiered Rate Limits

**Decision:** Different limits per authentication type

| Type | Limit | Rationale |
|------|-------|-----------|
| Unauthenticated | 20/min | Prevent abuse, allow docs access |
| Users | 100/min | Normal user usage patterns |
| Applications | 1000/min | Apps serve multiple users |

**Implementation:**
- Key by user ID or app ID
- Sliding window algorithm
- Return `429 Too Many Requests` when exceeded
- Include rate limit headers

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704448800
```

**Rationale:**
- Prevent abuse
- Fair resource allocation
- Predictable for developers
- Industry standard headers

---

## Validation Strategy

### Input Validation

**Decision:** Schema-based validation with Fastify

**Approach:**
1. Define JSON Schema for each endpoint
2. Fastify validates request automatically
3. Return `422 Unprocessable Entity` with field errors

**Example:**
```javascript
const createRoomSchema = {
  body: {
    type: 'object',
    required: ['name', 'appId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      appId: { type: 'string' },
      appSettings: { type: 'object' }
    }
  }
};

fastify.post('/api/rooms', {
  schema: createRoomSchema
}, handler);
```

**Error Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": ["Name is required"],
        "appId": ["Must be a valid app ID"]
      }
    }
  }
}
```

**Rationale:**
- Declarative - schema is documentation
- Fast - validated at Fastify level
- Consistent - same format everywhere
- Type-safe - generates TypeScript types
- Secure - prevents injection attacks

---

## Error Handling

### Structured Error Codes

**Decision:** Predefined error codes with details

**Error Structure:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* context */ }
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - State conflict or duplicate
- `VALIDATION_ERROR` - Input validation failed
- `APP_PERMISSION_DENIED` - App lacks permission
- `RATE_LIMIT_EXCEEDED` - Too many requests

**Rationale:**
- Programmatic error handling (check code, not message)
- Localizable (client can translate based on code)
- Debug-friendly (details provide context)
- Consistent across platform

---

## API Versioning Strategy

### URL-Based Versioning (Future)

**Current:** No versioning (v1 implicit)

**Future Plan:**
```
/api/v1/rooms
/api/v2/rooms
```

**Rationale:**
- Clear version in URL
- Can run multiple versions simultaneously
- Easy to deprecate old versions
- Standard practice

**For MVP:**
- Single version
- Breaking changes require major version bump
- Maintain backward compatibility where possible

---

## OpenAPI Specification

### Decision: Maintain OpenAPI 3.1 spec

**Purpose:**
- Single source of truth for API
- Generate client SDKs
- Interactive documentation (Swagger UI)
- Request/response validation
- Contract testing

**Location:** `docs/openapi.yaml`

**Rationale:**
- Industry standard
- Tooling ecosystem (code gen, testing, docs)
- Machine-readable contract
- Versioned with code

---

## Summary

The API design prioritizes:

1. **Security** - Dual authentication, fine-grained permissions, validation
2. **Developer Experience** - Consistent patterns, clear errors, comprehensive docs
3. **Flexibility** - Function delegation, application extensibility
4. **Performance** - Rate limiting, pagination, efficient queries
5. **Maintainability** - RESTful conventions, structured errors, versioning strategy

These decisions balance MVP speed with long-term scalability and provide a solid foundation for the platform's growth.
