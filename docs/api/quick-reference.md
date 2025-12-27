# API Quick Reference

## Base URL

```
https://api.platform.example.com
```

---

## Authentication

### User Login (OAuth Google)

```http
GET /api/auth/google
```

Redirects to Google OAuth, returns to callback with token.

### Get Access Token

After OAuth callback, you receive:
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

### Use Token

```http
Authorization: Bearer {accessToken}
```

---

## Common Endpoints

### Rooms

```http
# List rooms
GET /api/rooms?page=1&limit=20&status=active

# Create room
POST /api/rooms
{
  "name": "New Year Lottery 2025",
  "appId": "app_lottery_v1",
  "appSettings": { "ticketCount": 100 }
}

# Get room
GET /api/rooms/{roomId}

# Update room
PATCH /api/rooms/{roomId}
{ "status": "active" }

# Delete room
DELETE /api/rooms/{roomId}
```

### Participants

```http
# Join room
POST /api/rooms/{roomId}/participants
{ "role": "participant" }

# List participants
GET /api/rooms/{roomId}/participants

# Update participant
PATCH /api/rooms/{roomId}/participants/{participantId}
{ "role": "moderator" }

# Remove participant
DELETE /api/rooms/{roomId}/participants/{participantId}
```

### Prizes

```http
# Create prize
POST /api/rooms/{roomId}/prizes
{
  "name": "iPhone 15",
  "quantity": 1
}

# List prizes
GET /api/rooms/{roomId}/prizes

# Update prize
PATCH /api/rooms/{roomId}/prizes/{prizeId}
{ "quantity": 2 }

# Delete prize
DELETE /api/rooms/{roomId}/prizes/{prizeId}
```

### Winners

```http
# Select winner
POST /api/rooms/{roomId}/winners
{
  "participantId": "part_123abc",
  "prizeId": "prize_def456"
}

# List winners
GET /api/rooms/{roomId}/winners

# Remove winner
DELETE /api/rooms/{roomId}/winners/{winnerId}
```

---

## WebSocket Events

### Connect

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.platform.example.com', {
  auth: { token: userAccessToken }
});
```

### Subscribe to Room

```javascript
socket.emit('room:subscribe', { roomId: 'room_xyz789' });
```

### Listen for Events

```javascript
// Participant events
socket.on('participant:joined', (data) => {
  console.log('Participant joined:', data.participant);
});

socket.on('participant:left', (data) => {
  console.log('Participant left:', data.participantId);
});

// Prize events
socket.on('prize:created', (data) => {
  console.log('Prize created:', data.prize);
});

// Winner events
socket.on('winner:selected', (data) => {
  console.log('Winner:', data.winner);
});

// Room events
socket.on('room:updated', (data) => {
  console.log('Room updated:', data.room);
});

socket.on('room:status_changed', (data) => {
  console.log('Status changed:', data.oldStatus, '->', data.newStatus);
});
```

---

## Response Format

### Success

```json
{
  "data": {
    "id": "room_xyz789",
    "name": "New Year Lottery 2025"
  }
}
```

### Success with Pagination

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

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": ["Name is required"]
      }
    }
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Delete successful |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate or state conflict |
| 422 | Validation Error - Input validation failed |
| 429 | Rate Limit Exceeded |
| 500 | Server Error |

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or expired token |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Duplicate resource or state conflict |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `APP_PERMISSION_DENIED` | App lacks required permission |

---

## Permissions

### User Permissions (per room)

- `organizer` - Full control (creator)
- `moderator` - Manage participants/prizes
- `participant` - Join and participate
- `viewer` - View only

### App Permissions (manifest)

- `users:read` - Read user profiles
- `rooms:read/write` - Read/modify rooms
- `participants:read/write` - Read/modify participants
- `prizes:read/write` - Read/modify prizes
- `winners:read/write` - Read/select winners
- `realtime:subscribe` - Subscribe to WebSocket events
- `realtime:publish` - Publish custom events

---

## Pagination

```http
GET /api/rooms?page=1&limit=20
```

**Parameters:**
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

---

## Filtering

```http
# Filter by status
GET /api/rooms?status=active

# Filter by app
GET /api/rooms?appId=app_lottery_v1

# Filter by public/private
GET /api/rooms?isPublic=true

# Multiple filters
GET /api/rooms?status=active&isPublic=true&page=1&limit=50
```

---

## Rate Limits

| Type | Limit |
|------|-------|
| Unauthenticated | 20/minute |
| Users | 100/minute |
| Applications | 1000/minute |

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704448800
```

---

## Application Authentication

### 1. Register App (Admin)

```http
POST /api/apps
Authorization: Bearer {adminToken}

{
  "manifest": { /* see app-manifest.md */ }
}
```

Response:
```json
{
  "data": {
    "appId": "app_lottery_v1",
    "appSecret": "sk_live_abc123...",
    "manifest": { /* ... */ }
  }
}
```

### 2. Get App Token

```http
POST /api/apps/token

{
  "appId": "app_lottery_v1",
  "appSecret": "sk_live_abc123..."
}
```

Response:
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

### 3. Make Authenticated Request

**App acting on behalf of user:**
```http
POST /api/rooms/{roomId}/prizes
Authorization: Bearer {userToken}
X-App-Token: {appToken}
X-App-Id: app_lottery_v1

{ "name": "Prize", "quantity": 1 }
```

**App system operation:**
```http
POST /api/rooms/{roomId}/events
Authorization: Bearer {appToken}
X-App-Id: app_lottery_v1

{
  "event": "lottery:draw_started",
  "data": { "drawNumber": 1 }
}
```

---

## Complete Example Flow

### Create Room and Conduct Lottery

```javascript
// 1. Authenticate user
window.location.href = 'https://api.platform.example.com/api/auth/google';
// (redirects back with token)

const userToken = 'eyJhbGciOiJIUzI1NiIs...';

// 2. Create room
const room = await fetch('https://api.platform.example.com/api/rooms', {
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

const roomId = room.data.id;

// 3. Add prizes
await fetch(`https://api.platform.example.com/api/rooms/${roomId}/prizes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Grand Prize - iPhone 15',
    quantity: 1
  })
});

// 4. Join as participant
await fetch(`https://api.platform.example.com/api/rooms/${roomId}/participants`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'participant'
  })
});

// 5. Subscribe to WebSocket events
const socket = io('wss://api.platform.example.com', {
  auth: { token: userToken }
});

socket.on('connect', () => {
  socket.emit('room:subscribe', { roomId });
});

socket.on('participant:joined', (data) => {
  console.log('New participant:', data.participant.user.name);
});

socket.on('winner:selected', (data) => {
  console.log('Winner!', data.winner.participant.user.name,
              'won', data.winner.prize.name);
});

// 6. Activate room
await fetch(`https://api.platform.example.com/api/rooms/${roomId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'active'
  })
});

// 7. Draw winner (manually or via app delegation)
const participants = await fetch(
  `https://api.platform.example.com/api/rooms/${roomId}/participants`
).then(r => r.json());

const prizes = await fetch(
  `https://api.platform.example.com/api/rooms/${roomId}/prizes`
).then(r => r.json());

const randomParticipant = participants.data[
  Math.floor(Math.random() * participants.data.length)
];
const randomPrize = prizes.data[0];

await fetch(`https://api.platform.example.com/api/rooms/${roomId}/winners`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    participantId: randomParticipant.id,
    prizeId: randomPrize.id
  })
});

// WebSocket event fires: winner:selected
```

---

## Testing with cURL

### Create Room

```bash
curl -X POST https://api.platform.example.com/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "appId": "app_lottery_v1",
    "appSettings": {"ticketCount": 50}
  }'
```

### List Rooms

```bash
curl https://api.platform.example.com/api/rooms?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Join Room

```bash
curl -X POST https://api.platform.example.com/api/rooms/room_xyz789/participants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "participant"}'
```

---

## Links

- [Complete REST API Documentation](./rest-endpoints.md)
- [WebSocket Protocol](./websocket-protocol.md)
- [Authentication Guide](./authentication.md)
- [App Manifest Specification](./app-manifest.md)
- [Design Decisions](./design-decisions.md)
- [OpenAPI Spec](../openapi.yaml)

---

## Support

Questions? Check the full documentation or contact:
- Email: api@platform.example.com
- GitHub Issues: [Create an issue](https://github.com/example/platform/issues)
