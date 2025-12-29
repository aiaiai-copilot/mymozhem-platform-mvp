# Webhook Resilience & Timeout Strategies

## Overview

This document addresses critical resilience patterns for webhook-based function delegation, preventing user-facing delays when applications slow down or fail.

**Problem:** Current synchronous webhook pattern (Platform → App webhook → Response → Platform persists) creates user-blocking operations. If app slows down or crashes, users wait indefinitely.

**Solution:** Tiered approach with timeouts, circuit breakers, and async patterns based on operation criticality.

---

## Operation Categorization

### Critical Real-Time Operations

**Characteristics:**
- User is actively waiting
- Time-sensitive (milliseconds matter)
- Synchronous user interaction required
- Failed operation blocks user flow

**Examples:**
- Quiz answer validation (`quiz:answer_submit`)
- Real-time winner selection during live draw
- Instant participant registration with immediate feedback
- Live leaderboard updates

**Strategy:** Synchronous with aggressive timeout + fallback

---

### Non-Critical Operations

**Characteristics:**
- Can be processed asynchronously
- User doesn't need immediate response
- Can retry on failure
- Eventually consistent is acceptable

**Examples:**
- Analytics and logging
- Notification delivery
- Post-event data sync
- Batch winner selection for lottery
- Report generation

**Strategy:** Async with callback + retry + dead letter queue

---

## Synchronous Webhook Pattern (Critical Operations)

### Timeout Configuration

**Recommended Timeouts:**

| Operation Type | Timeout | Rationale |
|----------------|---------|-----------|
| Quiz answer validation | 2s | User expects instant feedback |
| Live draw winner selection | 5s | Acceptable delay during ceremony |
| Participant registration | 3s | Standard web form submission |
| Real-time notification | 2s | Push notification delivery |

**Implementation:**

```javascript
// Platform webhook call with timeout
async function callWebhookWithTimeout(
  url: string,
  payload: object,
  timeoutMs: number,
  capability: string
): Promise<WebhookResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-Signature': generateHMAC(payload),
        'X-Request-ID': generateRequestId(),
        'X-Timeout-Ms': timeoutMs.toString()
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new WebhookError(`HTTP ${response.status}`, response.status);
    }

    return await response.json();

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new WebhookTimeoutError(
        `Webhook timeout after ${timeoutMs}ms`,
        capability,
        timeoutMs
      );
    }

    throw error;
  }
}
```

---

### Fallback Strategies

When webhook times out or fails, platform must gracefully degrade:

#### 1. Default Platform Behavior

**Use Case:** App provides enhancement, but platform has basic implementation

**Example:** Winner selection
- App webhook fails → Platform uses simple random selection
- User sees result immediately
- Log warning for organizer

```javascript
async function selectWinners(roomId: string, prizeIds: string[]) {
  const room = await getRoom(roomId);
  const app = await getApp(room.appId);

  if (app.capabilities.includes('winnerSelection')) {
    try {
      // Try app webhook with timeout
      return await callAppWebhook(app, 'winnerSelection', {
        roomId,
        prizeIds,
        participants: await getParticipants(roomId),
        prizes: await getPrizes(roomId, prizeIds)
      }, 5000); // 5 second timeout

    } catch (error) {
      if (error instanceof WebhookTimeoutError) {
        // Log failure
        await logWebhookFailure(app.appId, 'winnerSelection', error);

        // Notify organizer
        await notifyOrganizer(roomId, {
          type: 'APP_FALLBACK',
          message: `${app.name} timed out. Using platform default selection.`,
          capability: 'winnerSelection'
        });

        // Fallback to platform implementation
        return await platformDefaultWinnerSelection(roomId, prizeIds);
      }
      throw error;
    }
  }

  // No delegation, use platform
  return await platformDefaultWinnerSelection(roomId, prizeIds);
}
```

#### 2. Cached Result

**Use Case:** Previous successful result can be reused temporarily

**Example:** Quiz question validation rules
- App provides validation rules
- Platform caches rules for 5 minutes
- If app fails, use cached rules

```javascript
const questionValidationCache = new Map<string, ValidationRules>();

async function validateQuizAnswer(
  roomId: string,
  questionId: string,
  answer: string
): Promise<ValidationResult> {
  const cacheKey = `${roomId}:${questionId}`;
  let rules = questionValidationCache.get(cacheKey);

  if (!rules) {
    try {
      rules = await callAppWebhook(app, 'validateAnswer', {
        questionId,
        answer
      }, 2000); // 2 second timeout

      // Cache for 5 minutes
      questionValidationCache.set(cacheKey, rules);
      setTimeout(() => questionValidationCache.delete(cacheKey), 5 * 60 * 1000);

    } catch (error) {
      // No cached rules available - reject with error
      throw new ValidationError('Unable to validate answer: app unavailable');
    }
  }

  return applyValidationRules(rules, answer);
}
```

#### 3. Queue for Later Processing

**Use Case:** Operation can be deferred without blocking user

**Example:** Winner notification
- User selected as winner immediately
- Notification queued for async delivery
- Custom notification webhook called in background

```javascript
async function selectWinner(participantId: string, prizeId: string) {
  // Create winner record immediately
  const winner = await createWinner(participantId, prizeId);

  // Broadcast real-time event
  await broadcastEvent('winner:selected', { winner });

  // Queue notification for async delivery
  await queueJob('notification:winner', {
    winnerId: winner.id,
    participantId,
    prizeId
  }, {
    attempts: 3,
    backoff: 'exponential',
    timeout: 10000 // More generous timeout for queued job
  });

  return winner;
}
```

#### 4. User Notification

**Use Case:** Operation requires manual intervention

**Example:** Custom participant registration with external validation
- App webhook fails
- Participant added with "pending" status
- Organizer notified to manually approve

```javascript
async function registerParticipant(roomId: string, userId: string) {
  const app = await getAppForRoom(roomId);

  if (app.capabilities.includes('participantRegistration')) {
    try {
      return await callAppWebhook(app, 'participantRegistration', {
        roomId,
        userId,
        user: await getUser(userId)
      }, 3000);

    } catch (error) {
      // Create participant with pending status
      const participant = await createParticipant(roomId, userId, {
        status: 'pending_approval',
        reason: 'app_validation_failed'
      });

      // Notify organizer
      await notifyOrganizer(roomId, {
        type: 'MANUAL_APPROVAL_REQUIRED',
        message: `Registration for user ${userId} needs manual approval (app unavailable)`,
        participant
      });

      return participant;
    }
  }

  return await createParticipant(roomId, userId);
}
```

---

### Circuit Breaker Pattern

Prevent cascading failures by tracking app reliability.

**States:**
- **Closed** - Normal operation, calls go through
- **Open** - Too many failures, calls fail immediately with fallback
- **Half-Open** - Testing if app recovered

**Implementation:**

```typescript
interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

class WebhookCircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();

  // Configuration
  private readonly FAILURE_THRESHOLD = 5; // Open after 5 failures
  private readonly RECOVERY_TIMEOUT = 60000; // Try recovery after 1 minute
  private readonly SUCCESS_THRESHOLD = 3; // Close after 3 successes

  async call<T>(
    appId: string,
    capability: string,
    fn: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(appId, capability);

    // Circuit is open - use fallback immediately
    if (state.status === 'open') {
      if (Date.now() - state.lastFailureTime > this.RECOVERY_TIMEOUT) {
        // Try half-open
        state.status = 'half-open';
        state.successCount = 0;
      } else {
        await this.logCircuitOpen(appId, capability);
        return await fallback();
      }
    }

    try {
      const result = await fn();
      await this.onSuccess(appId, capability);
      return result;

    } catch (error) {
      await this.onFailure(appId, capability, error);

      // Use fallback
      return await fallback();
    }
  }

  private async onSuccess(appId: string, capability: string) {
    const state = this.getState(appId, capability);

    if (state.status === 'half-open') {
      state.successCount++;
      if (state.successCount >= this.SUCCESS_THRESHOLD) {
        // Circuit recovered
        state.status = 'closed';
        state.failureCount = 0;
        await this.logCircuitClosed(appId, capability);
      }
    } else {
      // Reset failure count on success
      state.failureCount = 0;
    }
  }

  private async onFailure(appId: string, capability: string, error: Error) {
    const state = this.getState(appId, capability);
    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.status === 'half-open') {
      // Failed during recovery - reopen circuit
      state.status = 'open';
      await this.logCircuitReopened(appId, capability);
    } else if (state.failureCount >= this.FAILURE_THRESHOLD) {
      // Too many failures - open circuit
      state.status = 'open';
      await this.logCircuitOpened(appId, capability);
      await this.notifyAppOwner(appId, capability, state);
    }
  }

  private getState(appId: string, capability: string): CircuitBreakerState {
    const key = `${appId}:${capability}`;
    if (!this.states.has(key)) {
      this.states.set(key, {
        status: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
    }
    return this.states.get(key)!;
  }
}

// Usage
const circuitBreaker = new WebhookCircuitBreaker();

async function callAppWithProtection(app: App, capability: string, payload: object) {
  return await circuitBreaker.call(
    app.appId,
    capability,
    // Primary call
    () => callWebhookWithTimeout(app.webhooks[capability], payload, 5000, capability),
    // Fallback
    () => platformDefaultImplementation(capability, payload)
  );
}
```

---

## Asynchronous Webhook Pattern (Non-Critical Operations)

### Webhook + Callback Flow

For operations that don't require immediate response:

**Flow:**
1. Platform queues job
2. Background worker calls app webhook
3. App processes (can take longer)
4. App calls platform callback endpoint with result
5. Platform persists result

**Example: Analytics Event**

```javascript
// 1. Platform queues analytics event
async function trackEvent(roomId: string, eventType: string, data: object) {
  await queueJob('analytics:track', {
    roomId,
    eventType,
    data,
    timestamp: Date.now()
  });

  // Return immediately - user doesn't wait
  return { queued: true };
}

// 2. Background worker processes queue
async function processAnalyticsJob(job: Job) {
  const { roomId, eventType, data } = job.data;
  const app = await getAppForRoom(roomId);

  if (app.capabilities.includes('analytics')) {
    try {
      // Generous timeout for async operation
      await callWebhookWithTimeout(
        app.webhooks.analytics,
        {
          roomId,
          eventType,
          data,
          callbackUrl: `${PLATFORM_URL}/api/v1/callbacks/analytics/${job.id}`
        },
        30000, // 30 second timeout
        'analytics'
      );

      // Mark job as sent
      await job.updateProgress(100);

    } catch (error) {
      // Retry with exponential backoff
      if (job.attemptsMade < 3) {
        throw error; // Will retry
      } else {
        // Move to dead letter queue
        await moveToDeadLetterQueue(job, error);
      }
    }
  }
}

// 3. App calls back when done (optional confirmation)
app.post('/api/v1/callbacks/analytics/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { success, result } = req.body;

  await markJobComplete(jobId, result);
  res.json({ received: true });
});
```

### Retry Logic

**Exponential Backoff:**

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

async function callWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxAttempts) {
        // Calculate next delay with jitter
        const jitter = Math.random() * 0.3 * delay; // ±30% jitter
        const nextDelay = Math.min(delay + jitter, config.maxDelay);

        await sleep(nextDelay);
        delay *= config.backoffMultiplier;
      }
    }
  }

  throw lastError;
}
```

### Dead Letter Queue

For operations that fail after all retries:

```typescript
interface DeadLetterJob {
  id: string;
  originalJob: Job;
  error: Error;
  attempts: number;
  failedAt: Date;
  capability: string;
  appId: string;
}

async function moveToDeadLetterQueue(job: Job, error: Error) {
  const dlqJob: DeadLetterJob = {
    id: generateId(),
    originalJob: job,
    error,
    attempts: job.attemptsMade,
    failedAt: new Date(),
    capability: job.data.capability,
    appId: job.data.appId
  };

  // Store in database
  await db.deadLetterQueue.create(dlqJob);

  // Alert platform admins
  await alertAdmins({
    type: 'WEBHOOK_DLQ',
    message: `Job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`,
    appId: job.data.appId,
    capability: job.data.capability,
    error: error.message
  });

  // Notify app owner
  await notifyAppOwner(job.data.appId, {
    type: 'WEBHOOK_FAILURE',
    message: `Webhook failed after ${job.attemptsMade} attempts`,
    capability: job.data.capability,
    jobId: job.id,
    error: error.message
  });
}

// Admin endpoint to retry DLQ jobs
app.post('/api/v1/admin/dlq/:jobId/retry', async (req, res) => {
  const { jobId } = req.params;
  const dlqJob = await db.deadLetterQueue.findById(jobId);

  if (dlqJob) {
    // Re-queue with fresh attempts
    await queueJob(dlqJob.originalJob.type, dlqJob.originalJob.data);
    await db.deadLetterQueue.delete(jobId);

    res.json({ requeued: true });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});
```

---

## Webhook Health Monitoring

### App Reliability Metrics

Track webhook performance per app and capability:

```typescript
interface WebhookMetrics {
  appId: string;
  capability: string;
  window: '1h' | '24h' | '7d';
  totalCalls: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  avgResponseTime: number; // milliseconds
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number; // percentage
  lastSuccess: Date | null;
  lastFailure: Date | null;
}

class WebhookMonitor {
  async recordCall(
    appId: string,
    capability: string,
    startTime: number,
    success: boolean,
    timeout: boolean
  ) {
    const duration = Date.now() - startTime;

    await db.webhookMetrics.create({
      appId,
      capability,
      duration,
      success,
      timeout,
      timestamp: new Date()
    });

    // Update aggregated metrics
    await this.updateAggregates(appId, capability);

    // Check SLA violations
    await this.checkSLA(appId, capability);
  }

  async getMetrics(appId: string, window: string): Promise<WebhookMetrics[]> {
    const windowStart = this.getWindowStart(window);

    const metrics = await db.webhookMetrics.aggregate([
      {
        $match: {
          appId,
          timestamp: { $gte: windowStart }
        }
      },
      {
        $group: {
          _id: '$capability',
          totalCalls: { $sum: 1 },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          failureCount: { $sum: { $cond: ['$success', 0, 1] } },
          timeoutCount: { $sum: { $cond: ['$timeout', 1, 0] } },
          avgResponseTime: { $avg: '$duration' },
          durations: { $push: '$duration' },
          lastSuccess: { $max: { $cond: ['$success', '$timestamp', null] } },
          lastFailure: { $max: { $cond: ['$success', null, '$timestamp'] } }
        }
      }
    ]);

    return metrics.map(m => ({
      appId,
      capability: m._id,
      window,
      totalCalls: m.totalCalls,
      successCount: m.successCount,
      failureCount: m.failureCount,
      timeoutCount: m.timeoutCount,
      avgResponseTime: m.avgResponseTime,
      p95ResponseTime: this.percentile(m.durations, 95),
      p99ResponseTime: this.percentile(m.durations, 99),
      successRate: (m.successCount / m.totalCalls) * 100,
      lastSuccess: m.lastSuccess,
      lastFailure: m.lastFailure
    }));
  }

  private async checkSLA(appId: string, capability: string) {
    const metrics = await this.getMetrics(appId, '1h');
    const metric = metrics.find(m => m.capability === capability);

    if (!metric) return;

    // Alert if success rate drops below 95%
    if (metric.successRate < 95) {
      await alertAppOwner(appId, {
        type: 'SLA_VIOLATION',
        message: `${capability} success rate: ${metric.successRate.toFixed(1)}% (threshold: 95%)`,
        capability,
        metrics: metric
      });
    }

    // Alert if p95 response time exceeds timeout
    const timeoutThreshold = this.getTimeoutForCapability(capability);
    if (metric.p95ResponseTime > timeoutThreshold * 0.8) {
      await alertAppOwner(appId, {
        type: 'LATENCY_WARNING',
        message: `${capability} p95 latency: ${metric.p95ResponseTime}ms (threshold: ${timeoutThreshold}ms)`,
        capability,
        metrics: metric
      });
    }
  }
}
```

### Status Check Endpoint

Platform regularly pings app health endpoints:

```javascript
// Platform health check (every 5 minutes)
async function checkAppHealth(app: App) {
  try {
    const response = await fetch(`${app.baseUrl}/health`, {
      timeout: 5000
    });

    if (response.ok) {
      const health = await response.json();
      await db.appHealth.update(app.appId, {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: response.headers.get('x-response-time'),
        details: health
      });
    } else {
      await this.markUnhealthy(app.appId, `HTTP ${response.status}`);
    }

  } catch (error) {
    await this.markUnhealthy(app.appId, error.message);
  }
}

// App health endpoint (implement in each app)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    capabilities: ['winnerSelection', 'notifications'],
    uptime: process.uptime(),
    version: '1.0.0'
  });
});
```

---

## API Documentation Updates

### Webhook Specification in Manifest

Apps must declare expected response times:

```json
{
  "webhooks": {
    "winnerSelection": {
      "path": "/api/platform/winner-selection",
      "timeout": 5000,
      "retry": {
        "enabled": false
      }
    },
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

### Webhook Request Headers

Platform sends timeout information:

```http
POST /api/platform/winner-selection
Content-Type: application/json
X-Platform-Signature: sha256=abc123...
X-Request-ID: req_xyz789
X-Timeout-Ms: 5000
X-Retry-Attempt: 1
X-Max-Attempts: 1

{
  "roomId": "room_xyz",
  "participants": [...],
  "prizes": [...]
}
```

### Webhook Response Requirements

Apps must respond within timeout:

```json
{
  "success": true,
  "data": {
    "winners": [...]
  },
  "processingTime": 1243
}
```

### Error Response Format

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

---

## Best Practices for App Developers

### 1. Respond Quickly

```javascript
// BAD - Slow synchronous processing
app.post('/api/platform/winner-selection', async (req, res) => {
  const winners = await heavyComputation(req.body); // 10 seconds
  res.json({ winners });
});

// GOOD - Fast response with async processing for heavy work
app.post('/api/platform/winner-selection', async (req, res) => {
  const timeout = parseInt(req.headers['x-timeout-ms']) || 5000;

  try {
    const winners = await Promise.race([
      selectWinners(req.body),
      timeoutPromise(timeout - 500) // Leave 500ms buffer
    ]);

    res.json({ success: true, data: { winners } });

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
      throw error;
    }
  }
});
```

### 2. Monitor Your Webhook Performance

```javascript
const prometheus = require('prom-client');

const webhookDuration = new prometheus.Histogram({
  name: 'webhook_duration_ms',
  help: 'Webhook processing duration',
  labelNames: ['capability', 'status']
});

app.post('/api/platform/:capability', async (req, res) => {
  const start = Date.now();
  const { capability } = req.params;

  try {
    const result = await processWebhook(capability, req.body);
    const duration = Date.now() - start;

    webhookDuration.observe({ capability, status: 'success' }, duration);
    res.json({ success: true, data: result, processingTime: duration });

  } catch (error) {
    const duration = Date.now() - start;
    webhookDuration.observe({ capability, status: 'error' }, duration);
    throw error;
  }
});
```

### 3. Implement Health Checks

```javascript
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    capabilities: ['winnerSelection'],
    uptime: process.uptime(),
    version: process.env.APP_VERSION,
    checks: {
      database: await checkDatabase(),
      cache: await checkCache(),
      externalAPI: await checkExternalDependencies()
    }
  };

  const allHealthy = Object.values(health.checks).every(c => c.status === 'ok');
  res.status(allHealthy ? 200 : 503).json(health);
});
```

### 4. Handle Retries Idempotently

```javascript
app.post('/api/platform/analytics', async (req, res) => {
  const requestId = req.headers['x-request-id'];
  const retryAttempt = parseInt(req.headers['x-retry-attempt']) || 1;

  // Check if already processed
  const existing = await db.processedRequests.findOne({ requestId });
  if (existing) {
    return res.json({ success: true, data: existing.result, cached: true });
  }

  // Process
  const result = await processAnalytics(req.body);

  // Store result for deduplication
  await db.processedRequests.create({
    requestId,
    result,
    processedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });

  res.json({ success: true, data: result });
});
```

### 5. Graceful Degradation

```javascript
app.post('/api/platform/winner-selection', async (req, res) => {
  try {
    // Try advanced selection algorithm
    const winners = await advancedAlgorithm(req.body);
    res.json({ success: true, data: { winners, algorithm: 'advanced' } });

  } catch (error) {
    // Fallback to simple random selection
    console.error('Advanced algorithm failed, using fallback:', error);
    const winners = await simpleRandomSelection(req.body);
    res.json({
      success: true,
      data: { winners, algorithm: 'simple_fallback' },
      warning: 'Used fallback algorithm'
    });
  }
});
```

---

## Platform Configuration

### Environment Variables

```bash
# Webhook timeouts (milliseconds)
WEBHOOK_TIMEOUT_QUIZ_ANSWER=2000
WEBHOOK_TIMEOUT_WINNER_SELECTION=5000
WEBHOOK_TIMEOUT_PARTICIPANT_REGISTRATION=3000
WEBHOOK_TIMEOUT_DEFAULT=10000

# Circuit breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3

# Retry configuration
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_RETRY_INITIAL_DELAY=1000
WEBHOOK_RETRY_MAX_DELAY=30000
WEBHOOK_RETRY_BACKOFF_MULTIPLIER=2

# Health checks
APP_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
APP_HEALTH_CHECK_TIMEOUT=5000

# Monitoring
WEBHOOK_METRICS_RETENTION_DAYS=90
```

### Database Schema

```sql
-- Webhook metrics
CREATE TABLE webhook_metrics (
  id UUID PRIMARY KEY,
  app_id VARCHAR(255) NOT NULL,
  capability VARCHAR(100) NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  timeout BOOLEAN NOT NULL,
  error_code VARCHAR(100),
  timestamp TIMESTAMP NOT NULL,
  INDEX idx_app_capability_timestamp (app_id, capability, timestamp)
);

-- Dead letter queue
CREATE TABLE webhook_dead_letter_queue (
  id UUID PRIMARY KEY,
  app_id VARCHAR(255) NOT NULL,
  capability VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  failed_at TIMESTAMP NOT NULL,
  requeued_at TIMESTAMP,
  INDEX idx_app_failed (app_id, failed_at)
);

-- App health status
CREATE TABLE app_health_status (
  app_id VARCHAR(255) PRIMARY KEY,
  status VARCHAR(50) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
  last_check TIMESTAMP NOT NULL,
  response_time_ms INTEGER,
  consecutive_failures INTEGER DEFAULT 0,
  details JSONB
);
```

---

## Monitoring & Alerting

### Metrics to Track

1. **Webhook Success Rate** - Per app, per capability
2. **Response Time** - p50, p95, p99
3. **Timeout Rate** - Percentage of calls timing out
4. **Circuit Breaker State** - Open/closed/half-open
5. **DLQ Size** - Number of failed jobs
6. **Retry Rate** - How often retries are needed

### Alert Triggers

| Condition | Severity | Action |
|-----------|----------|--------|
| Success rate < 95% over 1h | Warning | Email app owner |
| Success rate < 90% over 1h | Critical | Email app owner + platform admins |
| p95 latency > 80% of timeout | Warning | Email app owner |
| Circuit breaker opened | Critical | Email app owner + platform admins |
| DLQ size > 100 | Warning | Email platform admins |
| Health check failed 3 times | Critical | Email app owner |

### Dashboard Metrics

Platform admin dashboard should display:

```
App Performance Overview
├── Webhook Success Rate (24h): 98.5%
├── Average Response Time: 245ms
├── Active Circuit Breakers: 0
├── DLQ Size: 12
└── Apps Status
    ├── Holiday Lottery: ✓ Healthy (99.2% success, 189ms avg)
    ├── Quiz: ⚠ Degraded (96.1% success, 1.2s avg)
    └── Prize Widget: ✓ Healthy (100% success, 45ms avg)
```

---

## Migration Strategy

### Phase 1: Add Timeouts (Week 1)
- Implement timeout on all webhook calls
- Add fallback for critical operations
- Monitor timeout rates

### Phase 2: Circuit Breaker (Week 2)
- Deploy circuit breaker pattern
- Configure thresholds per capability
- Set up alerting

### Phase 3: Async Pattern (Week 3-4)
- Implement job queue for non-critical operations
- Deploy retry logic
- Set up dead letter queue

### Phase 4: Monitoring (Week 5)
- Deploy metrics collection
- Build admin dashboard
- Configure alerts

### Phase 5: Documentation (Week 6)
- Update API docs
- Create app developer guide
- Publish best practices

---

## Conclusion

This comprehensive resilience strategy ensures:

1. **User Experience Protected** - Timeouts prevent indefinite waits
2. **Graceful Degradation** - Platform continues functioning when apps fail
3. **App Reliability Tracked** - Circuit breakers prevent cascading failures
4. **Async When Possible** - Non-critical operations don't block users
5. **Observable** - Metrics and alerts enable proactive management

**Key Principle:** User experience always takes priority over app delegation. Apps enhance the platform but never break it.
