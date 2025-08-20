# Job J11: Logging Policy Overhaul (Noise Reduction + Signal Preservation)

Status: ✅ Completed
Priority: High
Dependencies: J1-J7 (OTEL enabled), J9 (Cleanup), J10 (Kafka test script)
ETA: 1-2 hours

## Summary
Normalize logging across the service to reduce noise and preserve high-signal telemetry:
- **Demote successful operation logs to debug level.**
- Remove "processing …" routine info logs; keep only inbound request logs (HTTP and Kafka) and errors.
- Eliminate duplicate success logs and DB "saved successfully" messages (we rely on spans/metrics instead).
- Ensure all error logs remain and are user-friendly and structured.

## Scope
- Files to scan/edit (primary):
  - `src/api/kafka/handlers/**`: remove or demote success logs; keep request-in logs.
  - `src/application/**`: demote success logs; keep error logs.
  - `src/infrastructure/**`: remove DB "saved/updated" success logs; keep error logs only.
  - `src/api/rest/rest.router.ts`: keep inbound request logs (debug or info), no success spam.
  - `src/common/utils/logger.ts`: no change in structure; ensure debug is available.

## Non-Goals
- No change to OTEL span creation; we keep business attributes/events as is.
- No change to DTOs.

## Detailed Changes

### 1. Kafka Handlers Success Log Demotion
**Files:** `src/api/kafka/handlers/task-status/*.handler.ts`, `src/api/kafka/handlers/base-handler.ts`

**Current Success Logs to Demote:**
```typescript
// In base-handler.ts - logProcessingSuccess method
logger.info(`Completed ${this.constructor.name} processing successfully`, {
  processingId,
  messageId: message.message.key?.toString(),
  offset: message.message.offset,
  topic: message.topic,
  partition: message.partition,
});

// Change to:
logger.debug(`Completed ${this.constructor.name} processing successfully`, {
  processingId,
  messageId: message.message.key?.toString(),
  offset: message.message.offset,
  topic: message.topic,
  partition: message.partition,
});
```

**Remove Mid-Pipeline Processing Logs:**
```typescript
// Remove or demote any "Processing..." info logs
logger.info(`Processing ${messageType} message...`); // REMOVE
logger.debug(`Processing ${messageType} message...`); // KEEP if needed for debugging
```

### 2. Application Services Success Log Demotion
**Files:** `src/application/services/web-crawl-task-manager.service.ts`, `src/application/metrics/services/WebCrawlMetricsService.ts`

**Current Success Logs to Demote:**
```typescript
// In web-crawl-task-manager.service.ts
logger.info(`Web crawl task created successfully`, { taskId, userEmail, originalUrl });
// Change to:
logger.debug(`Web crawl task created successfully`, { taskId, userEmail, originalUrl });

// In WebCrawlMetricsService.ts
logger.info(`Metrics updated successfully`, { metricsType, count });
// Change to:
logger.debug(`Metrics updated successfully`, { metricsType, count });
```

### 3. Infrastructure Adapters Success Log Removal
**Files:** `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`, `src/infrastructure/messaging/kafka/publishers/web-crawl-request.publisher.ts`

**Remove DB Success Logs:**
```typescript
// In web-crawl-task.repository.adapter.ts
logger.info(`Task saved successfully to database`, { taskId, status });
// REMOVE - rely on spans/metrics instead

// In web-crawl-request.publisher.ts
logger.info(`Message published successfully to Kafka`, { topic, key, partition });
// Change to:
logger.debug(`Message published successfully to Kafka`, { topic, key, partition });
```

### 4. REST Router Success Log Demotion
**Files:** `src/api/rest/rest.router.ts`

**Keep Inbound Request Logs (Debug Level):**
```typescript
// In request logging middleware
logger.info(`Incoming ${req.method} request to ${req.path}`);
// Change to:
logger.debug(`Incoming ${req.method} request to ${req.path}`);

// Remove endpoint success logs
logger.info(`Endpoint ${req.path} called successfully`); // REMOVE
```

### 5. Server Startup Success Log Demotion
**Files:** `src/server.ts`

**Demote Application Startup Success:**
```typescript
// In server.ts
logger.info('Task Manager application started successfully');
// Change to:
logger.debug('Task Manager application started successfully');
```

## Implementation Steps

### Step 1: Create Logging Policy Checklist
```typescript
// Logging Policy Rules:
// ✅ KEEP: logger.error() - All error logs remain unchanged
// ✅ KEEP: logger.warn() - All warning logs remain unchanged  
// 🔄 CHANGE: logger.info() success messages → logger.debug()
// ❌ REMOVE: logger.info() "processing..." routine messages
// ❌ REMOVE: logger.info() DB "saved successfully" messages
// 🔄 CHANGE: logger.info() inbound requests → logger.debug()
```

### Step 2: Update Specific Files

#### 2.1 Base Handler Success Log Demotion
```typescript
// File: src/api/kafka/handlers/base-handler.ts
// Method: logProcessingSuccess
// Change: logger.info → logger.debug
```

#### 2.2 Application Services Success Log Demotion
```typescript
// File: src/application/services/web-crawl-task-manager.service.ts
// Search for: logger.info.*success|created|updated
// Change all to: logger.debug
```

#### 2.3 Infrastructure Success Log Removal
```typescript
// File: src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts
// Remove: logger.info.*saved|created|updated.*successfully
```

#### 2.4 REST Router Request Log Demotion
```typescript
// File: src/api/rest/rest.router.ts
// Change: logger.info.*request → logger.debug
```

#### 2.5 Server Startup Log Demotion
```typescript
// File: src/server.ts
// Change: logger.info.*started successfully → logger.debug
```

### Step 3: Verification Commands
```bash
# Test Kafka flow with debug logging
DEBUG=* npm start

# Test HTTP endpoints with debug logging  
curl -X GET http://localhost:3000/health

# Verify console shows only:
# - Inbound requests (debug level)
# - Errors (info/warn/error level)
# - No success spam
```

### Step 4: Add Linting Note
```typescript
// Add to .eslintrc.js or create logging-policy.md:
// "Prefer logger.debug() for success messages and logger.info() for errors only"
// "Avoid logger.info() for routine processing messages"
```

## Specific File Changes Required

### 1. `src/api/kafka/handlers/base-handler.ts`
```typescript
// Line ~150: logProcessingSuccess method
logger.info(`Completed ${this.constructor.name} processing successfully`, {
// ↓ CHANGE TO ↓
logger.debug(`Completed ${this.constructor.name} processing successfully`, {
```

### 2. `src/application/services/web-crawl-task-manager.service.ts`
```typescript
// Search for any logger.info with success/created/updated
// Change all to logger.debug
```

### 3. `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`
```typescript
// Remove any logger.info with "saved successfully" or "created successfully"
// Keep only error logs
```

### 4. `src/api/rest/rest.router.ts`
```typescript
// In request logging middleware
logger.info(`Incoming ${req.method} request to ${req.path}`);
// ↓ CHANGE TO ↓
logger.debug(`Incoming ${req.method} request to ${req.path}`);
```

### 5. `src/server.ts`
```typescript
// Line 62
logger.info('Task Manager application started successfully');
// ↓ CHANGE TO ↓
logger.debug('Task Manager application started successfully');
```

## Verification
- Run Kafka flow and HTTP health check; confirm console shows only inbound requests and errors.
- Validate traces still contain rich details via span attributes/events.
- Ensure debug level is enabled for testing: `DEBUG=* npm start`

## Rollback
- All edits are demotions/removals; revert specific files if needed.
- Can easily change `logger.debug` back to `logger.info` if needed.

## Checklist
- [ ] Demote success logs in `base-handler.ts` logProcessingSuccess method
- [ ] Demote success logs in application services (`web-crawl-task-manager.service.ts`, `WebCrawlMetricsService.ts`)
- [ ] Remove DB success logs in repository adapters
- [ ] Demote inbound request logs in REST router to debug level
- [ ] Demote server startup success log to debug level
- [ ] Keep all error logs unchanged (info/warn/error level)
- [ ] Smoke test Kafka + HTTP with debug logging enabled
- [ ] Verify console output shows only inbound requests (debug) and errors (info+)
