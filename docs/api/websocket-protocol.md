# WebSocket Protocol

## Overview

Real-time communication using Socket.io with room-based event broadcasting.

**Library:** Socket.io v4.x

**Transport:** WebSocket with fallback to HTTP long-polling

**URL:** `wss://api.platform.example.com`

---

## Connection

### Client Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.platform.example.com', {
  auth: {
    token: 'user_access_token_here'
  },
  transports: ['websocket', 'polling']
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Handle errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Authentication

Client must provide JWT token in `auth` object during connection.

**Server validates:**
1. Token signature and expiration
2. User existence
3. Token not revoked

**On authentication failure:**
```javascript
socket.on('connect_error', (error) => {
  // error.message: "Authentication failed: Invalid token"
});
```

---

## Namespaces

### Default Namespace (`/`)
Global platform events and user-specific notifications.

### Room Namespace (`/rooms/:roomId`)
Room-specific events. Clients join after subscribing to room.

**Example:**
```javascript
const roomSocket = io(`wss://api.platform.example.com/rooms/room_xyz789`, {
  auth: {
    token: 'user_access_token_here'
  }
});
```

---

## Event Naming Convention

Format: `entity:action`

Examples:
- `participant:joined`
- `participant:left`
- `prize:created`
- `winner:selected`
- `room:updated`
- `room:status_changed`

---

## Room Events

### Subscribe to Room

**Client → Server:**
```javascript
socket.emit('room:subscribe', { roomId: 'room_xyz789' }, (response) => {
  if (response.success) {
    console.log('Subscribed to room:', response.room);
  } else {
    console.error('Subscription failed:', response.error);
  }
});
```

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room_xyz789",
    "name": "New Year Lottery 2025",
    "status": "active"
  }
}
```

**Server broadcasts to client:**
```javascript
socket.on('room:subscribed', (data) => {
  console.log('Subscribed:', data.roomId);
});
```

### Unsubscribe from Room

**Client → Server:**
```javascript
socket.emit('room:unsubscribe', { roomId: 'room_xyz789' });
```

**Server broadcasts:**
```javascript
socket.on('room:unsubscribed', (data) => {
  console.log('Unsubscribed:', data.roomId);
});
```

### Room Updated

**Server → Clients (broadcast):**
```javascript
socket.on('room:updated', (data) => {
  console.log('Room updated:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "changes": {
    "name": "Updated Room Name",
    "status": "active"
  },
  "room": {
    "id": "room_xyz789",
    "name": "Updated Room Name",
    "status": "active"
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Room Status Changed

**Server → Clients:**
```javascript
socket.on('room:status_changed', (data) => {
  console.log('Room status changed:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "oldStatus": "draft",
  "newStatus": "active",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Room Deleted

**Server → Clients:**
```javascript
socket.on('room:deleted', (data) => {
  console.log('Room deleted:', data.roomId);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

## Participant Events

### Participant Joined

**Server → Clients:**
```javascript
socket.on('participant:joined', (data) => {
  console.log('Participant joined:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "participant": {
    "id": "part_123abc",
    "userId": "usr_abc123",
    "role": "participant",
    "user": {
      "id": "usr_abc123",
      "name": "John Doe",
      "avatar": "https://..."
    },
    "joinedAt": "2025-01-15T10:00:00Z"
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Participant Left

**Server → Clients:**
```javascript
socket.on('participant:left', (data) => {
  console.log('Participant left:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "participantId": "part_123abc",
  "userId": "usr_abc123",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Participant Updated

**Server → Clients:**
```javascript
socket.on('participant:updated', (data) => {
  console.log('Participant updated:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "participantId": "part_123abc",
  "changes": {
    "role": "moderator"
  },
  "participant": {
    "id": "part_123abc",
    "userId": "usr_abc123",
    "role": "moderator",
    "user": {
      "id": "usr_abc123",
      "name": "John Doe"
    }
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

## Prize Events

### Prize Created

**Server → Clients:**
```javascript
socket.on('prize:created', (data) => {
  console.log('Prize created:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "prize": {
    "id": "prize_def456",
    "name": "Grand Prize - iPhone 15",
    "description": "Latest iPhone model",
    "imageUrl": "https://...",
    "quantity": 1,
    "quantityRemaining": 1,
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Prize Updated

**Server → Clients:**
```javascript
socket.on('prize:updated', (data) => {
  console.log('Prize updated:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "prizeId": "prize_def456",
  "changes": {
    "quantity": 2
  },
  "prize": { /* updated prize object */ },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Prize Deleted

**Server → Clients:**
```javascript
socket.on('prize:deleted', (data) => {
  console.log('Prize deleted:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "prizeId": "prize_def456",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

## Winner Events

### Winner Selected

**Server → Clients:**
```javascript
socket.on('winner:selected', (data) => {
  console.log('Winner selected:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "winner": {
    "id": "winner_ghi789",
    "participantId": "part_123abc",
    "prizeId": "prize_def456",
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
    },
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Winner Removed

**Server → Clients:**
```javascript
socket.on('winner:removed', (data) => {
  console.log('Winner removed:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "winnerId": "winner_ghi789",
  "participantId": "part_123abc",
  "prizeId": "prize_def456",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

## Application Events

Applications can publish custom events to room subscribers.

### Custom Event (App → Platform → Clients)

**Application emits via REST API:**
```http
POST /api/rooms/:roomId/events
Authorization: Bearer {appToken}
X-App-Id: app_lottery_v1
Content-Type: application/json

{
  "event": "lottery:draw_started",
  "data": {
    "drawNumber": 1,
    "totalPrizes": 10,
    "estimatedDuration": 300
  }
}
```

**Server broadcasts to clients:**
```javascript
socket.on('lottery:draw_started', (data) => {
  console.log('Draw started:', data);
});
```

**Payload (as sent by app):**
```json
{
  "drawNumber": 1,
  "totalPrizes": 10,
  "estimatedDuration": 300
}
```

**Requirements:**
- App must have `realtime:publish` permission
- Event name must start with `{appId}:` (e.g., `lottery:*`)
- Maximum 10 events per second per room

### Quiz Example (Real-time Synchronous)

**Question Published:**
```javascript
socket.on('quiz:question_published', (data) => {
  console.log('New question:', data);
});
```

**Payload:**
```json
{
  "questionId": "q_123",
  "questionNumber": 1,
  "totalQuestions": 10,
  "question": "What is the capital of France?",
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "timeLimit": 10,
  "startTime": "2025-01-15T10:00:00Z"
}
```

**Answer Submitted (Client → Server):**
```javascript
socket.emit('quiz:answer_submit', {
  questionId: 'q_123',
  answer: 'Paris',
  timestamp: Date.now()
}, (response) => {
  console.log('Answer result:', response);
});
```

**Response (Server → Client):**
```json
{
  "success": true,
  "correct": true,
  "responseTime": 3.2,
  "rank": 1
}
```

**Answer Result Broadcasted:**
```javascript
socket.on('quiz:answer_result', (data) => {
  console.log('Answer result:', data);
});
```

**Payload:**
```json
{
  "questionId": "q_123",
  "participantId": "part_123abc",
  "user": {
    "id": "usr_abc123",
    "name": "John Doe"
  },
  "correct": true,
  "responseTime": 3.2,
  "rank": 1,
  "timestamp": "2025-01-15T10:00:03Z"
}
```

---

## User Notifications

Global namespace (`/`) for user-specific notifications.

### Notification Received

**Server → Client:**
```javascript
socket.on('notification:received', (data) => {
  console.log('Notification:', data);
});
```

**Payload:**
```json
{
  "id": "notif_abc123",
  "type": "winner_selected",
  "title": "Congratulations!",
  "message": "You won Grand Prize - iPhone 15",
  "data": {
    "roomId": "room_xyz789",
    "winnerId": "winner_ghi789",
    "prizeId": "prize_def456"
  },
  "read": false,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### Notification Read

**Client → Server:**
```javascript
socket.emit('notification:mark_read', {
  notificationId: 'notif_abc123'
}, (response) => {
  console.log('Marked as read:', response.success);
});
```

---

## Presence

Track online participants in room.

### User Joined Room (Online)

**Server → Clients:**
```javascript
socket.on('presence:user_online', (data) => {
  console.log('User online:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "userId": "usr_abc123",
  "user": {
    "id": "usr_abc123",
    "name": "John Doe",
    "avatar": "https://..."
  },
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### User Left Room (Offline)

**Server → Clients:**
```javascript
socket.on('presence:user_offline', (data) => {
  console.log('User offline:', data);
});
```

**Payload:**
```json
{
  "roomId": "room_xyz789",
  "userId": "usr_abc123",
  "timestamp": "2025-01-15T10:00:10Z"
}
```

### Request Presence List

**Client → Server:**
```javascript
socket.emit('presence:get_online', {
  roomId: 'room_xyz789'
}, (response) => {
  console.log('Online users:', response.users);
});
```

**Response:**
```json
{
  "roomId": "room_xyz789",
  "users": [
    {
      "id": "usr_abc123",
      "name": "John Doe",
      "avatar": "https://...",
      "connectedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## Error Handling

### Server Error Event

**Server → Client:**
```javascript
socket.on('error', (error) => {
  console.error('Server error:', error);
});
```

**Payload:**
```json
{
  "code": "PERMISSION_DENIED",
  "message": "You don't have permission to perform this action",
  "details": {
    "action": "prize:create",
    "roomId": "room_xyz789"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_FAILED` | Invalid or expired token |
| `PERMISSION_DENIED` | Insufficient permissions |
| `ROOM_NOT_FOUND` | Room doesn't exist |
| `INVALID_PAYLOAD` | Invalid event payload |
| `RATE_LIMIT_EXCEEDED` | Too many events |
| `APP_PERMISSION_DENIED` | App lacks required permission |

---

## Acknowledgments

All client-initiated events support acknowledgment callbacks:

```javascript
socket.emit('room:subscribe', { roomId: 'room_xyz789' }, (response) => {
  if (response.success) {
    console.log('Success:', response.data);
  } else {
    console.error('Error:', response.error);
  }
});
```

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

---

## Connection Management

### Reconnection

Socket.io handles reconnection automatically:

```javascript
const socket = io('wss://api.platform.example.com', {
  auth: { token: 'user_token' },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-subscribe to rooms
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection error:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Reconnection failed');
  // Redirect to login or show error
});
```

### Graceful Disconnect

```javascript
socket.disconnect();
```

---

## Security

### Message Verification

All events include `timestamp` field. Clients should:
1. Validate timestamp is recent (within 5 minutes)
2. Ignore duplicate events (track processed event IDs)

### Rate Limiting

Per connection limits:
- **Client events:** 100/minute (subscribes, emits)
- **App events:** 600/minute (custom events)

Exceeded limits result in `RATE_LIMIT_EXCEEDED` error.

### Room Authorization

Server validates client has permission to access room before:
- Subscribing to room events
- Publishing events
- Receiving room updates

### Token Refresh

WebSocket connection uses long-lived tokens. If token expires:

```javascript
socket.on('token:expired', () => {
  // Refresh token via REST API
  fetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  })
  .then(res => res.json())
  .then(data => {
    // Reconnect with new token
    socket.auth.token = data.accessToken;
    socket.disconnect().connect();
  });
});
```

---

## Best Practices

### Client Implementation

1. **Handle reconnection** - Re-subscribe to rooms after reconnect
2. **Validate events** - Check event structure and types
3. **Debounce UI updates** - Batch rapid events to avoid UI thrashing
4. **Track event IDs** - Prevent duplicate processing
5. **Graceful degradation** - Handle disconnect gracefully
6. **Use acknowledgments** - For critical operations

### Application Implementation

1. **Namespace events** - Prefix with appId (e.g., `lottery:draw_started`)
2. **Validate permissions** - Check manifest permissions before publishing
3. **Rate limit** - Respect platform limits
4. **Idempotency** - Events should be idempotent
5. **Document events** - Provide clear event documentation for clients

### Server Implementation

1. **Validate all inputs** - Check payload structure
2. **Authorize all actions** - Verify permissions
3. **Broadcast efficiently** - Use Socket.io rooms
4. **Log events** - For debugging and auditing
5. **Monitor connections** - Track connection health

---

## Examples

### Complete Room Subscription Flow

```javascript
import { io } from 'socket.io-client';

// Connect
const socket = io('wss://api.platform.example.com', {
  auth: { token: userToken }
});

// Wait for connection
socket.on('connect', () => {
  // Subscribe to room
  socket.emit('room:subscribe', { roomId: 'room_xyz789' }, (response) => {
    if (response.success) {
      console.log('Subscribed to room');

      // Listen for events
      socket.on('participant:joined', handleParticipantJoined);
      socket.on('winner:selected', handleWinnerSelected);
      socket.on('lottery:draw_started', handleDrawStarted);
    }
  });
});

// Handle events
function handleParticipantJoined(data) {
  console.log(`${data.participant.user.name} joined`);
  updateParticipantList(data.participant);
}

function handleWinnerSelected(data) {
  console.log(`${data.winner.participant.user.name} won ${data.winner.prize.name}`);
  showWinnerAnimation(data.winner);
}

function handleDrawStarted(data) {
  console.log(`Draw started: ${data.totalPrizes} prizes`);
  startDrawCountdown(data.estimatedDuration);
}

// Cleanup on unmount
function cleanup() {
  socket.emit('room:unsubscribe', { roomId: 'room_xyz789' });
  socket.off('participant:joined', handleParticipantJoined);
  socket.off('winner:selected', handleWinnerSelected);
  socket.off('lottery:draw_started', handleDrawStarted);
  socket.disconnect();
}
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useRoomEvents(roomId, token) {
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const newSocket = io('wss://api.platform.example.com', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('room:subscribe', { roomId }, (response) => {
        if (!response.success) {
          console.error('Subscription failed:', response.error);
        }
      });
    });

    // Listen for all room events
    const eventHandlers = {
      'participant:joined': (data) => setEvents(e => [...e, { type: 'joined', data }]),
      'winner:selected': (data) => setEvents(e => [...e, { type: 'winner', data }]),
      'room:updated': (data) => setEvents(e => [...e, { type: 'updated', data }])
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      newSocket.on(event, handler);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('room:unsubscribe', { roomId });
      Object.keys(eventHandlers).forEach(event => {
        newSocket.off(event);
      });
      newSocket.disconnect();
    };
  }, [roomId, token]);

  return { socket, events };
}
```
