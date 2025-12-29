# Webhook Resilience - Implementation Checklist

## Overview

This checklist guides the implementation of webhook resilience patterns. Each item includes acceptance criteria and testing requirements.

**Estimated Timeline:** 5-6 weeks
**Priority:** High (addresses critical audit feedback)

---

## Phase 1: Core Timeout Implementation (Week 1)

### 1.1 Webhook Timeout Configuration

- [ ] **Add timeout configuration to manifest parser**
  - [ ] Support both simple string and object format for webhooks
  - [ ] Parse `timeout`, `async`, `retry` fields
  - [ ] Set default timeout to 10000ms
  - [ ] Validate timeout values (min: 1000ms, max: 30000ms for sync)
  - **Files:** `platform/src/services/app-manifest-parser.ts`
  - **Tests:** Unit tests for manifest parsing

- [ ] **Update App model in database**
  - [ ] Add `webhookTimeouts` JSON column to `apps` table
  - [ ] Migration script for existing apps (default timeouts)
  - **Files:** `platform/prisma/migrations/`
  - **Tests:** Migration rollback test

- [ ] **Create timeout configuration service**
  ```typescript
  class WebhookTimeoutService {
    getTimeout(appId: string, capability: string): number
    getDefaultTimeout(capability: string): number
  }
  ```
  - **Files:** `platform/src/services/webhook-timeout.service.ts`
  - **Tests:** Unit tests for timeout resolution

**Acceptance Criteria:**
- ✅ Manifest with webhook timeout parsed correctly
- ✅ Default timeout applied when not specified
- ✅ Timeout values validated on manifest registration
- ✅ Database stores timeout configuration

---

### 1.2 HTTP Client with Timeout

- [ ] **Create webhook HTTP client wrapper**
  ```typescript
  class WebhookClient {
    async call<T>(
      url: string,
      payload: object,
      timeoutMs: number,
      signature: string
    ): Promise<WebhookResponse<T>>
  }
  ```
  - [ ] Implement AbortController for timeout
  - [ ] Add request headers: `X-Timeout-Ms`, `X-Request-ID`, `X-Platform-Signature`
  - [ ] Parse response (support both old and new format)
  - [ ] Throw `WebhookTimeoutError` on timeout
  - **Files:** `platform/src/lib/webhook-client.ts`
  - **Tests:** Unit tests with mock timeout scenarios

- [ ] **Create custom error classes**
  ```typescript
  class WebhookTimeoutError extends Error
  class WebhookResponseError extends Error
  ```
  - **Files:** `platform/src/lib/errors/webhook-errors.ts`

**Acceptance Criteria:**
- ✅ Webhook calls respect configured timeout
- ✅ Timeout errors thrown and catchable
- ✅ Request headers sent correctly
- ✅ Old and new response formats both supported

---

### 1.3 Basic Fallback Strategy

- [ ] **Implement fallback strategy interface**
  ```typescript
  interface FallbackStrategy {
    execute(capability: string, context: object): Promise<any>
  }
  ```
  - [ ] Default random winner selection
  - [ ] Pending approval for participant registration
  - **Files:** `platform/src/services/fallback-strategies/`

- [ ] **Integrate fallback into webhook delegation**
  - [ ] Try webhook call with timeout
  - [ ] Catch timeout error
  - [ ] Execute appropriate fallback
  - [ ] Log fallback usage
  - **Files:** `platform/src/services/webhook-delegator.service.ts`

**Acceptance Criteria:**
- ✅ Timeout triggers fallback automatically
- ✅ User receives response within timeout + 500ms
- ✅ Fallback logs incident for monitoring
- ✅ No user-visible errors

---

### 1.4 Organizer Notification

- [ ] **Create notification service for fallback events**
  ```typescript
  async notifyOrganizerOfFallback(
    roomId: string,
    capability: string,
    reason: string
  ): Promise<void>
  ```
  - [ ] In-app notification
  - [ ] WebSocket broadcast to organizer
  - **Files:** `platform/src/services/notification.service.ts`

**Acceptance Criteria:**
- ✅ Organizer notified when fallback used
- ✅ Notification includes capability and reason
- ✅ Notification persisted in database

---

## Phase 2: Circuit Breaker (Week 2)

### 2.1 Circuit Breaker State Management

- [ ] **Create circuit breaker class**
  ```typescript
  class CircuitBreaker {
    async call<T>(
      appId: string,
      capability: string,
      primary: () => Promise<T>,
      fallback: () => Promise<T>
    ): Promise<T>
  }
  ```
  - [ ] State machine: Closed → Open → Half-Open
  - [ ] Configurable thresholds
  - [ ] State persistence (Redis or database)
  - **Files:** `platform/src/lib/circuit-breaker.ts`
  - **Tests:** Unit tests for state transitions

- [ ] **Add circuit breaker state to database**
  ```sql
  CREATE TABLE circuit_breaker_state (
    app_id VARCHAR(255),
    capability VARCHAR(100),
    state VARCHAR(20),
    failure_count INTEGER,
    last_failure_at TIMESTAMP,
    success_count INTEGER,
    PRIMARY KEY (app_id, capability)
  );
  ```
  - **Files:** `platform/prisma/migrations/`

**Acceptance Criteria:**
- ✅ Circuit breaker tracks failures per app/capability
- ✅ Opens after configured threshold (default: 5 failures)
- ✅ Transitions to half-open after timeout (default: 60s)
- ✅ Closes after configured successes (default: 3)
- ✅ State persists across restarts

---

### 2.2 Circuit Breaker Integration

- [ ] **Integrate circuit breaker with webhook delegator**
  - [ ] Wrap all webhook calls in circuit breaker
  - [ ] Use fallback when circuit open
  - **Files:** `platform/src/services/webhook-delegator.service.ts`

- [ ] **Add circuit breaker status endpoint**
  ```
  GET /api/v1/admin/circuit-breaker/status
  GET /api/v1/admin/circuit-breaker/:appId/:capability
  POST /api/v1/admin/circuit-breaker/:appId/:capability/reset
  ```
  - **Files:** `platform/src/routes/admin/circuit-breaker.routes.ts`

**Acceptance Criteria:**
- ✅ Circuit breaker prevents calls to failing apps
- ✅ Admin can view circuit breaker status
- ✅ Admin can manually reset circuit breaker
- ✅ Logs circuit breaker state changes

---

### 2.3 Circuit Breaker Alerts

- [ ] **Alert on circuit breaker state changes**
  - [ ] Email app owner when circuit opens
  - [ ] Email platform admins
  - [ ] Include failure details and recovery instructions
  - **Files:** `platform/src/services/alert.service.ts`

**Acceptance Criteria:**
- ✅ Email sent when circuit opens
- ✅ Email sent when circuit closes (recovery)
- ✅ Alert includes actionable information

---

## Phase 3: Async Webhook Pattern (Week 3-4)

### 3.1 Job Queue Setup

- [ ] **Install and configure BullMQ**
  ```bash
  npm install bullmq ioredis
  ```
  - [ ] Redis connection setup
  - [ ] Queue configuration
  - **Files:** `platform/src/lib/queue.ts`

- [ ] **Create webhook job processor**
  ```typescript
  class WebhookJobProcessor {
    async processWebhook(job: Job): Promise<void>
  }
  ```
  - [ ] Call webhook with generous timeout
  - [ ] Handle success/failure
  - [ ] Retry logic
  - **Files:** `platform/src/workers/webhook-worker.ts`

**Acceptance Criteria:**
- ✅ Jobs queued successfully
- ✅ Worker processes jobs from queue
- ✅ Failed jobs retried automatically
- ✅ Queue survives worker restart

---

### 3.2 Retry Logic

- [ ] **Implement exponential backoff retry**
  - [ ] Configurable max attempts (default: 3)
  - [ ] Exponential delay: 1s → 2s → 4s
  - [ ] Jitter to prevent thundering herd
  - **Files:** `platform/src/lib/retry.ts`

- [ ] **Add retry headers to webhook requests**
  - [ ] `X-Retry-Attempt: 1`
  - [ ] `X-Max-Attempts: 3`

**Acceptance Criteria:**
- ✅ Failed jobs retry with exponential backoff
- ✅ Max attempts respected
- ✅ Retry headers sent correctly
- ✅ Jitter prevents synchronized retries

---

### 3.3 Dead Letter Queue

- [ ] **Create DLQ table**
  ```sql
  CREATE TABLE webhook_dead_letter_queue (
    id UUID PRIMARY KEY,
    app_id VARCHAR(255),
    capability VARCHAR(100),
    payload JSONB,
    error TEXT,
    attempts INTEGER,
    failed_at TIMESTAMP,
    requeued_at TIMESTAMP
  );
  ```

- [ ] **Move failed jobs to DLQ**
  - [ ] After max retry attempts
  - [ ] Store full context for manual retry
  - **Files:** `platform/src/services/dlq.service.ts`

- [ ] **Create DLQ management endpoints**
  ```
  GET /api/v1/admin/dlq
  GET /api/v1/admin/dlq/:jobId
  POST /api/v1/admin/dlq/:jobId/retry
  DELETE /api/v1/admin/dlq/:jobId
  ```
  - **Files:** `platform/src/routes/admin/dlq.routes.ts`

**Acceptance Criteria:**
- ✅ Failed jobs moved to DLQ after max retries
- ✅ Admin can view DLQ jobs
- ✅ Admin can retry individual jobs
- ✅ Admin can delete jobs from DLQ

---

### 3.4 Async Webhook Delegation

- [ ] **Identify async-capable operations**
  - [ ] Analytics tracking
  - [ ] Notification delivery
  - [ ] Report generation

- [ ] **Update webhook delegator for async operations**
  - [ ] Check webhook config `async: true`
  - [ ] Queue job instead of immediate call
  - [ ] Return immediately to user
  - **Files:** `platform/src/services/webhook-delegator.service.ts`

**Acceptance Criteria:**
- ✅ Async webhooks queued, not called synchronously
- ✅ User receives immediate response
- ✅ Job processed in background
- ✅ Retries happen without user interaction

---

## Phase 4: Monitoring & Metrics (Week 5)

### 4.1 Metrics Collection

- [ ] **Create metrics table**
  ```sql
  CREATE TABLE webhook_metrics (
    id UUID PRIMARY KEY,
    app_id VARCHAR(255),
    capability VARCHAR(100),
    duration_ms INTEGER,
    success BOOLEAN,
    timeout BOOLEAN,
    error_code VARCHAR(100),
    timestamp TIMESTAMP,
    INDEX idx_app_capability_timestamp (app_id, capability, timestamp)
  );
  ```

- [ ] **Record metrics on every webhook call**
  ```typescript
  async recordWebhookMetric(
    appId: string,
    capability: string,
    duration: number,
    success: boolean,
    timeout: boolean,
    errorCode?: string
  ): Promise<void>
  ```
  - **Files:** `platform/src/services/webhook-metrics.service.ts`

**Acceptance Criteria:**
- ✅ Every webhook call creates metric record
- ✅ Metrics include all required fields
- ✅ Timestamp accurate to millisecond
- ✅ Minimal performance overhead (< 10ms)

---

### 4.2 Metrics Aggregation

- [ ] **Create aggregation queries**
  - [ ] Success rate by app/capability/window
  - [ ] Response time percentiles (p50, p95, p99)
  - [ ] Timeout rate
  - **Files:** `platform/src/services/webhook-metrics.service.ts`

- [ ] **Create metrics API endpoints**
  ```
  GET /api/v1/admin/webhook-metrics/:appId
  GET /api/v1/admin/webhook-metrics/:appId/:capability
  ```
  - **Files:** `platform/src/routes/admin/webhook-metrics.routes.ts`

**Acceptance Criteria:**
- ✅ Metrics aggregated by time window (1h, 24h, 7d)
- ✅ Percentile calculations accurate
- ✅ API returns formatted metrics
- ✅ Query performance < 500ms

---

### 4.3 Alert System

- [ ] **Create alert rules engine**
  ```typescript
  class AlertRules {
    async checkSuccessRate(appId: string, capability: string): Promise<void>
    async checkResponseTime(appId: string, capability: string): Promise<void>
    async checkCircuitBreaker(appId: string, capability: string): Promise<void>
  }
  ```
  - **Files:** `platform/src/services/alert-rules.service.ts`

- [ ] **Schedule alert checks**
  - [ ] Every 5 minutes
  - [ ] Use cron or scheduled job
  - **Files:** `platform/src/workers/alert-worker.ts`

- [ ] **Alert delivery**
  - [ ] Email to app owner
  - [ ] Email to platform admins
  - [ ] Slack/Discord webhook (optional)
  - **Files:** `platform/src/services/alert-delivery.service.ts`

**Acceptance Criteria:**
- ✅ Alerts triggered based on rules
- ✅ Email sent with actionable context
- ✅ Alert rate-limited (no spam)
- ✅ Admin can configure alert thresholds

---

### 4.4 Admin Dashboard

- [ ] **Create admin dashboard UI**
  - [ ] Overall webhook health status
  - [ ] Per-app metrics
  - [ ] Circuit breaker status
  - [ ] DLQ size and recent failures
  - [ ] Real-time alerts
  - **Files:** `platform-admin/src/pages/webhooks/dashboard.tsx`

- [ ] **Create health status endpoint**
  ```
  GET /api/v1/admin/webhook-health
  ```
  - Returns overall system health
  - **Files:** `platform/src/routes/admin/webhook-health.routes.ts`

**Acceptance Criteria:**
- ✅ Dashboard shows real-time metrics
- ✅ Charts display trends over time
- ✅ Admin can drill down into specific apps
- ✅ Dashboard updates every 30 seconds

---

## Phase 5: Health Checks (Week 5)

### 5.1 App Health Check Scheduler

- [ ] **Create health check service**
  ```typescript
  async checkAppHealth(app: App): Promise<HealthStatus>
  ```
  - [ ] Ping app `/health` endpoint
  - [ ] Record response time
  - [ ] Parse health status
  - **Files:** `platform/src/services/app-health.service.ts`

- [ ] **Schedule health checks**
  - [ ] Every 5 minutes for all apps
  - [ ] Store results in database
  - **Files:** `platform/src/workers/health-check-worker.ts`

- [ ] **Create health status table**
  ```sql
  CREATE TABLE app_health_status (
    app_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50),
    last_check TIMESTAMP,
    response_time_ms INTEGER,
    consecutive_failures INTEGER,
    details JSONB
  );
  ```

**Acceptance Criteria:**
- ✅ Health checks run on schedule
- ✅ Results stored in database
- ✅ Consecutive failures tracked
- ✅ Alert on 3 consecutive failures

---

### 5.2 Health Status API

- [ ] **Create health status endpoints**
  ```
  GET /api/v1/admin/health/apps
  GET /api/v1/admin/health/apps/:appId
  ```
  - **Files:** `platform/src/routes/admin/health.routes.ts`

**Acceptance Criteria:**
- ✅ API returns current health status
- ✅ Includes last check timestamp
- ✅ Shows consecutive failure count

---

## Phase 6: Testing (Throughout)

### 6.1 Unit Tests

- [ ] **Timeout handling**
  - [ ] Webhook call times out correctly
  - [ ] Timeout error thrown
  - [ ] Fallback executed

- [ ] **Circuit breaker**
  - [ ] State transitions (Closed → Open → Half-Open → Closed)
  - [ ] Threshold configurations
  - [ ] Manual reset

- [ ] **Retry logic**
  - [ ] Exponential backoff calculated correctly
  - [ ] Max attempts respected
  - [ ] Jitter applied

- [ ] **Metrics**
  - [ ] Recording
  - [ ] Aggregation
  - [ ] Percentile calculations

**Coverage Goal:** > 90%

---

### 6.2 Integration Tests

- [ ] **End-to-end webhook flow**
  - [ ] Successful webhook call
  - [ ] Timeout scenario
  - [ ] Fallback execution
  - [ ] Circuit breaker opening

- [ ] **Async webhook flow**
  - [ ] Job queued
  - [ ] Worker processes job
  - [ ] Retry on failure
  - [ ] DLQ on max retries

- [ ] **Admin endpoints**
  - [ ] Metrics retrieval
  - [ ] Circuit breaker reset
  - [ ] DLQ management

---

### 6.3 Load Testing

- [ ] **Webhook timeout under load**
  - [ ] 100 concurrent requests
  - [ ] Verify all timeout correctly
  - [ ] No resource leaks

- [ ] **Circuit breaker under load**
  - [ ] Rapid failures
  - [ ] Verify circuit opens
  - [ ] Verify fallback used

- [ ] **Job queue performance**
  - [ ] Queue 1000 jobs
  - [ ] Verify all processed
  - [ ] Measure throughput

**Performance Goals:**
- Webhook call overhead: < 50ms
- Metrics recording: < 10ms
- Circuit breaker check: < 5ms

---

## Phase 7: Documentation (Week 6)

### 7.1 API Documentation Updates

- [x] ✅ Webhook resilience documentation (`webhook-resilience.md`)
- [x] ✅ Quick guide for developers (`webhook-quick-guide.md`)
- [x] ✅ Updated manifest specification (`app-manifest.md`)
- [x] ✅ Updated main README (`README.md`)
- [ ] Update OpenAPI spec with new headers and endpoints

---

### 7.2 Migration Guide

- [x] ✅ Changelog for webhook resilience (`CHANGELOG_WEBHOOK_RESILIENCE.md`)
- [ ] Migration guide for existing apps
- [ ] Video tutorial for app developers
- [ ] FAQ document

---

### 7.3 Admin Documentation

- [ ] Admin dashboard user guide
- [ ] Alert configuration guide
- [ ] DLQ management procedures
- [ ] Troubleshooting guide

---

## Configuration Checklist

### Environment Variables

```bash
# Webhook Timeouts
WEBHOOK_TIMEOUT_DEFAULT=10000
WEBHOOK_TIMEOUT_QUIZ_ANSWER=2000
WEBHOOK_TIMEOUT_WINNER_SELECTION=5000
WEBHOOK_TIMEOUT_PARTICIPANT_REGISTRATION=3000

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3

# Retry
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_RETRY_INITIAL_DELAY=1000
WEBHOOK_RETRY_MAX_DELAY=30000
WEBHOOK_RETRY_BACKOFF_MULTIPLIER=2

# Health Checks
APP_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
APP_HEALTH_CHECK_TIMEOUT=5000

# Monitoring
WEBHOOK_METRICS_RETENTION_DAYS=90
ALERT_CHECK_INTERVAL=300000  # 5 minutes

# Queue
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=10
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Redis configured and tested
- [ ] Environment variables set
- [ ] Alert email addresses configured

### Deployment

- [ ] Run database migrations
- [ ] Deploy platform backend
- [ ] Deploy worker processes
- [ ] Verify health checks running
- [ ] Verify metrics collection
- [ ] Verify alerts working

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check webhook timeout rates
- [ ] Verify circuit breaker activations
- [ ] Review DLQ size
- [ ] Test admin dashboard
- [ ] Notify app developers of changes

---

## Success Metrics

### Week 1
- ✅ Timeout enforcement working
- ✅ Fallback strategies executed
- ✅ 0% indefinite waits

### Week 2
- ✅ Circuit breaker operational
- ✅ Automatic failure detection
- ✅ < 1% false positives

### Week 3-4
- ✅ Async webhooks queued
- ✅ Retry logic working
- ✅ DLQ capturing failures

### Week 5
- ✅ Metrics collected
- ✅ Dashboard live
- ✅ Alerts triggering correctly

### Week 6
- ✅ Documentation complete
- ✅ App developers notified
- ✅ Migration support available

---

## Risk Mitigation

### Risk: Performance Degradation
- **Mitigation:** Load test before deployment
- **Rollback:** Feature flag to disable circuit breaker

### Risk: False Circuit Breaker Activations
- **Mitigation:** Conservative thresholds initially
- **Rollback:** Admin can manually reset

### Risk: DLQ Overflow
- **Mitigation:** DLQ size alerts
- **Rollback:** Increase Redis memory

### Risk: Breaking Existing Apps
- **Mitigation:** Backward compatibility maintained
- **Rollback:** Old response format supported

---

## Sign-Off

### Development Team
- [ ] Backend lead approval
- [ ] Frontend lead approval
- [ ] DevOps approval

### QA Team
- [ ] Unit tests verified
- [ ] Integration tests verified
- [ ] Load tests verified

### Product Team
- [ ] Feature complete
- [ ] Documentation reviewed
- [ ] User impact assessed

### Security Team
- [ ] Security review completed
- [ ] No new vulnerabilities

---

**Last Updated:** 2025-12-28
**Status:** Design Complete, Implementation Ready
