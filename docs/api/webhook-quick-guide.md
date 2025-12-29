# Webhook Quick Guide for App Developers

## Overview

Platform webhooks come with built-in resilience to protect user experience. This guide shows you how to build reliable webhook endpoints.

**Key Principle:** User experience always takes priority. If your app slows down or fails, the platform continues functioning with fallback behavior.

---

## Quick Reference

### Webhook Types

| Type | When to Use | Max Timeout | Retry | User Waits? |
|------|-------------|-------------|-------|-------------|
| **Sync** | Critical real-time operations (quiz answers, live draws) | 2-5s | No | Yes |
| **Async** | Non-critical background tasks (analytics, notifications) | 30s+ | Yes | No |

### Recommended Timeouts

| Operation | Timeout | Fallback Strategy |
|-----------|---------|-------------------|
| Quiz answer validation | 2s | Reject answer with error |
| Winner selection (live) | 5s | Platform random selection |
| Participant registration | 3s | Create as "pending approval" |
| Notification delivery | 30s (async) | Retry 3x, then DLQ |
| Analytics tracking | 30s (async) | Retry 3x, then DLQ |

---

## Sync Webhooks (Critical Operations)

### Configuration

```json
{
  "webhooks": {
    "winnerSelection": {
      "path": "/api/platform/winner-selection",
      "timeout": 5000,
      "async": false
    }
  }
}
```

### Implementation Pattern

```javascript
app.post('/api/platform/winner-selection', async (req, res) => {
  const timeout = parseInt(req.headers['x-timeout-ms']) || 5000;
  const startTime = Date.now();

  try {
    // Race against timeout (leave 500ms buffer for network)
    const winners = await Promise.race([
      selectWinners(req.body),
      timeoutPromise(timeout - 500)
    ]);

    res.json({
      success: true,
      data: { winners },
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    if (error instanceof TimeoutError) {
      res.status(408).json({
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Processing taking too long',
          retryable: false
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error.message,
          retryable: false
        }
      });
    }
  }
});

// Helper
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), ms);
  });
}

class TimeoutError extends Error {
  constructor() {
    super('Operation timed out');
    this.name = 'TimeoutError';
  }
}
```

---

## Async Webhooks (Non-Critical Operations)

### Configuration

```json
{
  "webhooks": {
    "analytics": {
      "path": "/api/platform/analytics",
      "timeout": 30000,
      "async": true,
      "retry": {
        "enabled": true,
        "maxAttempts": 3,
        "backoff": "exponential"
      }
    }
  }
}
```

### Implementation Pattern

```javascript
app.post('/api/platform/analytics', async (req, res) => {
  const requestId = req.headers['x-request-id'];
  const retryAttempt = parseInt(req.headers['x-retry-attempt']) || 1;

  // Check if already processed (idempotency)
  const existing = await cache.get(`processed:${requestId}`);
  if (existing) {
    return res.json({ success: true, data: existing, cached: true });
  }

  try {
    // Process analytics
    const result = await trackAnalytics(req.body);

    // Cache result for 24 hours (deduplication)
    await cache.set(`processed:${requestId}`, result, 86400);

    res.json({ success: true, data: result });

  } catch (error) {
    // Indicate if retryable
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error.message,
        retryable: true  // Platform will retry
      }
    });
  }
});
```

---

## Security

### Verify Webhook Signature

**Always verify the signature** to prevent unauthorized calls:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(req, appSecret) {
  const signature = req.headers['x-platform-signature'];
  if (!signature) {
    throw new Error('Missing signature');
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
}

// Middleware
app.use('/api/platform/*', (req, res, next) => {
  try {
    verifyWebhookSignature(req, process.env.APP_SECRET);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid webhook signature'
      }
    });
  }
});
```

---

## Error Handling

### Standard Error Response

```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "retryable": true | false,
    "details": { /* optional context */ }
  }
}
```

### Error Codes

| Code | Meaning | Retryable |
|------|---------|-----------|
| `TIMEOUT` | Processing took too long | No |
| `INVALID_PAYLOAD` | Request data invalid | No |
| `PROCESSING_ERROR` | Internal error | Yes (if temporary) |
| `EXTERNAL_SERVICE_ERROR` | Third-party API failed | Yes |
| `RATE_LIMIT` | Too many requests | Yes (after delay) |

### Graceful Degradation

```javascript
app.post('/api/platform/winner-selection', async (req, res) => {
  try {
    // Try advanced algorithm
    const winners = await advancedSelectionAlgorithm(req.body);
    res.json({
      success: true,
      data: { winners, algorithm: 'advanced' }
    });

  } catch (error) {
    try {
      // Fallback to simple algorithm
      console.warn('Advanced algorithm failed, using fallback:', error);
      const winners = await simpleRandomSelection(req.body);
      res.json({
        success: true,
        data: { winners, algorithm: 'simple_fallback' },
        warning: 'Used fallback algorithm due to: ' + error.message
      });

    } catch (fallbackError) {
      // Both failed - return error
      res.status(500).json({
        success: false,
        error: {
          code: 'SELECTION_FAILED',
          message: 'All selection algorithms failed',
          retryable: false
        }
      });
    }
  }
});
```

---

## Monitoring

### Add Metrics

```javascript
const prometheus = require('prom-client');

// Metrics
const webhookDuration = new prometheus.Histogram({
  name: 'webhook_duration_ms',
  help: 'Webhook processing duration in milliseconds',
  labelNames: ['capability', 'status'],
  buckets: [10, 50, 100, 500, 1000, 2000, 5000]
});

const webhookCounter = new prometheus.Counter({
  name: 'webhook_requests_total',
  help: 'Total webhook requests',
  labelNames: ['capability', 'status']
});

// Middleware
app.use('/api/platform/*', async (req, res, next) => {
  const start = Date.now();
  const capability = req.path.split('/').pop();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode < 400 ? 'success' : 'error';

    webhookDuration.observe({ capability, status }, duration);
    webhookCounter.inc({ capability, status });
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Health Check Endpoint

```javascript
app.get('/health', async (req, res) => {
  try {
    // Check dependencies
    const checks = {
      database: await checkDatabase(),
      cache: await checkCache(),
      externalAPI: await checkExternalAPI()
    };

    const allHealthy = Object.values(checks).every(c => c.status === 'ok');

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      capabilities: ['winnerSelection', 'analytics'],
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      checks
    });

  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return { status: 'ok', responseTime: 5 };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
```

---

## Testing

### Test Timeout Handling

```javascript
const { expect } = require('chai');
const request = require('supertest');

describe('Webhook Timeout', () => {
  it('should respond within timeout', async () => {
    const start = Date.now();

    const res = await request(app)
      .post('/api/platform/winner-selection')
      .set('x-timeout-ms', '2000')
      .send({ participants: [...], prizes: [...] });

    const duration = Date.now() - start;

    expect(duration).to.be.lessThan(2000);
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
  });

  it('should handle timeout gracefully', async () => {
    // Simulate slow processing
    const res = await request(app)
      .post('/api/platform/slow-endpoint')
      .set('x-timeout-ms', '100')
      .send({ /* ... */ });

    expect(res.status).to.equal(408);
    expect(res.body.success).to.be.false;
    expect(res.body.error.code).to.equal('TIMEOUT');
  });
});
```

### Test Signature Verification

```javascript
describe('Webhook Security', () => {
  it('should reject invalid signature', async () => {
    const res = await request(app)
      .post('/api/platform/winner-selection')
      .set('x-platform-signature', 'invalid')
      .send({ /* ... */ });

    expect(res.status).to.equal(401);
  });

  it('should accept valid signature', async () => {
    const body = { participants: [], prizes: [] };
    const signature = generateSignature(body, APP_SECRET);

    const res = await request(app)
      .post('/api/platform/winner-selection')
      .set('x-platform-signature', signature)
      .send(body);

    expect(res.status).to.equal(200);
  });
});
```

### Test Idempotency

```javascript
describe('Webhook Idempotency', () => {
  it('should process same request only once', async () => {
    const requestId = 'req_test_123';
    const body = { eventType: 'test', data: {} };

    // First call
    const res1 = await request(app)
      .post('/api/platform/analytics')
      .set('x-request-id', requestId)
      .send(body);

    expect(res1.body.cached).to.be.undefined;

    // Second call (retry)
    const res2 = await request(app)
      .post('/api/platform/analytics')
      .set('x-request-id', requestId)
      .set('x-retry-attempt', '2')
      .send(body);

    expect(res2.body.cached).to.be.true;
    expect(res2.body.data).to.deep.equal(res1.body.data);
  });
});
```

---

## Common Mistakes

### 1. Not Respecting Timeout

```javascript
// BAD - No timeout handling
app.post('/api/platform/winner-selection', async (req, res) => {
  const winners = await verySlowComputation(req.body); // 30 seconds
  res.json({ winners });
});

// GOOD - Timeout handling with buffer
app.post('/api/platform/winner-selection', async (req, res) => {
  const timeout = parseInt(req.headers['x-timeout-ms']) || 5000;
  const winners = await Promise.race([
    selectWinners(req.body),
    timeoutPromise(timeout - 500)
  ]);
  res.json({ success: true, data: { winners } });
});
```

### 2. Not Verifying Signatures

```javascript
// BAD - No signature verification
app.post('/api/platform/winner-selection', async (req, res) => {
  const winners = await selectWinners(req.body);
  res.json({ winners });
});

// GOOD - Always verify
app.post('/api/platform/winner-selection', async (req, res) => {
  verifyWebhookSignature(req, APP_SECRET);
  const winners = await selectWinners(req.body);
  res.json({ success: true, data: { winners } });
});
```

### 3. Not Handling Retries Idempotently

```javascript
// BAD - Processes same request multiple times
app.post('/api/platform/analytics', async (req, res) => {
  await db.insert(req.body); // Duplicate inserts on retry
  res.json({ success: true });
});

// GOOD - Idempotent using request ID
app.post('/api/platform/analytics', async (req, res) => {
  const requestId = req.headers['x-request-id'];
  const existing = await cache.get(`processed:${requestId}`);
  if (existing) return res.json({ success: true, cached: true });

  await db.insert(req.body);
  await cache.set(`processed:${requestId}`, true, 86400);
  res.json({ success: true });
});
```

### 4. Blocking on External APIs

```javascript
// BAD - Webhook waits for slow external API
app.post('/api/platform/winner-selection', async (req, res) => {
  const winners = await selectWinners(req.body);
  await slowExternalAPI.notify(winners); // 10 seconds
  res.json({ winners });
});

// GOOD - Process async, respond fast
app.post('/api/platform/winner-selection', async (req, res) => {
  const winners = await selectWinners(req.body);

  // Queue notification for background processing
  await queue.add('notify-winners', { winners });

  res.json({ success: true, data: { winners } });
});
```

---

## Checklist

Before deploying your webhook endpoint:

- [ ] Responds within configured timeout (test with load)
- [ ] Verifies `X-Platform-Signature` header
- [ ] Returns standard `{ success, data/error }` format
- [ ] Handles retries idempotently (check `X-Request-ID`)
- [ ] Logs errors with context for debugging
- [ ] Implements health check endpoint (`/health`)
- [ ] Exposes metrics endpoint (`/metrics`)
- [ ] Gracefully degrades on dependency failures
- [ ] Tests cover timeout, signature, and retry scenarios
- [ ] Monitors webhook performance in production

---

## Resources

- [Full Webhook Resilience Documentation](./webhook-resilience.md)
- [Application Manifest Specification](./app-manifest.md)
- [REST API Documentation](./rest-endpoints.md)
- [WebSocket Protocol](./websocket-protocol.md)

---

## Support

Questions? Issues?
- GitHub Issues: `your-repo/issues`
- Developer Slack: `#app-developers`
- Email: `dev-support@platform.example.com`
