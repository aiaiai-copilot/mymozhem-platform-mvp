---
description: Test WebSocket connections and real-time events. Verify Socket.io functionality.
---

# WebSocket Testing

Test Socket.io real-time event functionality.

## Manual Testing

### Socket.io Client (Browser Console)
```javascript
// Connect to server
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Join a room
socket.emit('room:join', { roomId: '123' });

// Listen for events
socket.on('participant:joined', (data) => {
  console.log('New participant:', data);
});

// Send event
socket.emit('answer:submit', { questionId: '1', answer: 'A' });

// Disconnect
socket.disconnect();
```

### Node.js Test Script
```bash
# Run WebSocket test suite
pnpm test:ws

# Run specific scenario
node scripts/test-ws.js quiz-realtime
```

## Test Scenarios

### Connection
- [ ] **Authentication** — Valid token accepted, invalid rejected
- [ ] **Reconnection** — Client reconnects after disconnect
- [ ] **Multiple tabs** — Same user from different connections

### Room Events
- [ ] **Join room** — Client receives existing state
- [ ] **Leave room** — Client removed from broadcasts
- [ ] **Room updates** — All participants notified

### Real-time Events
- [ ] **Participant joined** — Broadcast to all in room
- [ ] **Winner selected** — Immediate notification
- [ ] **Quiz answer** — Real-time response validation
- [ ] **Timer events** — Synchronized countdown

### Error Handling
- [ ] **Invalid room** — Error message sent
- [ ] **Permission denied** — Proper error response
- [ ] **Malformed events** — Validation errors
- [ ] **Connection errors** — Graceful handling

### Performance
- [ ] **Latency** — Events delivered < 50ms
- [ ] **Concurrent users** — 100+ simultaneous connections
- [ ] **Message rate** — Handle burst of events

## Monitoring

```bash
# Watch WebSocket connections
pnpm run ws:monitor

# Show connected clients
curl http://localhost:3000/api/admin/ws-stats
```
