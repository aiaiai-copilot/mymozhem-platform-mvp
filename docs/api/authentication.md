# Authentication & Authorization

## Overview

The platform uses a dual authentication model:
- **User Authentication** - OAuth 2.0 (Google) for end users
- **Application Authentication** - API Key + JWT for applications

## User Authentication

### OAuth Flow (Google)

1. User initiates login via application frontend
2. Application redirects to Platform OAuth endpoint
3. User authenticates with Google
4. Platform creates/updates User record
5. Platform issues JWT token
6. Application stores token for API calls

### Endpoints

#### Initiate OAuth Login
```http
GET /api/auth/google
```

**Response:** Redirects to Google OAuth consent screen

#### OAuth Callback
```http
GET /api/auth/google/callback?code={code}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://..."
    }
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
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

## Application Authentication

### Registration Flow

1. Admin registers application via Platform API
2. Platform generates `appId` and `appSecret`
3. Application stores credentials securely
4. Application uses credentials to obtain access tokens

### Endpoints

#### Register Application (Admin Only)
```http
POST /api/apps
Authorization: Bearer {adminToken}
Content-Type: application/json

{
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
    "settings": {
      "type": "object",
      "properties": {
        "ticketCount": {
          "type": "integer",
          "minimum": 1
        }
      }
    }
  }
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

#### Get Application Token
```http
POST /api/apps/token
Content-Type: application/json

{
  "appId": "app_lottery_v1",
  "appSecret": "sk_live_abc123def456..."
}
```

**Response:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

---

## Authorization Model

### Roles

| Role | Scope | Description |
|------|-------|-------------|
| `admin` | Platform | Platform administrator |
| `organizer` | Room | Room creator/owner |
| `moderator` | Room | Organizer's assistant |
| `participant` | Room | Event participant |
| `viewer` | Room | Observer without participation |

### Permissions

#### User Permissions (per room)
- `room:read` - View room details
- `room:write` - Modify room settings (organizer only)
- `room:delete` - Delete room (organizer only)
- `participant:read` - View participants
- `participant:write` - Add/remove participants (organizer/moderator)
- `participant:join` - Join as participant
- `prize:read` - View prizes
- `prize:write` - Add/modify prizes (organizer/moderator)
- `winner:read` - View winners
- `winner:write` - Select winners (organizer/moderator)

#### Application Permissions (manifest-declared)
- `users:read` - Read user profiles
- `rooms:read` - Read room data
- `rooms:write` - Create/modify rooms
- `participants:read` - Read participant list
- `participants:write` - Add/remove participants
- `prizes:read` - Read prize data
- `prizes:write` - Create/modify prizes
- `winners:read` - Read winner data
- `winners:write` - Select winners
- `realtime:subscribe` - Subscribe to WebSocket events
- `realtime:publish` - Publish custom events

### Permission Checks

API endpoints validate:
1. **User authentication** - Valid user token
2. **Application authentication** - Valid app token (for delegated operations)
3. **User role** - User has required role in room
4. **Application permissions** - App manifest includes required permission

### Headers

**User requests:**
```http
Authorization: Bearer {userAccessToken}
```

**Application requests (on behalf of user):**
```http
Authorization: Bearer {userAccessToken}
X-App-Token: {appAccessToken}
X-App-Id: app_lottery_v1
```

**Application requests (system operations):**
```http
Authorization: Bearer {appAccessToken}
X-App-Id: app_lottery_v1
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": {
      "required": "rooms:write",
      "granted": ["rooms:read"]
    }
  }
}
```

### 403 App Permission Denied
```json
{
  "error": {
    "code": "APP_PERMISSION_DENIED",
    "message": "Application lacks required permission",
    "details": {
      "appId": "app_lottery_v1",
      "required": "prizes:write",
      "granted": ["prizes:read", "rooms:read"]
    }
  }
}
```

---

## Security Best Practices

1. **Token Storage**
   - Store `appSecret` in environment variables (never in code)
   - Use secure storage for user tokens (httpOnly cookies or secure storage)

2. **Token Expiration**
   - User access tokens: 1 hour
   - User refresh tokens: 30 days
   - App tokens: 1 hour

3. **HTTPS Only**
   - All API calls must use HTTPS in production

4. **Rate Limiting**
   - User endpoints: 100 requests/minute
   - App endpoints: 1000 requests/minute

5. **CORS**
   - Configure allowed origins in app manifest
   - Validate `Origin` header on requests
