# Task Manager OTEL Tracing & Structured Logging PRD

## Overview

### Problem Statement
The current task-manager application has inconsistent tracing and logging patterns. While OpenTelemetry (OTEL) is partially configured, the implementation lacks:

1. **Consistent W3C Trace Context propagation** across HTTP requests and Kafka messages
2. **Guaranteed trace fields in logs** - logs don't always include `traceId`, `spanId`, `parentSpanId`, and `traceState`
3. **Proper span hierarchy** - connected spans are not reliably represented with parent-child relationships
4. **Standardized DTO validation** for trace headers across all Kafka message types
5. **Auto-instrumentation disabled** - express, kafkajs, and pg auto-instrumentation is turned off, requiring manual span creation

### Goals
- **End-to-end trace correlation**: Every application log (except system-level logs) must include trace context fields
- **W3C Trace Context compliance**: Standard `traceparent` and `tracestate` headers in all Kafka messages
- **Connected spans**: Proper parent-child relationships between HTTP, Kafka consumer, and producer spans
- **Console span debugging**: Development-friendly span details output similar to OTEL examples
- **Backward compatibility**: Maintain existing logger interface while enriching output
- **Enable auto-instrumentation**: Turn on express, kafkajs, and pg auto-instrumentation for cleaner, more detailed traces

### Non-Goals
- Replacing the entire logger stack
- Instrumenting low-level system operations (DB pool creation, Kafka client wiring)
- Changing the existing DTO structure beyond adding trace header validation

## Current State Analysis

### Existing OTEL Infrastructure
- ✅ OTEL SDK initialized in `src/common/utils/otel-init.ts`
- ✅ Trace exporter configured to local collector
- ✅ Custom `TraceManager` singleton for span operations
- ❌ **Auto-instrumentation disabled** (express, kafkajs, pg) - This is causing us to write manual spans

### Current Tracing Usage
- **TraceManager instances**: 5 files use `TraceManager.getInstance()`
- **traceOperation calls**: 12 locations across services and adapters
- **traceOperationWithContext calls**: 2 locations in Kafka handlers
- **Manual span creation**: Limited to test files

### Current Logging Usage
- **Total logger calls**: 150+ across 25+ files
- **Application logs**: 80+ calls in business logic
- **Infrastructure logs**: 40+ calls in clients and adapters
- **System logs**: 30+ calls in health checks and startup

### Current DTO Structure
- **Base headers**: `BaseWebCrawlHeaderDto` has optional `traceparent`/`tracestate`
- **Validation**: Inconsistent validation across different header DTOs
- **Usage**: Partial implementation in Kafka publishers

## Detailed Gap Analysis

### 1. Logger Enrichment Gaps

#### Files Requiring Logger Updates:
1. **`src/common/utils/logging/otel-logger.ts`** (CRITICAL)
   - `createLogRecord()` method doesn't extract OTEL span context
   - Missing `trace.traceId`, `trace.spanId`, `trace.parentSpanId`, `trace.traceState`

2. **`src/common/utils/logger.ts`** (CRITICAL)
   - Fallback logger doesn't include trace field placeholders
   - `child()` method doesn't preserve trace context

3. **`src/common/utils/logging/formatters.ts`** (NEW FILE NEEDED)
   - Console formatter needs trace field formatting
   - JSON formatter needs trace object structure

### 2. Auto-Instrumentation Configuration (NEW - HIGH PRIORITY)

#### Files Requiring Auto-Instrumentation Updates:
1. **`src/common/utils/otel-init.ts`** (CRITICAL)
   - Enable express auto-instrumentation for automatic HTTP request spans
   - Enable kafkajs auto-instrumentation for automatic Kafka producer/consumer spans
   - Enable pg auto-instrumentation for automatic database query spans
   - Configure auto-instrumentation options for optimal tracing

### 3. HTTP Tracing Gaps (SIMPLIFIED WITH AUTO-INSTRUMENTATION)

#### Files Requiring HTTP Tracing Updates:
1. **`src/common/middleware/trace-context.middleware.ts`** (MEDIUM - SIMPLIFIED)
   - With express auto-instrumentation, we only need to ensure W3C context extraction
   - Remove manual span creation, rely on auto-instrumentation
   - Focus on context activation for downstream operations

2. **`src/api/rest/rest.router.ts`** (LOW)
   - Uses `traceLogger` but doesn't rely on active OTEL context
   - With auto-instrumentation, spans are created automatically

3. **`src/api/rest/health-check.router.ts`** (LOW)
   - 8 logger calls need trace context enrichment
   - Auto-instrumentation will create spans automatically

### 4. Kafka Consumer Tracing Gaps (SIMPLIFIED WITH AUTO-INSTRUMENTATION)

#### Files Requiring Kafka Consumer Updates:
1. **`src/api/kafka/consumers/base-consumer.ts`** (MEDIUM - SIMPLIFIED)
   - With kafkajs auto-instrumentation, consumer spans are created automatically
   - Focus on W3C context extraction from headers
   - Remove manual span creation

2. **`src/api/kafka/handlers/base-handler.ts`** (MEDIUM - SIMPLIFIED)
   - Remove custom TraceManager usage, rely on auto-instrumentation
   - Focus on adding business-specific attributes to auto-created spans

3. **`src/api/kafka/handlers/task-status/`** (LOW)
   - **`new-task.handler.ts`**: 4 logger calls, simplified trace wrapper
   - **`complete-task.handler.ts`**: 2 logger calls, simplified trace wrapper  
   - **`error-task.handler.ts`**: 2 logger calls, simplified trace wrapper
   - **`task-status-router.handler.ts`**: 4 logger calls, routing logic

4. **`src/common/clients/kafka-client.ts`** (LOW)
   - 15 logger calls in message processing
   - Auto-instrumentation will create spans automatically

### 5. Kafka Producer Tracing Gaps (SIMPLIFIED WITH AUTO-INSTRUMENTATION)

#### Files Requiring Kafka Producer Updates:
1. **`src/infrastructure/messaging/kafka/publishers/web-crawl-request.publisher.ts`** (MEDIUM - SIMPLIFIED)
   - 4 logger calls need trace context
   - With kafkajs auto-instrumentation, producer spans are created automatically
   - Focus on W3C header injection

2. **`src/common/clients/kafka-client.ts`** (LOW)
   - Producer methods will have spans created automatically
   - Focus on adding business-specific attributes

### 6. Application Service Tracing Gaps (SIMPLIFIED WITH AUTO-INSTRUMENTATION)

#### Files Requiring Service Updates:
1. **`src/application/services/web-crawl-task-manager.service.ts`** (MEDIUM - SIMPLIFIED)
   - 12 logger calls need trace context
   - Remove custom TraceManager usage, rely on auto-instrumentation
   - Focus on adding business events to auto-created spans

2. **`src/application/services/application.factory.ts`** (LOW)
   - 12 logger calls need trace context
   - Auto-instrumentation will provide spans

3. **`src/application/metrics/services/WebCrawlMetricsService.ts`** (LOW)
   - 6 logger calls need trace context
   - Remove custom TraceManager usage

### 7. Infrastructure Tracing Gaps (SIMPLIFIED WITH AUTO-INSTRUMENTATION)

#### Files Requiring Infrastructure Updates:
1. **`src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`** (MEDIUM - SIMPLIFIED)
   - 15 logger calls need trace context
   - With pg auto-instrumentation, database spans are created automatically
   - Focus on adding business-specific attributes

2. **`src/infrastructure/persistence/postgres/postgres.factory.ts`** (LOW)
   - 8 logger calls need trace context
   - Auto-instrumentation will provide database connection spans

### 8. DTO Validation Gaps

#### Files Requiring DTO Updates:
1. **`src/api/kafka/dtos/headers/base-web-crawl-header.dto.ts`** (CRITICAL)
   - Missing validation for `traceparent` format
   - Missing validation for `tracestate` format
   - Need to follow repository validation rules

2. **`src/api/kafka/dtos/headers/web-crawl-new-task-header.dto.ts`** (LOW)
   - Extends base but needs validation inheritance

3. **`src/api/kafka/dtos/headers/web-crawl-task-update-header.dto.ts`** (LOW)
   - Extends base but needs validation inheritance

4. **`src/infrastructure/messaging/kafka/dtos/web-crawl-request.dto.ts`** (MEDIUM)
   - Has trace fields but needs validation

### 9. Health Check & System Logging Gaps

#### Files Requiring Health Check Updates:
1. **`src/common/health/health-check.service.ts`** (LOW)
   - 8 logger calls need trace context
   - Auto-instrumentation will provide spans

2. **`src/common/clients/consumer-health-check.ts`** (LOW)
   - 3 logger calls need trace context

3. **`src/app.ts`** (LOW)
   - 6 logger calls need trace context
   - Auto-instrumentation will provide spans

## Architecture Design

### Span Hierarchy Design (WITH AUTO-INSTRUMENTATION)
```
HTTP Request (SERVER span - auto-created by express)
├── Route Handler (INTERNAL span - auto-created)
│   ├── Business Logic (INTERNAL span - auto-created)
│   │   ├── Database Query (INTERNAL span - auto-created by pg)
│   │   └── Kafka Producer (PRODUCER span - auto-created by kafkajs)
│   └── Response (INTERNAL span - auto-created)

Kafka Consumer (CONSUMER span - auto-created by kafkajs)
├── Message Handler (INTERNAL span - auto-created)
│   ├── Business Logic (INTERNAL span - auto-created)
│   │   ├── Database Update (INTERNAL span - auto-created by pg)
│   │   └── Follow-up Producer (PRODUCER span - auto-created by kafkajs)
│   └── Message Processing Complete (INTERNAL span - auto-created)
```

### Log Structure Design
```json
{
  "level": "info",
  "message": "Kafka message processed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "task-manager",
  "environment": "development",
  "trace": {
    "traceId": "cccd19c3a2d10e589f01bfe2dc896dc2",
    "spanId": "6f64ce484217a7bf",
    "parentSpanId": "027c5c8b916d29da",
    "traceState": "test=value,otel=1"
  },
  "metadata": {
    "topic": "task-status",
    "partition": 0,
    "offset": "12345"
  }
}
```

### W3C Trace Context Format
- **traceparent**: `00-<traceId>-<spanId>-<flags>`
  - Example: `00-cccd19c3a2d10e589f01bfe2dc896dc2-6f64ce484217a7bf-01`
- **tracestate**: Key-value pairs separated by commas
  - Example: `test=value,otel=1,service=task-manager`

## Implementation Strategy

### Phase 1: Auto-Instrumentation & Core Infrastructure (Jobs J1-J2)
1. **Enable Auto-Instrumentation**: Turn on express, kafkajs, and pg auto-instrumentation
2. **Logger Enrichment**: Update logger to extract OTEL span context

### Phase 2: Context Propagation & Validation (Jobs J3-J4)
3. **HTTP Context**: Ensure W3C context extraction and activation
4. **Kafka Context**: Ensure W3C context propagation in Kafka messages
5. **DTO Validation**: Standardize trace header validation across all DTOs

### Phase 3: Enhancement & Debugging (Jobs J5-J8)
6. **Span Attributes**: Add business-specific attributes to auto-created spans
7. **Console Debugging**: Development span dumper utility
8. **Documentation**: Usage examples and best practices

### Phase 4: Cleanup (Job J9)
9. **Cleanup**: Remove obsolete code, unused DTOs, and manual tracing artifacts

## Success Criteria

### Functional Requirements
- ✅ Every application log includes `trace.traceId` and `trace.spanId`
- ✅ Logs with parent spans include `trace.parentSpanId`
- ✅ Logs with trace state include `trace.traceState`
- ✅ HTTP requests create SERVER spans automatically (express auto-instrumentation)
- ✅ Kafka consumers create CONSUMER spans automatically (kafkajs auto-instrumentation)
- ✅ Kafka producers create PRODUCER spans automatically (kafkajs auto-instrumentation)
- ✅ Database queries create spans automatically (pg auto-instrumentation)
- ✅ DTOs validate trace headers when provided

### Performance Requirements
- ✅ Logger enrichment adds <1ms overhead per log call
- ✅ Auto-instrumentation adds <2ms overhead per operation
- ✅ W3C header injection adds <1ms overhead per message

### Observability Requirements
- ✅ Console output shows span details in development
- ✅ OTEL collector receives properly formatted spans
- ✅ Trace correlation works across HTTP → Kafka → Consumer flow
- ✅ Database queries are automatically traced with SQL statements

## Risk Mitigation

### Technical Risks
1. **Auto-Instrumentation Conflicts**: Test with existing manual spans to ensure compatibility
2. **Performance Impact**: Benchmark auto-instrumentation overhead
3. **Header Validation Strictness**: Lenient validation with proper error handling

### Operational Risks
1. **Backward Compatibility**: Maintain existing logger interface
2. **Configuration Complexity**: Environment-based feature flags
3. **Debugging Difficulty**: Enhanced console output and error messages

## Dependencies

### Required Packages
```json
{
  "@opentelemetry/instrumentation-express": "^0.35.0",
  "@opentelemetry/instrumentation-kafkajs": "^0.35.0", 
  "@opentelemetry/instrumentation-pg": "^0.35.0"
}
```

### Infrastructure Dependencies
- OTEL Collector running in `deployment/observability/`
- Kafka cluster with header support
- PostgreSQL with query instrumentation

## Testing Strategy

### Unit Tests
- Logger enrichment with mock spans
- DTO validation with various trace header formats
- Auto-instrumentation configuration validation

### Integration Tests
- HTTP request → Kafka producer → Kafka consumer flow
- Trace context propagation across service boundaries
- Log output validation with trace fields
- Database query tracing validation

### End-to-End Tests
- Complete task creation workflow with trace correlation
- Error scenarios with proper trace context
- Performance benchmarks for auto-instrumentation

## Auto-Instrumentation Benefits

### Express Auto-Instrumentation
- **Automatic HTTP spans**: Every request creates a SERVER span with method, path, status code
- **Request/Response attributes**: User agent, request size, response size, duration
- **Error tracking**: Automatic error status and exception recording
- **Middleware integration**: Spans for middleware execution

### KafkaJS Auto-Instrumentation
- **Producer spans**: Automatic PRODUCER spans for all message sends
- **Consumer spans**: Automatic CONSUMER spans for all message processing
- **Message attributes**: Topic, partition, offset, key, timestamp
- **Header propagation**: Automatic W3C trace context injection/extraction

### PostgreSQL Auto-Instrumentation
- **Query spans**: Automatic spans for all database queries
- **SQL attributes**: Query text, parameters, execution time
- **Connection tracking**: Connection pool and transaction spans
- **Error handling**: Automatic error status for failed queries
