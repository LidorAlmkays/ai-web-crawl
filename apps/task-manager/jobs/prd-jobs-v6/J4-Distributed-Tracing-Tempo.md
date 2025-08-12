# Job 4: Implement Distributed Tracing with Tempo

## Purpose

Complete the tracing implementation using Tempo as the backend, providing end-to-end visibility across all application operations.

## Current Issues

- No distributed tracing implemented
- No visibility into request flows
- No performance monitoring across services
- No correlation between logs and traces

## Project Structure Changes

### Files to Modify

#### 1. `apps/task-manager/src/common/utils/otel-init.ts`

**Current State:** Only logging initialization

**Changes:**

- Add tracing initialization
- Configure trace exporter to Tempo
- Set up trace provider
- Configure auto-instrumentation

**Enhanced Implementation:**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPLogExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { TraceExporter } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export function initializeOtel(): void {
  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'task-manager',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  // Create trace exporter for Tempo
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {},
  });

  // Create log exporter
  const logExporter = new OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/logs',
    headers: {},
  });

  // Initialize NodeSDK with all components
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    logRecordProcessor: new SimpleLogRecordProcessor(logExporter),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingPaths: ['/health', '/metrics'],
        },
        '@opentelemetry/instrumentation-express': {
          ignoreLayers: ['middleware'],
        },
      }),
    ],
  });

  // Initialize the SDK
  sdk.start();
}
```

#### 2. `apps/task-manager/src/api/rest/rest.router.ts`

**Current State:** Basic Express router

**Changes:**

- Add custom spans for business operations
- Add trace context to logs
- Instrument key endpoints

**Enhanced Implementation:**

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('task-manager-api');

// Add tracing to metrics endpoint
router.get('/metrics', async (req, res) => {
  const span = tracer.startSpan('get_metrics');

  try {
    const metrics = await metricsService.getMetrics(req.query);

    span.setAttributes({
      'http.method': 'GET',
      'http.route': '/metrics',
      'metrics.time_range': req.query.hours || '24h',
    });

    span.setStatus({ code: SpanStatusCode.OK });
    res.json(metrics);
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  } finally {
    span.end();
  }
});
```

#### 3. `apps/task-manager/src/application/services/web-crawl-task-manager.service.ts`

**Current State:** Basic service implementation

**Changes:**

- Add spans for business operations
- Correlate logs with traces
- Add performance monitoring

**Enhanced Implementation:**

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('task-manager-service');

export class WebCrawlTaskManagerService implements WebCrawlTaskManagerPort {
  async createTask(data: CreateWebCrawlTaskData): Promise<WebCrawlTask> {
    const span = tracer.startSpan('create_web_crawl_task');

    try {
      span.setAttributes({
        'task.user_email': data.userEmail,
        'task.base_url': data.baseUrl,
        'task.user_query': data.userQuery,
      });

      const task = await this.repository.createTask(data);

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'task.id': task.id,
        'task.status': task.status,
      });

      return task;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

#### 4. `apps/task-manager/src/infrastructure/persistence/postgres/postgres.factory.ts`

**Current State:** Basic database factory

**Changes:**

- Add database query tracing
- Monitor query performance
- Add connection pool metrics

**Enhanced Implementation:**

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('postgres-db');

// Wrap database queries with tracing
async function executeQuery(query: string, params: any[]): Promise<any> {
  const span = tracer.startSpan('db_query');

  try {
    span.setAttributes({
      'db.system': 'postgresql',
      'db.statement': query,
      'db.parameters': JSON.stringify(params),
    });

    const result = await pool.query(query, params);

    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttributes({
      'db.rows_affected': result.rowCount,
    });

    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

#### 5. `apps/task-manager/src/api/kafka/kafka-api.manager.ts`

**Current State:** Basic Kafka manager

**Changes:**

- Add Kafka message tracing
- Monitor consumer performance
- Add message processing spans

**Enhanced Implementation:**

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('kafka-manager');

// Add tracing to message processing
async processMessage(message: any): Promise<void> {
  const span = tracer.startSpan('process_kafka_message');

  try {
    span.setAttributes({
      'messaging.system': 'kafka',
      'messaging.operation': 'process',
      'messaging.topic': message.topic,
      'messaging.message_id': message.key,
    });

    await this.handler.handle(message);

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### Files to Create

#### 1. `apps/task-manager/src/common/utils/trace-utils.ts`

**Purpose:**

- Utility functions for tracing
- Span creation helpers
- Context propagation utilities

**Implementation:**

```typescript
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';

export function createSpan(name: string, attributes?: Record<string, any>): Span {
  const tracer = trace.getTracer('task-manager');
  const span = tracer.startSpan(name);

  if (attributes) {
    span.setAttributes(attributes);
  }

  return span;
}

export function addEventToSpan(span: Span, name: string, attributes?: Record<string, any>): void {
  span.addEvent(name, attributes);
}

export function setSpanError(span: Span, error: Error): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  span.recordException(error);
}
```

#### 2. `apps/task-manager/src/common/types/trace.types.ts`

**Purpose:**

- Trace-specific type definitions
- Span attribute interfaces
- Trace context types

### Files to Update

#### 1. `package.json` (Workspace Root)

**Add Dependencies:**

```json
{
  "dependencies": {
    "@opentelemetry/sdk-trace-base": "^1.21.0",
    "@opentelemetry/auto-instrumentations-node": "^0.41.0",
    "@opentelemetry/instrumentation-http": "^0.48.0",
    "@opentelemetry/instrumentation-express": "^0.33.0",
    "@opentelemetry/instrumentation-pg": "^0.33.0",
    "@opentelemetry/instrumentation-kafkajs": "^0.33.0"
  }
}
```

## Implementation Steps

### Step 1: Install Tracing Dependencies

1. Install OTEL tracing packages
2. Update package.json
3. Run npm install

### Step 2: Enhance OTEL Initialization

1. Update `otel-init.ts` to include tracing
2. Configure trace exporter for Tempo
3. Set up auto-instrumentation

### Step 3: Add Custom Spans

1. Add spans to REST API endpoints
2. Add spans to business logic services
3. Add spans to database operations
4. Add spans to Kafka operations

### Step 4: Correlate Logs with Traces

1. Add trace context to log records
2. Ensure trace IDs appear in logs
3. Enable log-trace correlation

### Step 5: Test End-to-End Tracing

1. Generate requests through the application
2. Verify traces appear in Tempo
3. Test trace-to-log correlation
4. Verify performance metrics

## Test Criteria

- ✅ Traces appear in Grafana Tempo
- ✅ End-to-end request tracing works
- ✅ Database and Kafka operations are traced
- ✅ Spans show proper timing and attributes
- ✅ Logs correlate with traces
- ✅ Performance metrics are available

## Dependencies

- Job 1 (Cleanup) must be completed
- Job 2 (OTEL Collector → Loki) must be completed
- Job 3 (Enhanced OTEL SDK Logging) must be completed
- Tempo service must be running

## Estimated Time

- 120 minutes

## Success Metrics

- Complete distributed tracing implementation
- End-to-end visibility across all operations
- Performance monitoring and alerting
- Log-trace correlation working
- Ready for Job 5 (Final Integration)

## Expected Trace Structure in Tempo

```
HTTP Request (GET /metrics)
├── Database Query (get_metrics)
├── Kafka Message Processing
│   ├── Message Validation
│   └── Handler Execution
└── HTTP Response
```
