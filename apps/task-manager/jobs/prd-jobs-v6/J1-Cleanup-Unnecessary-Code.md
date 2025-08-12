# Job 1: Clean Up Unnecessary Code and Files

## Purpose

Remove all log forwarder remnants and clean up architecture violations to maintain clean code principles.

## Current Issues

- Debug logging spam in console output
- Unnecessary debug code in logger factory
- Architecture violations from previous log forwarder attempts

## Project Structure Changes

### Files to Remove

```
deployment/observability/log-forwarder.js ✅ (already deleted)
```

### Files to Clean

#### 1. `apps/task-manager/src/common/utils/loggers/otel-logger.ts`

**Current Issues:**

- Excessive debug logging spam
- Manual OTLP log record creation
- Not using OTEL SDK properly

**Changes:**

- Remove all `[OTEL DEBUG]` console.log statements
- Remove manual log record creation
- Prepare for OTEL SDK implementation in Job 3

**Code Changes:**

```typescript
// REMOVE these lines:
console.log(`[OTEL DEBUG] Attempting to send log to OTEL: ${level} - ${message}`);
console.log(`[OTEL DEBUG] Log record created, sending to exporter...`);
console.log(`[OTEL DEBUG] Log sent successfully to OTEL`);
console.log(`[OTEL DEBUG] Export completed with result:`, result);

// KEEP the core functionality but remove debug spam
```

#### 2. `apps/task-manager/src/common/utils/loggers/logger-factory.ts`

**Current Issues:**

- Debug logging in constructor
- Unnecessary console output

**Changes:**

- Remove `[LOGGER DEBUG]` console.log statements
- Keep core functionality intact

**Code Changes:**

```typescript
// REMOVE these lines:
console.log(`[LOGGER DEBUG] Creating logger of type: ${this.loggerType}`);
console.log(`[LOGGER DEBUG] Logger created successfully`);
console.log(`[LOGGER DEBUG] LOG_FORMAT from app config: "${logFormat}"`);
```

#### 3. `deployment/observability/configs/otel-collector.yaml`

**Current Issues:**

- File exporter remnants (if any)
- Unnecessary configurations

**Changes:**

- Ensure only necessary exporters are configured
- Prepare for Loki exporter in Job 2

## Test Criteria

- ✅ No debug spam in console output
- ✅ Application still logs to OTEL Collector
- ✅ Clean, readable console output
- ✅ No log forwarder remnants

## Dependencies

- None (can be done independently)

## Estimated Time

- 30 minutes

## Success Metrics

- Console output is clean and readable
- All debug spam removed
- Application functionality unchanged
- Ready for Job 2 implementation
