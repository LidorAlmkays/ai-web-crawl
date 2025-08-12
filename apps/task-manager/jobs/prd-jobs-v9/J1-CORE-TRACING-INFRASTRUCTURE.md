# Job 1: Core Tracing Infrastructure Implementation

## Overview

Implement the foundational tracing infrastructure including the trace manager, context management, and enhanced OTEL configuration.

## Objectives

- Set up centralized trace management
- Implement trace context propagation utilities
- Create standardized trace attributes
- Enhance OTEL configuration for trace support

## Files to Create/Modify

### 1. Core Trace Manager

**File**: `apps/task-manager/src/common/utils/tracing/trace-manager.ts`

**Implementation**:

```typescript
import { trace, Span, SpanStatusCode, SpanContext } from '@opentelemetry/api';

export class TraceManager {
  private static instance: TraceManager;
  private tracer = trace.getTracer('task-manager');

  static getInstance(): TraceManager {
    if (!TraceManager.instance) {
      TraceManager.instance = new TraceManager();
    }
    return TraceManager.instance;
  }

  createSpan(name: string, attributes?: Record<string, any>): Span {
    return this.tracer.startSpan(name, { attributes });
  }

  // Create span as child of existing trace context
  createChildSpan(name: string, parentContext: SpanContext, attributes?: Record<string, any>): Span {
    return this.tracer.startSpan(name, {
      attributes,
      links: [{ context: parentContext }],
    });
  }

  async traceOperation<T>(name: string, operation: () => Promise<T>, attributes?: Record<string, any>): Promise<T> {
    const span = this.createSpan(name, attributes);

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  // New method for tracing with existing context (distributed tracing)
  async traceOperationWithContext<T>(name: string, parentContext: SpanContext, operation: () => Promise<T>, attributes?: Record<string, any>): Promise<T> {
    const span = this.createChildSpan(name, parentContext, attributes);

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### 2. Trace Context Management

**File**: `apps/task-manager/src/common/utils/tracing/trace-context.ts`

**Implementation**:

```typescript
import { SpanContext, trace } from '@opentelemetry/api';

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

export class TraceContextManager {
  // Extract trace context from Kafka headers (W3C Trace Context)
  static extractFromKafkaHeaders(headers: Record<string, any>): TraceContext | null {
    const traceparent = headers['traceparent'];
    const tracestate = headers['tracestate'];

    if (traceparent) {
      return this.parseW3CTraceContext(traceparent, tracestate);
    }

    return null;
  }

  // Extract trace context from HTTP headers (for future use)
  static extractFromHttpHeaders(headers: Record<string, any>): TraceContext | null {
    const traceparent = headers['traceparent'];
    const tracestate = headers['tracestate'];

    if (traceparent) {
      return this.parseW3CTraceContext(traceparent, tracestate);
    }

    return null;
  }

  // Inject trace context into Kafka headers
  static injectIntoKafkaHeaders(context: SpanContext): Record<string, any> {
    return {
      traceparent: this.formatW3CTraceContext(context),
      tracestate: context.traceState?.serialize() || '',
    };
  }

  // Parse W3C trace context format: 00-<trace-id>-<span-id>-<trace-flags>
  private static parseW3CTraceContext(traceparent: string, tracestate?: string): TraceContext | null {
    try {
      const parts = traceparent.split('-');
      if (parts.length === 4 && parts[0] === '00') {
        return {
          traceId: parts[1],
          spanId: parts[2],
          traceFlags: parseInt(parts[3], 16),
          traceState: tracestate,
        };
      }
    } catch (error) {
      // Invalid trace context format
    }
    return null;
  }

  // Format W3C trace context
  private static formatW3CTraceContext(context: SpanContext): string {
    return `00-${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, '0')}`;
  }
}
```

### 3. Trace Attributes

**File**: `apps/task-manager/src/common/utils/tracing/trace-attributes.ts`

**Implementation**:

```typescript
/**
 * Standardized trace attributes for consistent naming across the application
 */
export class TraceAttributes {
  // Service attributes
  static readonly SERVICE_NAME = 'service.name';
  static readonly SERVICE_VERSION = 'service.version';
  static readonly SERVICE_ENVIRONMENT = 'service.environment';

  // Kafka attributes
  static readonly KAFKA_TOPIC = 'kafka.topic';
  static readonly KAFKA_PARTITION = 'kafka.partition';
  static readonly KAFKA_OFFSET = 'kafka.offset';
  static readonly MESSAGE_SIZE = 'message.size';

  // Database attributes
  static readonly DATABASE_OPERATION = 'database.operation';
  static readonly DATABASE_TABLE = 'database.table';
  static readonly DATABASE_QUERY = 'database.query';

  // Task attributes
  static readonly TASK_ID = 'task.id';
  static readonly TASK_STATUS = 'task.status';
  static readonly TASK_PRIORITY = 'task.priority';
  static readonly TASK_URL = 'task.url';

  // HTTP attributes
  static readonly HTTP_METHOD = 'http.method';
  static readonly HTTP_URL = 'http.url';
  static readonly HTTP_STATUS_CODE = 'http.status_code';

  // Trace attributes
  static readonly PARENT_TRACE_ID = 'parent.trace.id';
  static readonly DISTRIBUTED_TRACE = 'distributed.trace';

  /**
   * Create standardized attributes object
   */
  static create(attributes: Record<string, any>): Record<string, any> {
    return {
      [this.SERVICE_NAME]: 'task-manager',
      [this.SERVICE_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      ...attributes,
    };
  }

  /**
   * Filter sensitive data from attributes
   */
  static filterSensitiveData(attributes: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];
    const filtered = { ...attributes };

    for (const key of sensitiveKeys) {
      if (filtered[key]) {
        filtered[key] = '[REDACTED]';
      }
    }

    return filtered;
  }
}
```

### 4. Enhanced OTEL Configuration

**File**: `apps/task-manager/src/common/utils/otel-init.ts` (Enhanced)

**Implementation**:

```typescript
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const initOpenTelemetry = () => {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  // Configure resource attributes
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'task-manager',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  // Configure span processor with batching for performance
  const spanProcessor = new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000,
  });

  const sdk = new NodeSDK({
    resource,
    spanProcessor,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  diag.info('OpenTelemetry SDK started with trace support');

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => diag.info('OpenTelemetry SDK has been shutdown.'))
      .catch((error) => diag.error('Error shutting down SDK', error))
      .finally(() => process.exit(0));
  });
};
```

### 5. Tracing Configuration

**File**: `apps/task-manager/src/config/tracing.ts`

**Implementation**:

```typescript
export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  exportEndpoint: string;
  serviceName: string;
  environment: string;
  attributes: Record<string, string>;
  batchProcessor: {
    maxQueueSize: number;
    maxExportBatchSize: number;
    scheduledDelayMillis: number;
    exportTimeoutMillis: number;
  };
}

export const tracingConfig: TracingConfig = {
  enabled: process.env.TRACING_ENABLED === 'true',
  samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '1.0'),
  exportEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  serviceName: process.env.SERVICE_NAME || 'task-manager',
  environment: process.env.NODE_ENV || 'development',
  attributes: {
    'service.type': 'task-manager',
    'service.team': 'platform',
  },
  batchProcessor: {
    maxQueueSize: parseInt(process.env.TRACING_MAX_QUEUE_SIZE || '2048'),
    maxExportBatchSize: parseInt(process.env.TRACING_MAX_BATCH_SIZE || '512'),
    scheduledDelayMillis: parseInt(process.env.TRACING_DELAY_MS || '5000'),
    exportTimeoutMillis: parseInt(process.env.TRACING_TIMEOUT_MS || '30000'),
  },
};
```

## Unit Tests

### 1. Trace Manager Tests

**File**: `apps/task-manager/src/common/utils/tracing/__tests__/trace-manager.spec.ts`

**Test Cases**:

- Test singleton pattern
- Test span creation with attributes
- Test child span creation with context
- Test traceOperation with success
- Test traceOperation with error
- Test traceOperationWithContext
- Test error handling and exception recording

### 2. Trace Context Tests

**File**: `apps/task-manager/src/common/utils/tracing/__tests__/trace-context.spec.ts`

**Test Cases**:

- Test W3C trace context parsing
- Test W3C trace context formatting
- Test Kafka header extraction
- Test HTTP header extraction
- Test Kafka header injection
- Test invalid trace context handling
- Test missing trace context handling

### 3. Trace Attributes Tests

**File**: `apps/task-manager/src/common/utils/tracing/__tests__/trace-attributes.spec.ts`

**Test Cases**:

- Test attribute creation with defaults
- Test sensitive data filtering
- Test attribute constants
- Test attribute merging

## Integration Points

### 1. Application Startup

**File**: `apps/task-manager/src/app.ts` (Enhanced)

**Changes**:

```typescript
import { initOpenTelemetry } from './common/utils/otel-init';
import { TraceManager } from './common/utils/tracing/trace-manager';

export class TaskManagerApplication {
  public async start(): Promise<void> {
    // Initialize OpenTelemetry with trace support
    initOpenTelemetry();

    // Initialize trace manager
    TraceManager.getInstance();

    // Continue with existing startup logic...
  }
}
```

## Success Criteria

- [ ] Trace manager singleton pattern works correctly
- [ ] Span creation and management functions properly
- [ ] Child span creation with context works
- [ ] W3C trace context parsing and formatting is correct
- [ ] Kafka header extraction and injection works
- [ ] OTEL configuration includes trace exporter
- [ ] All unit tests pass
- [ ] Application starts without errors
- [ ] Trace data is exported to OTEL collector

## Dependencies

- `@opentelemetry/api` (already installed)
- `@opentelemetry/sdk-node` (already installed)
- `@opentelemetry/exporter-trace-otlp-http` (already installed)
- `@opentelemetry/resources` (already installed)
- `@opentelemetry/semantic-conventions` (already installed)

## Estimated Time

**2-3 days**

## Next Steps

After completing this job, proceed to Job 2: Business Logic Instrumentation.
