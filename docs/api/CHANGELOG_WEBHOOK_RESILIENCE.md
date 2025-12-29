# Webhook Resilience - API Changes Log

## Date: 2025-12-28

## Change Type: Enhancement (Non-Breaking)

---

## Overview

Added comprehensive webhook resilience patterns to address audit feedback about synchronous webhook pattern creating user-blocking operations.

**Backward Compatibility:** ✅ All changes are backward compatible. Existing apps continue working with defaults.

---

## What Changed

### 1. Webhook Configuration in Manifest (Enhanced)

#### Before (Still Supported)
```json
{
  "webhooks": {
    "winnerSelection": "/api/platform/winner-selection"
  }
}
```

#### After (New Advanced Format)
```json
{
  "webhooks": {
    "winnerSelection": {
      "path": "/api/platform/winner-selection",
      "timeout": 5000,
      "async": false,
      "retry": {
        "enabled": false,
        "maxAttempts": 1
      }
    }
  }
}
```

**Compatibility:**
- Old format still works (uses default timeout 10000ms)
- New format adds fine-grained control
- Platform auto-detects format

### 2. Webhook Request Headers (New)

Platform now sends additional headers to webhooks:

```http
X-Timeout-Ms: 5000         # NEW - Expected response time
X-Retry-Attempt: 1         # NEW - Current retry attempt (async only)
X-Max-Attempts: 3          # NEW - Maximum retry attempts (async only)
X-Request-ID: req_xyz789   # EXISTING - Request identifier
X-Platform-Signature: ...  # EXISTING - HMAC signature
```

**Impact:** Apps can read `X-Timeout-Ms` to adjust processing, but not required.

### 3. Webhook Response Format (Enhanced)

#### Before (Still Supported)
```json
{
  "winners": [
    { "participantId": "...", "prizeId": "..." }
  ]
}
```

#### After (Recommended)
```json
{
  "success": true,
  "data": {
    "winners": [
      { "participantId": "...", "prizeId": "..." }
    ]
  },
  "processingTime": 1243
}
```

**Compatibility:**
- Platform accepts both formats
- Old format converted internally: `{ success: true, data: <old_response> }`
- New format provides better error handling

### 4. Webhook Error Response (New)

Apps can now return structured errors:

```json
{
  "success": false,
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Failed to select winners",
    "retryable": true
  }
}
```

**Fields:**
- `success`: `false` to indicate error
- `error.code`: Machine-readable error code
- `error.message`: Human-readable message
- `error.retryable`: Whether platform should retry (async only)

### 5. Platform Behavior Changes

#### Timeout Enforcement (New)
- All webhook calls now timeout
- Default: 10000ms (configurable per webhook)
- On timeout: Platform uses fallback strategy

#### Circuit Breaker (New)
- Tracks app reliability automatically
- Opens after 5 consecutive failures
- Recovers after 60 seconds
- Half-open state tests recovery

#### Fallback Strategies (New)

**Winner Selection:**
- Primary: Call app webhook (5s timeout)
- Fallback: Platform random selection
- Notification: Organizer notified of fallback

**Participant Registration:**
- Primary: Call app webhook (3s timeout)
- Fallback: Create as "pending approval"
- Notification: Organizer notified

**Analytics (Async):**
- Queued immediately (user doesn't wait)
- Background worker calls webhook (30s timeout)
- Retry: 3 attempts with exponential backoff
- DLQ: Failed jobs after all retries

### 6. New Capabilities

#### Async Webhooks
Apps can declare webhooks as async:

```json
{
  "webhooks": {
    "analytics": {
      "path": "/api/platform/analytics",
      "timeout": 30000,
      "async": true,
      "retry": {
        "enabled": true,
        "maxAttempts": 3
      }
    }
  }
}
```

**Behavior:**
- User operation returns immediately
- Webhook called in background
- Retries on failure
- No fallback needed (eventual consistency)

### 7. New Monitoring Endpoints

#### GET /api/v1/admin/webhook-metrics/:appId
Get webhook performance metrics:

```json
{
  "data": {
    "appId": "app_lottery_v1",
    "metrics": [
      {
        "capability": "winnerSelection",
        "window": "24h",
        "totalCalls": 142,
        "successCount": 140,
        "successRate": 98.6,
        "avgResponseTime": 1234,
        "p95ResponseTime": 2100,
        "timeoutCount": 2
      }
    ]
  }
}
```

#### GET /api/v1/admin/webhook-health
Get overall webhook health status:

```json
{
  "data": {
    "apps": [
      {
        "appId": "app_lottery_v1",
        "status": "healthy",
        "circuitBreakerState": "closed",
        "successRate24h": 98.6,
        "avgResponseTime": 1234
      }
    ],
    "dlqSize": 12
  }
}
```

#### POST /api/v1/admin/dlq/:jobId/retry
Retry failed webhook from dead letter queue.

---

## Migration Guide

### For Existing Apps

#### No Changes Required
Apps using basic webhook format continue working:
- Default timeout: 10000ms
- Old response format accepted
- Automatic conversion to new format

#### Recommended Updates

**1. Add Timeout Awareness**
```javascript
app.post('/api/platform/winner-selection', async (req, res) => {
  const timeout = parseInt(req.headers['x-timeout-ms']) || 5000;

  // Implement timeout handling
  const winners = await Promise.race([
    selectWinners(req.body),
    timeoutPromise(timeout - 500)
  ]);

  res.json({ success: true, data: { winners } });
});
```

**2. Return New Response Format**
```javascript
// Old (still works)
res.json({ winners: [...] });

// New (recommended)
res.json({
  success: true,
  data: { winners: [...] },
  processingTime: Date.now() - startTime
});
```

**3. Handle Errors Gracefully**
```javascript
res.status(500).json({
  success: false,
  error: {
    code: 'PROCESSING_ERROR',
    message: error.message,
    retryable: false
  }
});
```

**4. Update Manifest (Optional)**
```json
{
  "webhooks": {
    "winnerSelection": {
      "path": "/api/platform/winner-selection",
      "timeout": 5000
    }
  }
}
```

### For Platform Implementation

**Phase 1: Timeout Enforcement**
```javascript
// Before
const response = await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify(payload)
});

// After
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: controller.signal
  });
  clearTimeout(timeout);
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout with fallback
    return await fallbackStrategy(capability, payload);
  }
  throw error;
}
```

**Phase 2: Circuit Breaker**
```javascript
const result = await circuitBreaker.call(
  app.appId,
  capability,
  () => callWebhook(app, capability, payload, timeout),
  () => fallback(capability, payload)
);
```

**Phase 3: Async Pattern**
```javascript
// Non-critical operations
if (webhookConfig.async) {
  await queue.add('webhook-call', {
    appId: app.appId,
    capability,
    payload
  });
  return { queued: true };
}
```

---

## Breaking Changes

**None.** All changes are backward compatible.

---

## New Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `WEBHOOK_TIMEOUT` | 408 | App webhook timed out |
| `WEBHOOK_CIRCUIT_OPEN` | 503 | Circuit breaker open, using fallback |
| `WEBHOOK_FAILED` | 500 | Webhook call failed |
| `DLQ_FULL` | 503 | Dead letter queue limit reached |

---

## Deprecations

**None.** All existing patterns continue to work.

---

## Performance Impact

### Improved
- ✅ Users never wait indefinitely (timeout enforcement)
- ✅ Faster failure detection (circuit breaker)
- ✅ Non-critical operations don't block (async pattern)

### Additional Overhead
- Minimal: Circuit breaker state tracking (~100 bytes per app)
- Minimal: Metrics collection (~200 bytes per request)
- Job queue: Only for async operations

---

## Security Considerations

### Enhanced
- ✅ Timeout prevents resource exhaustion
- ✅ Circuit breaker prevents cascading failures
- ✅ Metrics enable attack detection

### Unchanged
- HMAC signature verification (existing)
- HTTPS requirement (existing)
- Permission checks (existing)

---

## Testing

### New Test Cases Required

**Timeout Handling:**
```javascript
it('should handle webhook timeout gracefully', async () => {
  const res = await request(platform)
    .post('/api/v1/rooms/test/select-winners')
    .set('Authorization', `Bearer ${token}`)
    .send({ prizeIds: ['prize1'] });

  expect(res.status).to.equal(200);
  expect(res.body.data.winners).to.exist;
  expect(res.body.meta.fallbackUsed).to.be.true;
});
```

**Circuit Breaker:**
```javascript
it('should open circuit after failures', async () => {
  // Simulate 5 failures
  for (let i = 0; i < 5; i++) {
    await simulateWebhookFailure(appId, 'winnerSelection');
  }

  const status = await getCircuitBreakerStatus(appId, 'winnerSelection');
  expect(status).to.equal('open');
});
```

**Async Webhook:**
```javascript
it('should queue async webhook', async () => {
  const res = await request(platform)
    .post('/api/v1/rooms/test/track-event')
    .set('Authorization', `Bearer ${token}`)
    .send({ eventType: 'test', data: {} });

  expect(res.status).to.equal(200);
  expect(res.body.data.queued).to.be.true;
});
```

---

## Documentation Updates

### New Documents
1. `webhook-resilience.md` - Complete technical specification
2. `webhook-quick-guide.md` - Developer quick reference
3. `WEBHOOK_RESILIENCE_SUMMARY.md` - Implementation summary
4. `CHANGELOG_WEBHOOK_RESILIENCE.md` - This changelog

### Updated Documents
1. `app-manifest.md` - Enhanced webhook configuration
2. `README.md` - Updated delegation example
3. `rest-endpoints.md` - Updated webhook endpoints (future)

---

## Rollout Plan

### Week 1: Soft Launch
- Deploy timeout enforcement (default 10s)
- Monitor timeout rates
- No breaking changes

### Week 2: Circuit Breaker
- Enable circuit breaker
- Monitor state transitions
- Alert app owners

### Week 3-4: Async Pattern
- Deploy job queue
- Enable async webhooks
- Monitor retry rates

### Week 5: Full Monitoring
- Deploy metrics dashboard
- Enable all alerts
- Performance tuning

### Week 6: Documentation
- ✅ Update API docs (complete)
- Notify app developers
- Migration support

---

## Support

### For App Developers
- Email: dev-support@platform.example.com
- Slack: #webhook-migration
- Office Hours: Wednesdays 2-4pm

### For Platform Team
- Implementation guide: `webhook-resilience.md`
- Code examples: `webhook-quick-guide.md`
- Monitoring: Admin dashboard

---

## Metrics to Watch

Post-deployment monitoring:

1. **Webhook Timeout Rate** - Should be < 5%
2. **Circuit Breaker Activations** - Track per app
3. **Fallback Usage** - Should be minimal
4. **DLQ Size** - Should be < 100
5. **User Wait Time** - Should be < 5s for critical operations

---

## Success Criteria

✅ User wait time reduced to < 5s for all operations
✅ Platform continues functioning when apps fail
✅ Zero data loss (DLQ captures failures)
✅ App developers have clear guidance
✅ Monitoring provides visibility

---

## Questions & Answers

**Q: Do I need to update my app immediately?**
A: No. Existing apps continue working with defaults. Update when convenient to get better timeout handling.

**Q: What happens if I don't handle the new headers?**
A: Nothing. Headers are informational. Your app works the same.

**Q: How do I know if my webhook timed out?**
A: Check webhook metrics dashboard or subscribe to alerts.

**Q: Can I increase my timeout?**
A: Yes, update manifest `webhooks.timeout` value. Max 30s for sync, no limit for async.

**Q: What's in the dead letter queue?**
A: Failed async webhooks after all retries. You can retry them manually via admin API.

---

## Related Changes

- None. This is a standalone enhancement.

---

## Version

- **API Version:** v1 (no version bump required)
- **Feature:** Webhook Resilience
- **Status:** Design Complete, Implementation Pending
- **Date:** 2025-12-28
