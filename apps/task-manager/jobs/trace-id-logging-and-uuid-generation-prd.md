# PRD: Trace ID Logging and UUID Generation

## Job Status Tracking

This PRD defines the implementation plan for trace ID logging and UUID generation enhancements. Each implementation job will have a status that tracks progress:

- **NOT_COMPLETED**: Job has not been started yet (default state)
- **PENDING**: Job is currently being worked on
- **COMPLETED**: Job has been finished and approved

Jobs will be worked on sequentially, with each job requiring approval before moving to the next one.

## Overview

This PRD outlines the implementation of two critical enhancements to the task-manager application:

1. **Trace ID Logging Enhancement**: Ensure every log entry related to an event (Kafka messages, metrics requests, etc.) includes the trace ID for seamless correlation in Grafana via the OTEL collector pipeline.

2. **UUID Generation for New Tasks**: Modify the new task creation flow to let PostgreSQL generate UUIDs automatically instead of requiring them in message headers, improving system autonomy and reducing external dependencies.

3. **Web Crawl Request Publishing**: After successful task creation, publish a web crawl request to a dedicated Kafka topic to trigger the actual web crawling process, maintaining trace context throughout the workflow.

## Current State Analysis

### Trace ID Logging

- **Current Implementation**: The OTEL logger already extracts trace context from active spans and includes `traceId` and `spanId` in log records
- **Issue**: Trace IDs are not consistently propagated to all log entries, especially in Kafka message processing flows
- **Gap**: Some logging calls don't have access to the active trace context

### UUID Generation

- **Current Implementation**: All task messages require an `id` field in the header DTO (`TaskStatusHeaderDto`)
- **Issue**: External systems must generate and provide UUIDs for new tasks, creating tight coupling
- **Gap**: No automatic UUID generation mechanism for task creation
- **Important**: Tasks with status "error" and "completed" must always have an existing `id` (these are status updates for existing tasks)

### Web Crawl Request Publishing

- **Current Implementation**: No automatic web crawl request publishing after task creation
- **Issue**: Tasks are created but no web crawling process is triggered
- **Gap**: Missing integration between task creation and web crawling execution
- **Requirement**: Need to publish web crawl requests to a dedicated Kafka topic with trace context

## Requirements

### Functional Requirements

#### FR1: Trace ID Logging Enhancement

- **FR1.1**: Every log entry related to an event (Kafka messages, metrics requests, etc.) must include trace ID when available
- **FR1.2**: Kafka message processing logs must include trace ID from message headers
- **FR1.3**: Metrics request logs must include trace ID
- **FR1.4**: All application service logs within trace context must include trace ID
- **FR1.5**: Trace ID must be visible in Grafana logs via OTEL collector → Loki pipeline
- **FR1.6**: System initialization logs (app.ts startup) may not have trace context and should log normally

#### FR2: UUID Generation for New Tasks

- **FR2.1**: Change field name from `id` to `task_id` in incoming message headers
- **FR2.2**: Make `task_id` optional for new tasks (status "new") in `TaskStatusHeaderDto`
- **FR2.3**: Require `task_id` for status updates (status "error" and "completed")
- **FR2.4**: Let PostgreSQL generate UUIDs automatically for new tasks
- **FR2.5**: Maintain backward compatibility for existing task status updates
- **FR2.6**: Ensure PostgreSQL UUID generation is reliable and performant

#### FR3: Web Crawl Request Publishing

- **FR3.1**: Publish web crawl request to dedicated Kafka topic after successful task creation
- **FR3.2**: Include task_id (from PostgreSQL) in request headers
- **FR3.3**: Include user_email, user_query, and base_url in request body
- **FR3.4**: Maintain trace context across the entire workflow
- **FR3.5**: Make topic name configurable via environment variable
- **FR3.6**: Ensure trace ID is propagated to the web crawl request

### Non-Functional Requirements

#### NFR1: Performance

- **NFR1.1**: PostgreSQL UUID generation must be <1ms
- **NFR1.2**: Trace ID extraction must not impact message processing performance
- **NFR1.3**: Logging overhead must remain minimal

#### NFR2: Reliability

- **NFR2.1**: PostgreSQL UUID generation must be collision-resistant
- **NFR2.2**: Trace ID logging must not fail silently
- **NFR2.3**: System must handle missing trace contexts gracefully

#### NFR3: Observability

- **NFR3.1**: All trace IDs must be visible in Grafana logs
- **NFR3.2**: UUID generation events must be logged with trace context
- **NFR3.3**: Error scenarios must include trace context for debugging
- **NFR3.4**: Web crawl request publishing must maintain trace context
- **NFR3.5**: Complete workflow traceability from task creation to web crawl execution

## Technical Design

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kafka Topic   │───▶│  Task Manager   │───▶│   PostgreSQL    │───▶│ Web Crawl Topic │
│                 │    │                 │    │                 │    │                 │
│ traceparent     │    │ Trace Context   │    │ UUID Primary    │    │ traceparent     │
│ tracestate      │    │ Extraction      │    │ Key             │    │ tracestate      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                                              │
                                ▼                                              ▼
                       ┌─────────────────┐                        ┌─────────────────┐
                       │   OTEL Logger   │                        │ Web Crawl       │
                       │                 │                        │ Service         │
                       │ traceId in logs │                        │ (Future)        │
                       └─────────────────┘                        └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ OTEL Collector  │
                       │                 │
                       │ Log Processing  │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Loki        │
                       │                 │
                       │ Log Storage     │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    Grafana      │
                       │                 │
                       │ Log Correlation │
                       └─────────────────┘
```

### File Structure Changes

#### New Files to Create

```
apps/task-manager/src/
├── common/
│   └── utils/
│       └── trace-logging.ts           # Enhanced trace logging utilities
├── api/
│   └── kafka/
│       ├── dtos/
│       │   ├── new-task-header.dto.ts # New header DTO without task_id requirement
│       │   └── web-crawl-request.dto.ts # DTO for web crawl request messages
│       └── publishers/
│           └── web-crawl-request.publisher.ts # Publisher for web crawl requests
├── config/
│   └── kafka-topics.ts                # Kafka topic configuration
└── jobs/
    └── 13-trace-id-logging-and-uuid-generation.md # This PRD
```

#### Files to Modify

```
apps/task-manager/src/
├── api/
│   └── kafka/
│       ├── dtos/
│       │   └── task-status-header.dto.ts          # Change id to task_id, make optional for new tasks
│       ├── handlers/
│       │   └── task-status/
│       │       └── new-task.handler.ts            # Add UUID generation logic
│       └── kafka.router.ts                         # Add message filtering by task_type and status
├── application/
│   └── services/
│       └── web-crawl-task-manager.service.ts      # Add trace context logging
├── common/
│   └── utils/
│       ├── logger.ts                              # Enhance with trace context
│       └── logging/
│           └── otel-logger.ts                     # Ensure trace ID in all logs
└── infrastructure/
    └── persistence/
        └── postgres/
            ├── schema/
            │   └── 02-tables.sql                  # Add UUID extension and default
            └── adapters/
                └── web-crawl-task.repository.adapter.ts # Add trace context logging
```

### Detailed Implementation Plan

#### Phase 1: Enhanced Trace Logging (Priority: High)

**1.1 Create Trace Logging Utilities**

- **File**: `src/common/utils/trace-logging.ts`
- **Purpose**: Centralized trace context extraction and logging enhancement
- **Key Functions**:
  ```typescript
  export class TraceLoggingUtils {
    static extractTraceFromKafkaHeaders(headers: Record<string, any>): string | null;
    static enhanceLoggerWithTrace(logger: ILogger, traceId: string): ILogger;
    static logWithTraceContext(level: LogLevel, message: string, metadata?: Record<string, any>): void;
  }
  ```

**1.2 Enhance Kafka Message Processing**

- **File**: `src/api/kafka/handlers/task-status/new-task.handler.ts`
- **Changes**:
  - Extract trace context from Kafka headers
  - Create child logger with trace context
  - Ensure all log entries include trace ID
  - Add trace context to error handling

**1.3 Update Application Services**

- **File**: `src/application/services/web-crawl-task-manager.service.ts`
- **Changes**:
  - Add trace context to all business operation logs
  - Ensure trace ID propagation through service calls
  - Add trace context to error scenarios

#### Phase 2: UUID Generation Implementation (Priority: High)

**2.1 Update Database Schema for Auto UUID Generation**

- **File**: `src/infrastructure/persistence/postgres/schema/02-tables.sql`
- **Purpose**: Configure PostgreSQL to auto-generate UUIDs for new tasks
- **Key Changes**:
  - Add `DEFAULT gen_random_uuid()` to the `id` column for new task insertions
  - Ensure the `id` column is properly configured as UUID type
  - Add any necessary PostgreSQL extensions for UUID generation

**2.2 Create New Task Header DTO**

- **File**: `src/api/kafka/dtos/new-task-header.dto.ts`
- **Purpose**: Header DTO for new tasks without task_id requirement
- **Key Features**:
  - No `task_id` field required
  - Maintains other required fields (task_type, status, timestamp)
  - Includes validation for new task creation

**2.3 Update Task Status Header DTO**

- **File**: `src/api/kafka/dtos/task-status-header.dto.ts`
- **Changes**:
  - Change field name from `id` to `task_id`
  - Make `task_id` field optional for new tasks (status "new")
  - Require `task_id` for status updates (status "error" and "completed")
  - Add validation logic to handle both new and existing tasks
  - Maintain backward compatibility

**2.4 Update Kafka Consumer and Message Routing**

- **File**: `src/api/kafka/kafka.router.ts`
- **Changes**:
  - Filter messages by `task_type` header (e.g., "web_crawl")
  - Filter messages by `status` header ("new", "error", "completed")
  - For status "new": validate required fields (task_type, status, timestamp) - task_id is optional
  - For status "error" or "completed": validate required fields including `task_id` (changed from `id`)
  - Route to appropriate handlers based on task_type and status combination
  - Add trace context extraction and logging enhancement

**2.5 Update New Task Handler**

- **File**: `src/api/kafka/handlers/task-status/new-task.handler.ts`
- **Changes**:
  - Extract `task_id` from headers (if provided) or let PostgreSQL generate UUID for new tasks
  - Use new header DTO for validation
  - Log task creation with trace context
  - Handle both new and existing task scenarios
  - Validate that status updates (error/completed) always have a `task_id`

#### Phase 3: Web Crawl Request Publishing (Priority: High)

**3.1 Create Web Crawl Request DTO**

- **File**: `src/api/kafka/dtos/web-crawl-request.dto.ts`
- **Purpose**: DTO for web crawl request messages
- **Key Features**:
  - Header: task_id (from PostgreSQL)
  - Body: user_email, user_query, base_url
  - Trace context propagation

**3.2 Create Web Crawl Request Publisher**

- **File**: `src/api/kafka/publishers/web-crawl-request.publisher.ts`
- **Purpose**: Publisher for web crawl request messages
- **Key Functions**:
  - Publish web crawl request to configured topic
  - Maintain trace context in message headers
  - Handle publishing errors with trace context

**3.3 Create Kafka Topic Configuration**

- **File**: `src/config/kafka-topics.ts`
- **Purpose**: Centralized Kafka topic configuration
- **Key Features**:
  - Web crawl request topic name (configurable via env var)
  - Default topic name: "requests-web-crawl"
  - Environment variable: `WEB_CRAWL_REQUEST_TOPIC`

**3.4 Update New Task Handler**

- **File**: `src/api/kafka/handlers/task-status/new-task.handler.ts`
- **Changes**:
  - After successful task creation, publish web crawl request
  - Pass task_id from PostgreSQL to request headers
  - Maintain trace context throughout the workflow
  - Log web crawl request publishing with trace context

#### Phase 4: Integration and Testing (Priority: Medium)

**4.1 Update Repository Layer**

- **File**: `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`
- **Changes**:
  - Add trace context to database operation logs
  - Handle PostgreSQL auto-generated UUIDs for new tasks
  - Add trace context to error scenarios
  - Ensure proper handling of returned UUIDs from database

**4.2 Update Metrics Service**

- **File**: `src/application/metrics/services/WebCrawlMetricsService.ts`
- **Changes**:
  - Add trace context to metrics calculation logs
  - Ensure trace ID propagation in metrics operations

**4.3 Comprehensive Testing**

- **Unit Tests**: Test UUID generation, trace extraction, and validation
- **Integration Tests**: Test Kafka message processing with trace context
- **E2E Tests**: Verify trace ID visibility in Grafana
- **Web Crawl Publishing Tests**: Test web crawl request publishing with trace context

### Data Flow Diagrams

#### Complete Task Creation and Web Crawl Request Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│   Kafka     │───▶│   Handler   │───▶│   Service   │───▶│ Repository  │───▶│ Web Crawl       │
│  Message    │    │             │    │             │    │             │    │ Publisher       │
│             │    │ 1. Extract  │    │ 1. Create   │    │ 1. Persist  │    │                 │
│ traceparent │    │    trace    │    │   entity    │    │   task      │    │ 1. Create       │
│ tracestate  │    │ 2. Prepare  │    │ 2. Log with │    │ 2. Log with │    │   request       │
│             │    │   data      │    │   trace     │    │   trace     │    │ 2. Publish      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────────┘
                           │                   │                   │                   │
                           ▼                   ▼                   ▼                   ▼
                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
                    │   Logger    │    │   Logger    │    │   Logger    │    │   Logger        │
                    │             │    │             │    │             │    │                 │
                    │ traceId:    │    │ traceId:    │    │ traceId:    │    │ traceId:        │
                    │ abc123      │    │ abc123      │    │ abc123      │    │ abc123          │
                    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────────┘
                                                                    │                   │
                                                                    ▼                   ▼
                                                           ┌─────────────┐    ┌─────────────────┐
                                                           │ PostgreSQL  │    │ Web Crawl Topic │
                                                           │             │    │                 │
                                                           │ Auto-gen    │    │ traceparent     │
                                                           │ UUID        │    │ tracestate      │
                                                           └─────────────┘    └─────────────────┘
```

#### Trace ID Propagation Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Kafka     │───▶│ OTEL Logger │───▶│ OTEL        │───▶│    Loki     │
│  Headers    │    │             │    │ Collector   │    │             │
│             │    │ Extract &   │    │ Process &   │    │ Store with  │
│ traceparent │    │ Include     │    │ Forward     │    │ Logs        │
│ tracestate  │    │ traceId     │    │ Logs        │    │ with        │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
                                                       ┌─────────────┐
                                                       │   Grafana   │
                                                       │             │
                                                       │ Query by    │
                                                       │ traceId     │
                                                       └─────────────┘
```

### Implementation Details

#### PostgreSQL UUID Generation Strategy

```sql
-- Implementation in schema/02-tables.sql
-- Configure the web_crawl_tasks table for auto UUID generation

-- Ensure the uuid-ossp extension is available (PostgreSQL plugin for UUID utilities)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE web_crawl_tasks
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Example INSERT statement (no need to specify id)
INSERT INTO web_crawl_tasks (user_email, user_query, original_url, received_at, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id; -- PostgreSQL will return the auto-generated UUID
```

#### Trace Context Enhancement

```typescript
// Implementation in trace-logging.ts
export class TraceLoggingUtils {
  static extractTraceFromKafkaHeaders(headers: Record<string, any>): string | null {
    const traceparent = headers['traceparent'];
    if (traceparent) {
      const parts = traceparent.split('-');
      return parts.length >= 2 ? parts[1] : null;
    }
    return null;
  }

  static enhanceLoggerWithTrace(logger: ILogger, traceId: string): ILogger {
    return logger.child({ traceId });
  }
}
```

#### Enhanced Logging Pattern

```typescript
// Example usage in handlers
const traceId = TraceLoggingUtils.extractTraceFromKafkaHeaders(message.message.headers);
const traceLogger = traceId ? TraceLoggingUtils.enhanceLoggerWithTrace(logger, traceId) : logger;

traceLogger.info('Processing new task message', {
  taskType: validatedHeaders.task_type,
  status: validatedHeaders.status,
  taskId: validatedHeaders.task_id || 'generated',
  correlationId,
});

// Example Kafka router filtering
// Filter by task_type and status, then validate headers before routing to handlers
if (headers.task_type === 'web_crawl') {
  switch (headers.status) {
    case 'new':
      // Validate: task_type, status, timestamp (task_id optional)
      break;
    case 'error':
    case 'completed':
      // Validate: task_type, status, timestamp, task_id (required)
      break;
  }
}

// Example web crawl request publishing
// After successful task creation, publish web crawl request
const webCrawlRequest = {
  headers: {
    task_id: createdTask.id, // From PostgreSQL
    traceparent: traceparent, // Maintain trace context
    tracestate: tracestate,
  },
  body: {
    user_email: validatedData.user_email,
    user_query: validatedData.user_query,
    base_url: validatedData.base_url,
  },
};

await webCrawlPublisher.publish(webCrawlRequest);
```

### Testing Strategy

#### Unit Tests

1. **Database Schema Tests**

   - Test PostgreSQL UUID auto-generation
   - Test UUID uniqueness in database
   - Test collision resistance

2. **Trace Logging Tests**

   - Test trace extraction from Kafka headers
   - Test logger enhancement with trace context
   - Test fallback behavior when trace context is missing

3. **DTO Validation Tests**
   - Test new task header DTO validation
   - Test backward compatibility with existing task headers
   - Test error scenarios

#### Integration Tests

1. **Kafka Message Processing**

   - Test new task creation with PostgreSQL auto-generated UUID
   - Test trace ID propagation through the entire flow
   - Test error handling with trace context

2. **Database Operations**
   - Test task persistence with PostgreSQL auto-generated UUID
   - Test trace context in database logs
   - Test proper handling of returned UUIDs from database

#### E2E Tests

1. **Grafana Trace Correlation**
   - Send test Kafka messages with trace context
   - Verify trace ID visibility in Grafana logs
   - Test log correlation across different services

### Migration Strategy

#### Backward Compatibility

1. **Header DTO Changes**

   - Change field name from `id` to `task_id` in `TaskStatusHeaderDto`
   - Make `task_id` field optional for new tasks (status "new")
   - Require `task_id` for status updates (status "error" and "completed")
   - Add validation logic to handle both scenarios
   - Maintain existing task update flows

2. **Handler Logic**
   - Detect new vs existing task scenarios based on status
   - Let PostgreSQL generate UUID for new tasks (status "new")
   - Preserve existing task ID for status updates (error/completed)
   - Validate that status updates always have a `task_id`

#### Rollout Plan

1. **Phase 1**: Deploy enhanced trace logging
2. **Phase 2**: Deploy UUID generation for new tasks
3. **Phase 3**: Monitor and validate in production
4. **Phase 4**: Remove deprecated code paths

### Success Criteria

#### Trace ID Logging

- [ ] 100% of Kafka message processing logs include trace ID
- [ ] 100% of metrics request logs include trace ID
- [ ] Trace IDs visible in Grafana for all event-related logs
- [ ] System initialization logs (app.ts) log normally without trace context
- [ ] Zero impact on message processing performance

#### UUID Generation

- [ ] New tasks created with PostgreSQL auto-generated UUIDs
- [ ] Status updates (error/completed) require existing `task_id`
- [ ] Field name changed from `id` to `task_id` in incoming messages
- [ ] Kafka consumer filters messages by task_type and status
- [ ] Header validation based on status (new vs error/completed)
- [ ] Zero UUID collisions in production
- [ ] Backward compatibility maintained for existing tasks
- [ ] PostgreSQL UUID generation performance <1ms

#### Web Crawl Request Publishing

- [ ] Web crawl requests published after successful task creation
- [ ] Task ID from PostgreSQL included in request headers
- [ ] User email, query, and base URL included in request body
- [ ] Trace context maintained throughout the workflow
- [ ] Topic name configurable via environment variable
- [ ] Trace ID propagated to web crawl request
- [ ] Complete workflow traceability from task creation to web crawl execution

#### Observability

- [ ] All trace IDs visible in Grafana logs
- [ ] Successful log correlation across services
- [ ] Error scenarios include trace context for debugging
- [ ] Zero silent failures in trace context extraction

### Risk Assessment

#### Technical Risks

1. **UUID Collision Risk**: Low - Using PostgreSQL gen_random_uuid()
2. **Performance Impact**: Low - Minimal overhead for trace extraction
3. **Backward Compatibility**: Medium - Requires careful validation logic

#### Mitigation Strategies

1. **UUID Collision**: Use PostgreSQL's cryptographically secure UUID generation
2. **Performance**: Implement efficient trace context extraction
3. **Compatibility**: Comprehensive testing of both scenarios

### Dependencies

#### Internal Dependencies

- Existing OTEL logger implementation
- Current Kafka message processing infrastructure
- PostgreSQL database schema (no changes required)

#### External Dependencies

- PostgreSQL uuid-ossp extension plugin for UUID generation utilities
- OTEL collector configuration (already in place)
- Grafana Loki setup (already in place)

### Timeline

#### Week 1: Trace Logging Enhancement

- Day 1-2: Create trace logging utilities
- Day 3-4: Update Kafka handlers and application services
- Day 5: Unit testing and integration testing

#### Week 2: UUID Generation Implementation

- Day 1-2: Update database schema for auto UUID generation and create new DTOs
- Day 3-4: Update Kafka router with message filtering and handlers
- Day 5: Comprehensive testing

#### Week 3: Web Crawl Request Publishing

- Day 1-2: Create web crawl request DTO and publisher
- Day 3-4: Update new task handler to publish requests
- Day 5: Testing web crawl request publishing

#### Week 4: Integration and Deployment

- Day 1-2: E2E testing and validation
- Day 3-4: Production deployment
- Day 5: Monitoring and validation

### Conclusion

This PRD provides a comprehensive plan for implementing trace ID logging, UUID generation, and web crawl request publishing in the task-manager application. The implementation will enhance observability by ensuring all logs include trace context for correlation in Grafana, improve system autonomy by letting PostgreSQL generate UUIDs automatically for new tasks, and create a complete workflow from task creation to web crawl execution.

The phased approach ensures minimal risk and maintains backward compatibility throughout the implementation process. The success criteria provide clear metrics for validating the implementation's effectiveness.
