# Product Requirements Document (PRD-9)

## Adding Distributed Tracing Support to Task-Manager

### Executive Summary

This PRD outlines the implementation of distributed tracing capabilities for the task-manager service, extending the existing observability stack (logging and metrics) to include comprehensive trace collection and visualization. The solution will integrate with the existing OpenTelemetry infrastructure and route traces through the OTEL collector to Tempo, ultimately displaying them in Grafana.

### Current State Analysis

**Existing Infrastructure:**

- ✅ OpenTelemetry SDK already configured (`@opentelemetry/sdk-node`)
- ✅ OTEL Collector configured with traces pipeline to Tempo
- ✅ Tempo and Grafana already deployed in observability stack
- ✅ Logging system with OTEL integration (`OTELLogger`)
- ✅ Metrics collection via Prometheus scraping
- ✅ Auto-instrumentation enabled (`@opentelemetry/auto-instrumentations-node`)

**Missing Components:**

- ❌ Manual trace instrumentation for business logic
- ❌ Custom span creation for key operations
- ❌ Trace context propagation across service boundaries
- ❌ Structured trace attributes for business context
- ❌ Performance monitoring integration

### High-Level Architecture

#### Current Single-Service Architecture

```
Task-Manager Service
├── Auto-instrumentation (HTTP, DB, Kafka)
├── Manual instrumentation (Business logic)
├── Trace context propagation
└── OTEL SDK → OTEL Collector → Tempo → Grafana
```

#### Future Multi-Service Architecture

```
User Request → Gateway (creates trace) → Kafka Topics (with trace headers)
                    ↓
                Task-Manager (extracts trace) → History Processing
                    ↓
                Web-Crawler (extracts trace) → Task Execution
```

**Trace Flow**: Same trace ID flows through Gateway → Task-Manager → Web-Crawler

### Detailed Implementation Plan

#### 1. Core Tracing Infrastructure

**File: `apps/task-manager/src/common/utils/tracing/trace-manager.ts`**

- **Purpose**: Centralized trace management and utility functions
- **Responsibilities**:
  - Create and manage spans for business operations
  - Handle trace context propagation
  - Provide utility methods for common tracing patterns
  - Manage trace sampling and configuration

**File: `apps/task-manager/src/common/utils/tracing/trace-context.ts`**

- **Purpose**: Trace context management and propagation
- **Responsibilities**:
  - Extract trace context from Kafka message headers (W3C Trace Context)
  - Extract trace context from HTTP headers (for future use)
  - Inject trace context into outgoing Kafka messages
  - Manage correlation IDs across service boundaries
  - Handle trace context in async operations
  - Parse and format W3C trace context standard

**File: `apps/task-manager/src/common/utils/tracing/trace-attributes.ts`**

- **Purpose**: Standardized trace attributes and constants
- **Responsibilities**:
  - Define common attribute keys and values
  - Provide utility functions for attribute creation
  - Ensure consistent attribute naming across the application
  - Handle sensitive data filtering

#### 2. Business Logic Instrumentation

**File: `apps/task-manager/src/application/services/traced-web-crawl-task-manager.ts`**

- **Purpose**: Instrumented version of the task manager service
- **Responsibilities**:
  - Create spans for task creation, processing, and completion
  - Track task lifecycle events with detailed attributes
  - Monitor performance metrics for task operations
  - Correlate traces with business metrics

**File: `apps/task-manager/src/api/kafka/traced-kafka-api-manager.ts`**

- **Purpose**: Instrumented Kafka message processing with distributed trace support
- **Responsibilities**:
  - Extract trace context from Kafka message headers (W3C Trace Context)
  - Create child spans of incoming traces or new traces if no context
  - Track message processing time and success/failure rates
  - Correlate Kafka traces with business operation traces
  - Monitor consumer lag and performance
  - Inject trace context into outgoing Kafka messages (for future use)

**File: `apps/task-manager/src/infrastructure/persistence/postgres/traced-web-crawl-task-repository.ts`**

- **Purpose**: Instrumented database operations
- **Responsibilities**:
  - Create spans for database queries and transactions
  - Track query performance and execution plans
  - Monitor database connection pool usage
  - Correlate database traces with business operations

#### 3. Configuration and Integration

**File: `apps/task-manager/src/config/tracing.ts`**

- **Purpose**: Tracing configuration management
- **Responsibilities**:
  - Define trace sampling rates and rules
  - Configure trace attribute filtering
  - Set up trace context propagation rules
  - Manage trace export configuration

**File: `apps/task-manager/src/common/utils/tracing/trace-middleware.ts`**

- **Purpose**: Express middleware for trace context
- **Responsibilities**:
  - Extract trace context from HTTP headers
  - Create request-level spans
  - Inject trace context into response headers
  - Handle trace context in error scenarios

#### 4. Enhanced OTEL Configuration

**File: `apps/task-manager/src/common/utils/otel-init.ts` (Enhanced)**

- **Purpose**: Enhanced OpenTelemetry initialization with trace support
- **Responsibilities**:
  - Configure trace exporters and processors
  - Set up trace sampling and filtering
  - Initialize trace context propagation
  - Configure trace resource attributes

### Implementation Details

#### 1. Enhanced Trace Manager Implementation

```typescript
// apps/task-manager/src/common/utils/tracing/trace-manager.ts
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

#### 2. Business Logic Instrumentation

```typescript
// apps/task-manager/src/application/services/traced-web-crawl-task-manager.ts
import { TraceManager } from '../../common/utils/tracing/trace-manager';

export class TracedWebCrawlTaskManager {
  private traceManager = TraceManager.getInstance();

  async createTask(taskData: CreateTaskDto): Promise<Task> {
    return this.traceManager.traceOperation(
      'web_crawl_task.create',
      async () => {
        // Existing business logic
        const task = await this.taskRepository.create(taskData);

        // Add business-specific attributes
        this.traceManager
          .createSpan('task.created', {
            'task.id': task.id,
            'task.status': task.status,
            'task.priority': task.priority,
            'task.url': task.url,
          })
          .end();

        return task;
      },
      {
        'task.url': taskData.url,
        'task.priority': taskData.priority,
      }
    );
  }
}
```

#### 3. Enhanced Kafka Message Tracing with Distributed Context

```typescript
// apps/task-manager/src/api/kafka/traced-kafka-api-manager.ts
import { TraceManager } from '../../common/utils/tracing/trace-manager';
import { TraceContextManager } from '../../common/utils/tracing/trace-context';

export class TracedKafkaApiManager {
  private traceManager = TraceManager.getInstance();

  async processMessage(message: KafkaMessage): Promise<void> {
    // Extract trace context from Kafka headers (W3C Trace Context)
    const traceContext = TraceContextManager.extractFromKafkaHeaders(message.headers);

    if (traceContext) {
      // Create child span of the incoming trace (distributed tracing)
      return this.traceManager.traceOperationWithContext(
        'kafka.message.process',
        traceContext,
        async () => {
          await this.processWithContext(message, traceContext);
        },
        {
          'kafka.topic': message.topic,
          'kafka.partition': message.partition,
          'kafka.offset': message.offset,
          'message.size': message.value?.length || 0,
          'parent.trace.id': traceContext.traceId,
          'distributed.trace': true,
        }
      );
    } else {
      // No trace context - create new trace (single-service scenario)
      return this.traceManager.traceOperation(
        'kafka.message.process.new_trace',
        async () => {
          await this.processMessage(message);
        },
        {
          'kafka.topic': message.topic,
          'kafka.partition': message.partition,
          'kafka.offset': message.offset,
          'message.size': message.value?.length || 0,
          'distributed.trace': false,
        }
      );
    }
  }

  // Inject trace context into outgoing Kafka messages (for future use)
  private injectTraceContextIntoMessage(message: KafkaMessage): void {
    const currentContext = trace.getActiveSpan()?.context();
    if (currentContext) {
      const headers = TraceContextManager.injectIntoKafkaHeaders(currentContext);
      Object.assign(message.headers, headers);
    }
  }
}
```

#### 4. Trace Context Management

```typescript
// apps/task-manager/src/common/utils/tracing/trace-context.ts
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

#### 5. Database Operation Tracing

```typescript
// apps/task-manager/src/infrastructure/persistence/postgres/traced-web-crawl-task-repository.ts
import { TraceManager } from '../../../common/utils/tracing/trace-manager';

export class TracedWebCrawlTaskRepository {
  private traceManager = TraceManager.getInstance();

  async findById(id: string): Promise<Task | null> {
    return this.traceManager.traceOperation(
      'database.task.find_by_id',
      async () => {
        return this.pool.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [id]);
      },
      {
        'database.operation': 'SELECT',
        'database.table': 'web_crawl_tasks',
        'task.id': id,
      }
    );
  }
}
```

### Configuration Updates

#### 1. Enhanced OTEL Configuration

```typescript
// apps/task-manager/src/common/utils/otel-init.ts (Enhanced)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export const initOpenTelemetry = () => {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'task-manager',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
};
```

#### 2. Tracing Configuration

```typescript
// apps/task-manager/src/config/tracing.ts
export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  exportEndpoint: string;
  serviceName: string;
  environment: string;
  attributes: Record<string, string>;
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
};
```

### Integration Points

#### 1. Application Startup Integration

```typescript
// apps/task-manager/src/app.ts (Enhanced)
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

#### 2. Express Middleware Integration

```typescript
// apps/task-manager/src/api/rest/rest.router.ts (Enhanced)
import { traceMiddleware } from '../../common/utils/tracing/trace-middleware';

export function createRestRouter(): Router {
  const router = express.Router();

  // Add trace middleware
  router.use(traceMiddleware);

  // Existing routes...
  return router;
}
```

### Distributed Tracing Considerations

#### 1. Trace Context Propagation

The implementation supports both scenarios:

**Single-Service Tracing (Current)**: When no trace context is present in Kafka headers, the service creates new traces for each operation.

**Multi-Service Tracing (Future)**: When trace context is present in Kafka headers (from Gateway), the service creates child spans of the incoming trace, maintaining the distributed trace flow.

#### 2. W3C Trace Context Standard

The implementation follows the W3C Trace Context standard:

- **traceparent**: `00-<trace-id>-<span-id>-<trace-flags>`
- **tracestate**: Additional trace state information

#### 3. Future Gateway Integration

When the Gateway service implements OTEL support, it should:

1. Create the initial trace when receiving user requests
2. Inject trace context into Kafka message headers
3. Send messages to both task-history and task-execution topics
4. Task-Manager will automatically extract and continue the trace

### Testing Strategy

#### 1. Unit Tests

**File: `apps/task-manager/src/common/utils/tracing/__tests__/trace-manager.spec.ts`**

- Test span creation and management
- Test operation tracing with success/failure scenarios
- Test attribute handling and filtering
- Test distributed tracing with context

**File: `apps/task-manager/src/common/utils/tracing/__tests__/trace-context.spec.ts`**

- Test trace context extraction from Kafka headers
- Test trace context injection into Kafka headers
- Test W3C trace context parsing and formatting
- Test async context propagation
- Test correlation ID management

#### 2. Integration Tests

**File: `apps/task-manager/src/test-utils/trace-test-helper.ts`**

- Test end-to-end trace flow
- Test trace correlation across service boundaries
- Test trace export to OTEL collector

### Monitoring and Alerting

#### 1. Trace Metrics

- **Trace Success Rate**: Monitor percentage of successful traces
- **Trace Duration**: Track average and percentile trace durations
- **Trace Volume**: Monitor number of traces per minute
- **Error Rate**: Track traces with error status

#### 2. Business Metrics

- **Task Processing Time**: Track time from task creation to completion
- **Kafka Message Processing**: Monitor message processing latency
- **Database Query Performance**: Track query execution times
- **Service Dependencies**: Monitor external service call performance

### Deployment Considerations

#### 1. Environment Variables

```bash
# Tracing Configuration
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=1.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_SERVICE_NAME=task-manager
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=production
```

#### 2. Performance Impact

- **Sampling Rate**: Start with 100% sampling in development, adjust for production
- **Batch Processing**: Configure OTEL batch processor for optimal performance
- **Memory Usage**: Monitor trace buffer memory consumption
- **Network Overhead**: Monitor OTEL collector network traffic

### Success Metrics

#### 1. Technical Metrics

- **Trace Coverage**: >95% of business operations instrumented
- **Trace Latency**: <1ms overhead per traced operation
- **Trace Success Rate**: >99% successful trace exports
- **Memory Usage**: <50MB additional memory for tracing

#### 2. Business Metrics

- **Mean Time to Detection (MTTD)**: <5 minutes for performance issues
- **Mean Time to Resolution (MTTR)**: <30 minutes for root cause analysis
- **Service Availability**: >99.9% uptime maintained
- **Developer Productivity**: 50% reduction in debugging time

### Risk Mitigation

#### 1. Performance Risks

- **Mitigation**: Implement sampling strategies and performance monitoring
- **Fallback**: Graceful degradation when tracing is unavailable
- **Monitoring**: Real-time performance impact tracking

#### 2. Data Privacy Risks

- **Mitigation**: Implement attribute filtering and sensitive data masking
- **Compliance**: Ensure GDPR and data protection compliance
- **Audit**: Regular trace data audit and cleanup

#### 3. Infrastructure Risks

- **Mitigation**: Circuit breaker pattern for OTEL collector failures
- **Redundancy**: Multiple OTEL collector instances
- **Monitoring**: OTEL collector health and performance monitoring

### Implementation Timeline

#### Phase 1: Core Infrastructure (Week 1-2)

- Implement trace manager and context utilities
- Set up enhanced OTEL configuration
- Create trace middleware for Express

#### Phase 2: Business Logic Instrumentation (Week 3-4)

- Instrument task manager service
- Instrument Kafka message processing
- Instrument database operations

#### Phase 3: Testing and Validation (Week 5)

- Implement comprehensive test suite
- Performance testing and optimization
- Integration testing with observability stack

#### Phase 4: Deployment and Monitoring (Week 6)

- Production deployment with gradual rollout
- Monitoring and alerting setup
- Documentation and training

### Conclusion

This PRD provides a comprehensive plan for adding distributed tracing to the task-manager service. The implementation leverages existing OpenTelemetry infrastructure while adding business-specific instrumentation to provide deep visibility into application performance and behavior. The solution is designed to be performant, maintainable, and scalable, with proper error handling and monitoring throughout.

The implementation follows the existing architectural patterns and coding standards, ensuring consistency with the current codebase. The tracing solution will significantly improve observability and debugging capabilities, leading to faster issue resolution and better system understanding.

### File Structure Summary

```
apps/task-manager/
├── src/
│   ├── common/utils/tracing/
│   │   ├── trace-manager.ts
│   │   ├── trace-context.ts
│   │   ├── trace-attributes.ts
│   │   ├── trace-middleware.ts
│   │   └── __tests__/
│   │       ├── trace-manager.spec.ts
│   │       └── trace-context.spec.ts
│   ├── application/services/
│   │   └── traced-web-crawl-task-manager.ts
│   ├── api/kafka/
│   │   └── traced-kafka-api-manager.ts
│   ├── infrastructure/persistence/postgres/
│   │   └── traced-web-crawl-task-repository.ts
│   ├── config/
│   │   └── tracing.ts
│   ├── test-utils/
│   │   └── trace-test-helper.ts
│   └── common/utils/
│       └── otel-init.ts (enhanced)
└── jobs/prd-jobs-v9/
    └── PRD-9-DISTRIBUTED-TRACING.md
```

### Dependencies

The implementation will require the following OpenTelemetry packages (already installed):

- `@opentelemetry/api`
- `@opentelemetry/sdk-node`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/resources`
- `@opentelemetry/semantic-conventions`

### Next Steps

1. **Review and Approval**: Technical review of the PRD by the development team
2. **Implementation Planning**: Break down the implementation into detailed tasks
3. **Resource Allocation**: Assign developers to specific components
4. **Development**: Begin implementation following the phased approach
5. **Testing**: Comprehensive testing at each phase
6. **Deployment**: Gradual rollout with monitoring and validation
