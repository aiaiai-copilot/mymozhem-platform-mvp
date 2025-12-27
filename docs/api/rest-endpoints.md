# REST API Endpoints

## Base URL

```
https://api.platform.example.com
```

## Response Format

All endpoints return JSON with consistent structure:

### Success Response
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

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional context */ }
  }
}
```

---

## Users

### Get User Profile
```http
GET /api/users/:userId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Update User Profile
```http
PATCH /api/users/:userId
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatar": "https://..."
}
```

**Response:** Updated user object

### Delete User
```http
DELETE /api/users/:userId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Rooms

### Create Room
```http
POST /api/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Year Lottery 2025",
  "description": "Win amazing prizes!",
  "appId": "app_lottery_v1",
  "appSettings": {
    "ticketCount": 100,
    "drawDate": "2025-12-31T23:00:00Z"
  },
  "isPublic": true
}
```

**Response:**
```json
{
  "data": {
    "id": "room_xyz789",
    "name": "New Year Lottery 2025",
    "description": "Win amazing prizes!",
    "appId": "app_lottery_v1",
    "appSettings": { /* ... */ },
    "status": "draft",
    "isPublic": true,
    "createdBy": "usr_abc123",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

**Validation:**
- `appId` must reference valid registered app
- `appSettings` validated against app manifest schema
- User becomes organizer automatically

### List Rooms
```http
GET /api/rooms?page=1&limit=20&status=active&appId=app_lottery_v1
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Items per page
- `status` (optional) - Filter by status: `draft`, `active`, `completed`, `cancelled`
- `appId` (optional) - Filter by application
- `isPublic` (optional) - Filter public/private rooms
- `createdBy` (optional) - Filter by creator user ID

**Response:**
```json
{
  "data": [
    {
      "id": "room_xyz789",
      "name": "New Year Lottery 2025",
      "description": "Win amazing prizes!",
      "appId": "app_lottery_v1",
      "status": "active",
      "isPublic": true,
      "participantCount": 45,
      "prizeCount": 10,
      "createdBy": "usr_abc123",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Get Room Details
```http
GET /api/rooms/:roomId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "id": "room_xyz789",
    "name": "New Year Lottery 2025",
    "description": "Win amazing prizes!",
    "appId": "app_lottery_v1",
    "appSettings": {
      "ticketCount": 100,
      "drawDate": "2025-12-31T23:00:00Z"
    },
    "status": "active",
    "isPublic": true,
    "createdBy": "usr_abc123",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z",
    "app": {
      "id": "app_lottery_v1",
      "name": "Holiday Lottery",
      "version": "1.0.0",
      "baseUrl": "https://lottery.example.com"
    }
  }
}
```

### Update Room
```http
PATCH /api/rooms/:roomId
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Room Name",
  "description": "Updated description",
  "appSettings": {
    "ticketCount": 150
  },
  "status": "active"
}
```

**Permissions:** Organizer only

**Response:** Updated room object

### Delete Room
```http
DELETE /api/rooms/:roomId
Authorization: Bearer {token}
```

**Permissions:** Organizer only

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Participants

### Join Room
```http
POST /api/rooms/:roomId/participants
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "participant",
  "metadata": {
    "ticketNumber": 42
  }
}
```

**Roles:** `participant`, `viewer`

**Response:**
```json
{
  "data": {
    "id": "part_123abc",
    "userId": "usr_abc123",
    "roomId": "room_xyz789",
    "role": "participant",
    "metadata": {
      "ticketNumber": 42
    },
    "joinedAt": "2025-01-15T10:00:00Z",
    "user": {
      "id": "usr_abc123",
      "name": "John Doe",
      "avatar": "https://..."
    }
  }
}
```

**Validation:**
- User cannot join same room twice
- Room must be `active` or organizer can join any status

### List Participants
```http
GET /api/rooms/:roomId/participants?page=1&limit=50&role=participant
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `role` (optional) - Filter by role

**Response:**
```json
{
  "data": [
    {
      "id": "part_123abc",
      "userId": "usr_abc123",
      "roomId": "room_xyz789",
      "role": "participant",
      "metadata": {
        "ticketNumber": 42
      },
      "joinedAt": "2025-01-15T10:00:00Z",
      "user": {
        "id": "usr_abc123",
        "name": "John Doe",
        "avatar": "https://..."
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 45
  }
}
```

### Get Participant
```http
GET /api/rooms/:roomId/participants/:participantId
Authorization: Bearer {token}
```

**Response:** Participant object with user details

### Update Participant
```http
PATCH /api/rooms/:roomId/participants/:participantId
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "moderator",
  "metadata": {
    "ticketNumber": 43
  }
}
```

**Permissions:** Organizer/moderator only

**Response:** Updated participant object

### Remove Participant
```http
DELETE /api/rooms/:roomId/participants/:participantId
Authorization: Bearer {token}
```

**Permissions:** Organizer/moderator can remove others, participant can remove self

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Prizes

### Create Prize
```http
POST /api/rooms/:roomId/prizes
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Grand Prize - iPhone 15",
  "description": "Latest iPhone model",
  "imageUrl": "https://...",
  "quantity": 1,
  "metadata": {
    "value": 999.99,
    "sponsor": "TechCorp"
  }
}
```

**Permissions:** Organizer/moderator only (or app with `prizes:write`)

**Response:**
```json
{
  "data": {
    "id": "prize_def456",
    "roomId": "room_xyz789",
    "name": "Grand Prize - iPhone 15",
    "description": "Latest iPhone model",
    "imageUrl": "https://...",
    "quantity": 1,
    "quantityRemaining": 1,
    "metadata": {
      "value": 999.99,
      "sponsor": "TechCorp"
    },
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### List Prizes
```http
GET /api/rooms/:roomId/prizes?page=1&limit=50
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "id": "prize_def456",
      "roomId": "room_xyz789",
      "name": "Grand Prize - iPhone 15",
      "description": "Latest iPhone model",
      "imageUrl": "https://...",
      "quantity": 1,
      "quantityRemaining": 0,
      "winnerCount": 1,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 10
  }
}
```

### Get Prize
```http
GET /api/rooms/:roomId/prizes/:prizeId
Authorization: Bearer {token}
```

**Response:** Prize object

### Update Prize
```http
PATCH /api/rooms/:roomId/prizes/:prizeId
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Prize Name",
  "quantity": 2
}
```

**Permissions:** Organizer/moderator only

**Response:** Updated prize object

### Delete Prize
```http
DELETE /api/rooms/:roomId/prizes/:prizeId
Authorization: Bearer {token}
```

**Permissions:** Organizer/moderator only

**Validation:** Cannot delete prize with winners

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Winners

### Select Winner
```http
POST /api/rooms/:roomId/winners
Authorization: Bearer {token}
Content-Type: application/json

{
  "participantId": "part_123abc",
  "prizeId": "prize_def456",
  "metadata": {
    "drawNumber": 1,
    "timestamp": "2025-12-31T23:00:00Z"
  }
}
```

**Permissions:** Organizer/moderator only (or app with `winners:write`)

**Response:**
```json
{
  "data": {
    "id": "winner_ghi789",
    "roomId": "room_xyz789",
    "participantId": "part_123abc",
    "prizeId": "prize_def456",
    "metadata": {
      "drawNumber": 1,
      "timestamp": "2025-12-31T23:00:00Z"
    },
    "createdAt": "2025-12-31T23:00:01Z",
    "participant": {
      "id": "part_123abc",
      "user": {
        "id": "usr_abc123",
        "name": "John Doe",
        "avatar": "https://..."
      }
    },
    "prize": {
      "id": "prize_def456",
      "name": "Grand Prize - iPhone 15"
    }
  }
}
```

**Validation:**
- Participant must exist in room
- Prize must exist in room
- Prize must have remaining quantity

### List Winners
```http
GET /api/rooms/:roomId/winners?page=1&limit=50&prizeId=prize_def456
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `prizeId` (optional) - Filter by prize
- `participantId` (optional) - Filter by participant

**Response:**
```json
{
  "data": [
    {
      "id": "winner_ghi789",
      "roomId": "room_xyz789",
      "participantId": "part_123abc",
      "prizeId": "prize_def456",
      "metadata": { /* ... */ },
      "createdAt": "2025-12-31T23:00:01Z",
      "participant": {
        "id": "part_123abc",
        "user": {
          "id": "usr_abc123",
          "name": "John Doe",
          "avatar": "https://..."
        }
      },
      "prize": {
        "id": "prize_def456",
        "name": "Grand Prize - iPhone 15",
        "imageUrl": "https://..."
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 10
  }
}
```

### Get Winner
```http
GET /api/rooms/:roomId/winners/:winnerId
Authorization: Bearer {token}
```

**Response:** Winner object with participant and prize details

### Delete Winner
```http
DELETE /api/rooms/:roomId/winners/:winnerId
Authorization: Bearer {token}
```

**Permissions:** Organizer only

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Applications

### Register Application (Admin Only)
```http
POST /api/apps
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "manifest": { /* see authentication.md */ }
}
```

**Response:**
```json
{
  "data": {
    "appId": "app_lottery_v1",
    "appSecret": "sk_live_abc123def456...",
    "manifest": { /* ... */ },
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### List Applications
```http
GET /api/apps?page=1&limit=20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [
    {
      "appId": "app_lottery_v1",
      "name": "Holiday Lottery",
      "version": "1.0.0",
      "description": "Application for conducting lotteries",
      "baseUrl": "https://lottery.example.com",
      "capabilities": ["winnerSelection"],
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

### Get Application
```http
GET /api/apps/:appId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "appId": "app_lottery_v1",
    "manifest": {
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
      "settings": { /* JSON Schema */ }
    },
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Update Application (Admin Only)
```http
PATCH /api/apps/:appId
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "manifest": { /* updated manifest */ }
}
```

**Response:** Updated app object

### Regenerate App Secret (Admin Only)
```http
POST /api/apps/:appId/regenerate-secret
Authorization: Bearer {adminToken}
```

**Response:**
```json
{
  "data": {
    "appId": "app_lottery_v1",
    "appSecret": "sk_live_new_secret_123...",
    "regeneratedAt": "2025-01-15T12:00:00Z"
  }
}
```

### Delete Application (Admin Only)
```http
DELETE /api/apps/:appId
Authorization: Bearer {adminToken}
```

**Validation:** Cannot delete app with active rooms

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

---

## Function Delegation

Applications can override platform functions by implementing webhook endpoints declared in their manifest.

### Delegate Winner Selection
When room uses app with `winnerSelection` capability:

**Platform calls app webhook:**
```http
POST {appBaseUrl}/api/platform/winner-selection
Content-Type: application/json
X-Platform-Signature: {hmac_signature}

{
  "roomId": "room_xyz789",
  "participants": [
    {
      "id": "part_123abc",
      "userId": "usr_abc123",
      "metadata": { /* ... */ }
    }
  ],
  "prizes": [
    {
      "id": "prize_def456",
      "quantityRemaining": 1
    }
  ],
  "requestId": "req_unique_123"
}
```

**App responds with winners:**
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

**Platform validates and creates winner records**

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, state conflict |
| 422 | Unprocessable Entity | Validation failed (detailed errors) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary unavailability |

---

## Rate Limiting

All endpoints are rate-limited based on authentication:

- **Authenticated users:** 100 requests/minute
- **Applications:** 1000 requests/minute
- **Unauthenticated:** 20 requests/minute

**Rate limit headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704448800
```

**Rate limit exceeded response:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "resetAt": "2025-01-15T10:05:00Z"
    }
  }
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` (default: 1) - Page number (1-indexed)
- `limit` (default: 20, max: 100) - Items per page

**Response Meta:**
```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Filtering & Sorting

### Filtering
Query parameters match field names:
```http
GET /api/rooms?status=active&isPublic=true&appId=app_lottery_v1
```

### Sorting
Use `sort` parameter:
```http
GET /api/rooms?sort=-createdAt,name
```

- Prefix with `-` for descending
- Comma-separated for multiple fields

---

## Field Selection

Reduce response size by selecting specific fields:

```http
GET /api/rooms/:roomId?fields=id,name,status,participantCount
```

**Response:**
```json
{
  "data": {
    "id": "room_xyz789",
    "name": "New Year Lottery 2025",
    "status": "active",
    "participantCount": 45
  }
}
```

---

## Validation Errors

**422 Unprocessable Entity:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": ["Name is required"],
        "appSettings.ticketCount": ["Must be at least 1"]
      }
    }
  }
}
```
