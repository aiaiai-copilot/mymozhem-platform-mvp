# API Documentation

Complete REST API and WebSocket protocol documentation for the Event Management Platform.

## Quick Links

- [Authentication & Authorization](./authentication.md) - OAuth, API keys, permissions
- [REST API Endpoints](./rest-endpoints.md) - Complete endpoint reference
- [WebSocket Protocol](./websocket-protocol.md) - Real-time event specification
- [OpenAPI Specification](../openapi.yaml) - Machine-readable API spec

---

## Overview

The Event Management Platform provides a headless backend for organizing celebratory events (lotteries, quizzes, tastings, contests) with unified application integration through a standard protocol.

### Architecture

```
┌─────────────────┐
│   Application   │ (Lottery, Quiz, etc.)
│   Frontend +    │
│   Backend       │
└────────┬────────┘
         │ REST API + WebSocket
         │ (with app authentication)
         │
┌────────▼────────────────────────────────┐
│         Platform Backend                │
│  Fastify + Prisma + PostgreSQL          │
│  + Socket.io                            │
└─────────────────────────────────────────┘
```

### Key Features

- **User Management** - OAuth authentication (Google), profile management
- **Room Management** - Create and manage events/rooms
- **Participant System** - Role-based participation (organizer, moderator, participant, viewer)
- **Prize Fund** - Manage prizes and distribution
- **Winner Selection** - Manual or delegated to applications
- **Application Integration** - Register apps with manifest-based permissions
- **Real-time Events** - WebSocket broadcasting for live updates
- **Function Delegation** - Apps can override platform functions

---

## Authentication Model

### Recommended Approach: Combination (App Key + User Context)

The platform uses a **dual authentication model**:

1. **User Authentication** - OAuth 2.0 (Google) for end users
2. **Application Authentication** - API Key + JWT for applications

#### Why This Approach?

- **App-to-Platform calls** - Applications authenticate themselves with API key
- **User context** - Applications can act on behalf of users (OAuth delegation)
- **Security** - Dual verification prevents unauthorized access
- **Audit trail** - Track which app performed which action for which user

#### Implementation

**Apps get credentials when registered:**
```json
{
  "appId": "app_lottery_v1",
  "appSecret": "sk_live_abc123def456..."
}
```

**User actions include both tokens:**
```http
Authorization: Bearer {userAccessToken}
X-App-Token: {appAccessToken}
X-App-Id: app_lottery_v1
```

**Platform validates:**
1. User authentication - Valid user token
2. Application authentication - Valid app token
3. User role - User has required role in room
4. Application permissions - App manifest includes required permission

See [authentication.md](./authentication.md) for complete details.

---

## Core Concepts

### Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| **User** | System user | id, email, name, avatar |
| **Room** | Event/room | id, name, appId, status, appSettings |
| **Participant** | User in room | id, userId, roomId, role, metadata |
| **Prize** | Prize in fund | id, name, quantity, quantityRemaining |
| **Winner** | Prize assignment | id, participantId, prizeId |
| **App** | Registered application | appId, manifest |

### Roles (within room)

- **Organizer** - Room creator/owner (full control)
- **Moderator** - Organizer's assistant (can manage participants, prizes)
- **Participant** - Event participant
- **Viewer** - Observer without participation
- **Admin** - Platform administrator (global)

### Room Status

- `draft` - Room created but not started
- `active` - Room is live
- `completed` - Event finished
- `cancelled` - Event cancelled

---

## API Design Principles

### RESTful Conventions

- **Resource-based URLs** - `/api/rooms/:roomId/participants`
- **HTTP methods** - GET (read), POST (create), PATCH (update), DELETE (remove)
- **Consistent responses** - `{ data, error, meta }` structure
- **Status codes** - 2xx success, 4xx client error, 5xx server error

### Response Format

**Success:**
```json
{
  "data": { /* resource or array */ },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional context */ }
  }
}
```

### Pagination

All list endpoints support pagination:
```http
GET /api/rooms?page=1&limit=20
```

Response includes metadata:
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

---

## WebSocket Protocol

### Event Naming Convention

Format: `entity:action`

Examples:
- `participant:joined`
- `winner:selected`
- `room:status_changed`
- `lottery:draw_started` (app-specific)

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.platform.example.com', {
  auth: { token: 'user_access_token' }
});

socket.on('connect', () => {
  // Subscribe to room events
  socket.emit('room:subscribe', { roomId: 'room_xyz789' });
});

// Listen for events
socket.on('participant:joined', (data) => {
  console.log('Participant joined:', data.participant);
});
```

See [websocket-protocol.md](./websocket-protocol.md) for complete protocol.

---

## Application Integration

### Manifest System

Applications declare capabilities and permissions in a JSON manifest:

```json
{
  "meta": {
    "name": "Holiday Lottery",
    "version": "1.0.0",
    "description": "Application for conducting lotteries"
  },
  "baseUrl": "https://lottery.example.com",
  "capabilities": ["winnerSelection"],
  "permissions": [
    "users:read",
    "rooms:read",
    "rooms:write",
    "participants:read",
    "participants:write",
    "prizes:read",
    "prizes:write",
    "realtime:subscribe"
  ],
  "settings": {
    "type": "object",
    "properties": {
      "ticketCount": {
        "type": "integer",
        "minimum": 1
      },
      "drawDate": {
        "type": "string",
        "format": "date-time"
      }
    }
  }
}
```

### Capabilities (Delegatable Functions)

Applications can take over platform functions:

- `prizeFund` - Prize fund management UI
- `participantRegistration` - Custom registration flow
- `winnerSelection` - Custom winner selection algorithm
- `notifications` - Custom notification system
- `roomSettings` - Custom settings UI

### Permissions

Fine-grained permissions control API access:

- `users:read` - Read user profiles
- `rooms:read/write` - Read/modify rooms
- `participants:read/write` - Read/modify participants
- `prizes:read/write` - Read/modify prizes
- `winners:read/write` - Read/select winners
- `realtime:subscribe` - Subscribe to WebSocket events
- `realtime:publish` - Publish custom events

---

## Function Delegation Example

When a room uses an app with `winnerSelection` capability, the platform delegates winner selection to the app:

**Platform → App:**
```http
POST {appBaseUrl}/api/platform/winner-selection
Content-Type: application/json
X-Platform-Signature: {hmac_signature}

{
  "roomId": "room_xyz789",
  "participants": [ /* ... */ ],
  "prizes": [ /* ... */ ]
}
```

**App → Platform:**
```json
{
  "winners": [
    {
      "participantId": "part_123abc",
      "prizeId": "prize_def456",
      "metadata": {
        "drawNumber": 1,
        "algorithm": "random"
      }
    }
  ]
}
```

Platform validates and creates winner records, then broadcasts via WebSocket.

---

## Security

### Authentication Required

All endpoints except OAuth callbacks require authentication:
- User endpoints: `Authorization: Bearer {userToken}`
- App endpoints: `Authorization: Bearer {appToken}` + `X-App-Id: {appId}`

### Permission Checks

Every operation validates:
1. Valid token (not expired, not revoked)
2. User/app has required role
3. App has required permission (for delegated operations)

### Rate Limiting

- **Users:** 100 requests/minute
- **Applications:** 1000 requests/minute
- **Unauthenticated:** 20 requests/minute

### HTTPS Only

All production API calls must use HTTPS.

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate resource or state conflict |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `APP_PERMISSION_DENIED` | 403 | App lacks required permission |

---

## Examples

### Create Room and Add Participants

```javascript
// 1. Create room
const room = await fetch('/api/rooms', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'New Year Lottery 2025',
    appId: 'app_lottery_v1',
    appSettings: {
      ticketCount: 100,
      drawDate: '2025-12-31T23:00:00Z'
    },
    isPublic: true
  })
}).then(r => r.json());

// 2. Join room
const participant = await fetch(`/api/rooms/${room.data.id}/participants`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'participant',
    metadata: { ticketNumber: 42 }
  })
}).then(r => r.json());

// 3. Subscribe to WebSocket events
const socket = io('wss://api.platform.example.com', {
  auth: { token: userToken }
});

socket.emit('room:subscribe', { roomId: room.data.id });
socket.on('participant:joined', (data) => {
  console.log('New participant:', data.participant.user.name);
});
```

### Application Publishing Custom Event

```javascript
// App publishes draw started event
await fetch(`/api/rooms/${roomId}/events`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${appToken}`,
    'X-App-Id': 'app_lottery_v1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event: 'lottery:draw_started',
    data: {
      drawNumber: 1,
      totalPrizes: 10,
      estimatedDuration: 300
    }
  })
});

// All subscribed clients receive:
// socket.on('lottery:draw_started', (data) => { /* ... */ })
```

---

## Development

### OpenAPI Tools

Use the [OpenAPI specification](../openapi.yaml) to:
- Generate client SDKs
- Test API with Swagger UI
- Validate requests/responses
- Generate documentation

**Swagger UI:**
```bash
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/docs/openapi.yaml \
  -v $(pwd)/docs:/docs \
  swaggerapi/swagger-ui
```

Visit http://localhost:8080

### Testing

See [rest-endpoints.md](./rest-endpoints.md) for example requests.

Use the `/api-test` command to test endpoints:
```bash
/api-test
```

---

## Support

For questions or issues:
- Email: api@platform.example.com
- GitHub: [Create an issue](https://github.com/example/platform/issues)
- Documentation: Check individual markdown files in this directory

---

## Changelog

### v1.0.0 (2025-01-15)
- Initial API design
- User authentication (OAuth Google)
- Room management
- Participant system with roles
- Prize fund management
- Winner selection
- Application registration and manifest
- WebSocket real-time events
- Function delegation system
