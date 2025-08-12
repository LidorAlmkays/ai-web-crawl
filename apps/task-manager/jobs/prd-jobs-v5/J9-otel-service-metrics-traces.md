# Job 9: OTEL Service for Metrics and Traces

## Overview

This job creates an OTEL service that handles metrics and traces, sending them to the OTEL collector and exposing endpoints for metrics. This is a secondary priority to the main logging work but provides the observability infrastructure needed for the OTEL logger.

## Objectives

1. **Create OTEL Service**: Implement a service that manages OTEL metrics and traces
2. **Metrics Collection**: Collect and expose application metrics
3. **Trace Generation**: Generate traces for key operations
4. **Collector Integration**: Send data to OTEL collector
5. **Metrics Endpoints**: Expose metrics endpoints for monitoring

## Current State Analysis

### Existing Infrastructure

- OTEL collector is already configured in docker-compose
- Basic OTEL configuration exists
- No dedicated OTEL service for metrics and traces

### Required Components

- OTEL SDK initialization
- Metrics collection and export
- Trace generation and export
- Metrics endpoint exposure
- Integration with existing application

## Implementation Details

### 1. OTEL Service Structure

Create a dedicated OTEL service that manages all observability:

```typescript
// src/common/otel/otel.service.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { metrics, trace } from '@opentelemetry/api';

export class OtelService {
  private sdk: NodeSDK;
  private meter: any;
  private tracer: any;

  constructor() {
    this.initializeOtel();
  }

  private initializeOtel(): void {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'task-manager',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    });

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      }),
      metricExporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
      }),
    });

    // Start SDK
    this.sdk.start();

    // Initialize meter and tracer
    this.meter = metrics.getMeter('task-manager');
    this.tracer = trace.getTracer('task-manager');
  }

  // Metrics methods
  createCounter(name: string, description?: string) {
    return this.meter.createCounter(name, {
      description: description || name,
    });
  }

  createHistogram(name: string, description?: string) {
    return this.meter.createHistogram(name, {
      description: description || name,
    });
  }

  createGauge(name: string, description?: string) {
    return this.meter.createUpDownCounter(name, {
      description: description || name,
    });
  }

  // Tracing methods
  startSpan(name: string, options?: any) {
    return this.tracer.startSpan(name, options);
  }

  // Shutdown method
  async shutdown(): Promise<void> {
    await this.sdk.shutdown();
  }
}
```

### 2. Application Metrics

Define key metrics for the task manager:

```typescript
// src/common/otel/metrics.ts
import { OtelService } from './otel.service';

export class TaskManagerMetrics {
  private otelService: OtelService;

  // Counters
  private taskCreatedCounter: any;
  private taskCompletedCounter: any;
  private taskFailedCounter: any;
  private kafkaMessageReceivedCounter: any;
  private kafkaMessageProcessedCounter: any;
  private validationErrorCounter: any;

  // Histograms
  private taskProcessingTimeHistogram: any;
  private kafkaMessageProcessingTimeHistogram: any;

  // Gauges
  private activeTasksGauge: any;
  private kafkaConsumerHealthGauge: any;

  constructor(otelService: OtelService) {
    this.otelService = otelService;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Initialize counters
    this.taskCreatedCounter = this.otelService.createCounter('task_created_total', 'Total number of tasks created');
    this.taskCompletedCounter = this.otelService.createCounter('task_completed_total', 'Total number of tasks completed');
    this.taskFailedCounter = this.otelService.createCounter('task_failed_total', 'Total number of tasks failed');
    this.kafkaMessageReceivedCounter = this.otelService.createCounter('kafka_message_received_total', 'Total number of Kafka messages received');
    this.kafkaMessageProcessedCounter = this.otelService.createCounter('kafka_message_processed_total', 'Total number of Kafka messages processed');
    this.validationErrorCounter = this.otelService.createCounter('validation_error_total', 'Total number of validation errors');

    // Initialize histograms
    this.taskProcessingTimeHistogram = this.otelService.createHistogram('task_processing_duration_seconds', 'Task processing duration in seconds');
    this.kafkaMessageProcessingTimeHistogram = this.otelService.createHistogram('kafka_message_processing_duration_seconds', 'Kafka message processing duration in seconds');

    // Initialize gauges
    this.activeTasksGauge = this.otelService.createGauge('active_tasks', 'Number of currently active tasks');
    this.kafkaConsumerHealthGauge = this.otelService.createGauge('kafka_consumer_health', 'Kafka consumer health status (1 = healthy, 0 = unhealthy)');
  }

  // Counter methods
  incrementTaskCreated(taskType?: string): void {
    this.taskCreatedCounter.add(1, { task_type: taskType || 'unknown' });
  }

  incrementTaskCompleted(taskType?: string): void {
    this.taskCompletedCounter.add(1, { task_type: taskType || 'unknown' });
  }

  incrementTaskFailed(taskType?: string, errorType?: string): void {
    this.taskFailedCounter.add(1, {
      task_type: taskType || 'unknown',
      error_type: errorType || 'unknown',
    });
  }

  incrementKafkaMessageReceived(eventType?: string): void {
    this.kafkaMessageReceivedCounter.add(1, { event_type: eventType || 'unknown' });
  }

  incrementKafkaMessageProcessed(eventType?: string): void {
    this.kafkaMessageProcessedCounter.add(1, { event_type: eventType || 'unknown' });
  }

  incrementValidationError(dtoType?: string): void {
    this.validationErrorCounter.add(1, { dto_type: dtoType || 'unknown' });
  }

  // Histogram methods
  recordTaskProcessingTime(durationMs: number, taskType?: string): void {
    this.taskProcessingTimeHistogram.record(durationMs / 1000, {
      task_type: taskType || 'unknown',
    });
  }

  recordKafkaMessageProcessingTime(durationMs: number, eventType?: string): void {
    this.kafkaMessageProcessingTimeHistogram.record(durationMs / 1000, {
      event_type: eventType || 'unknown',
    });
  }

  // Gauge methods
  setActiveTasks(count: number): void {
    this.activeTasksGauge.add(count);
  }

  setKafkaConsumerHealth(isHealthy: boolean): void {
    this.kafkaConsumerHealthGauge.add(isHealthy ? 1 : 0);
  }
}
```

### 3. Application Tracing

Define tracing for key operations:

```typescript
// src/common/otel/tracing.ts
import { OtelService } from './otel.service';

export class TaskManagerTracing {
  private otelService: OtelService;

  constructor(otelService: OtelService) {
    this.otelService = otelService;
  }

  // Task-related tracing
  traceTaskCreation(taskId: string, taskType: string) {
    return this.otelService.startSpan('task.creation', {
      attributes: {
        'task.id': taskId,
        'task.type': taskType,
      },
    });
  }

  traceTaskProcessing(taskId: string, taskType: string) {
    return this.otelService.startSpan('task.processing', {
      attributes: {
        'task.id': taskId,
        'task.type': taskType,
      },
    });
  }

  traceTaskCompletion(taskId: string, taskType: string) {
    return this.otelService.startSpan('task.completion', {
      attributes: {
        'task.id': taskId,
        'task.type': taskType,
      },
    });
  }

  // Kafka-related tracing
  traceKafkaMessageProcessing(messageId: string, eventType: string) {
    return this.otelService.startSpan('kafka.message.processing', {
      attributes: {
        'message.id': messageId,
        'event.type': eventType,
      },
    });
  }

  traceKafkaConsumerOperation(operation: string) {
    return this.otelService.startSpan('kafka.consumer.operation', {
      attributes: {
        operation: operation,
      },
    });
  }

  // Database-related tracing
  traceDatabaseOperation(operation: string, table?: string) {
    return this.otelService.startSpan('database.operation', {
      attributes: {
        operation: operation,
        table: table || 'unknown',
      },
    });
  }
}
```

### 4. Metrics Endpoints

Create REST endpoints to expose metrics:

```typescript
// src/api/rest/metrics.router.ts
import { Router } from 'express';
import { metrics } from '@opentelemetry/api';

export function createMetricsRouter(): Router {
  const router = Router();

  // Prometheus metrics endpoint
  router.get('/metrics', async (req, res) => {
    try {
      // Get metrics from OTEL
      const meterProvider = metrics.getMeterProvider();
      const resourceMetrics = await meterProvider.forceFlush();

      // Convert to Prometheus format
      const prometheusMetrics = convertToPrometheusFormat(resourceMetrics);

      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Custom metrics endpoint
  router.get('/custom-metrics', (req, res) => {
    // Return custom application metrics
    res.json({
      activeTasks: getActiveTasksCount(),
      kafkaConsumerHealth: getKafkaConsumerHealth(),
      lastTaskProcessed: getLastTaskProcessedTime(),
    });
  });

  return router;
}

function convertToPrometheusFormat(resourceMetrics: any): string {
  // Implementation to convert OTEL metrics to Prometheus format
  // This is a simplified version - in production, use a proper converter
  let prometheusMetrics = '';

  // Add basic metrics
  prometheusMetrics += '# HELP task_created_total Total number of tasks created\n';
  prometheusMetrics += '# TYPE task_created_total counter\n';
  prometheusMetrics += `task_created_total ${getTaskCreatedCount()}\n\n`;

  prometheusMetrics += '# HELP active_tasks Number of currently active tasks\n';
  prometheusMetrics += '# TYPE active_tasks gauge\n';
  prometheusMetrics += `active_tasks ${getActiveTasksCount()}\n\n`;

  return prometheusMetrics;
}

// Helper functions (implement based on your metrics storage)
function getActiveTasksCount(): number {
  // Implementation to get active tasks count
  return 0;
}

function getKafkaConsumerHealth(): boolean {
  // Implementation to get Kafka consumer health
  return true;
}

function getLastTaskProcessedTime(): string {
  // Implementation to get last task processed time
  return new Date().toISOString();
}

function getTaskCreatedCount(): number {
  // Implementation to get task created count
  return 0;
}
```

### 5. Integration with Application

Integrate OTEL service with the main application:

```typescript
// src/app.ts (updated)
import { OtelService } from './common/otel/otel.service';
import { TaskManagerMetrics } from './common/otel/metrics';
import { TaskManagerTracing } from './common/otel/tracing';

export class TaskManagerApp {
  private otelService: OtelService;
  private metrics: TaskManagerMetrics;
  private tracing: TaskManagerTracing;

  constructor() {
    // Initialize OTEL service
    this.otelService = new OtelService();
    this.metrics = new TaskManagerMetrics(this.otelService);
    this.tracing = new TaskManagerTracing(this.otelService);
  }

  async start(): Promise<void> {
    // Start application with OTEL integration
    this.metrics.setKafkaConsumerHealth(true);

    // ... existing startup logic
  }

  async stop(): Promise<void> {
    // Stop OTEL service
    await this.otelService.shutdown();

    // ... existing shutdown logic
  }

  // Expose metrics and tracing for use in other parts of the application
  getMetrics(): TaskManagerMetrics {
    return this.metrics;
  }

  getTracing(): TaskManagerTracing {
    return this.tracing;
  }
}
```

### 6. Integration with Kafka Handlers

Update Kafka handlers to use metrics and tracing:

```typescript
// src/api/kafka/handlers/base-handler.ts (updated)
import { getLogger } from '../../../../common/utils/logger-factory';

export abstract class BaseHandler {
  protected logger = getLogger();

  async handleMessage(message: any, context?: any): Promise<void> {
    const startTime = Date.now();
    const eventType = this.extractEventType(message);

    // Record metrics
    if (context?.metrics) {
      context.metrics.incrementKafkaMessageReceived(eventType);
    }

    // Start trace
    let span: any;
    if (context?.tracing) {
      span = context.tracing.traceKafkaMessageProcessing(message.key || 'unknown', eventType);
    }

    try {
      await this.processMessage(message);

      // Record success metrics
      if (context?.metrics) {
        context.metrics.incrementKafkaMessageProcessed(eventType);
        context.metrics.recordKafkaMessageProcessingTime(Date.now() - startTime, eventType);
      }
    } catch (error) {
      // Record error metrics
      if (context?.metrics) {
        context.metrics.incrementValidationError(this.constructor.name);
      }
      throw error;
    } finally {
      if (span) {
        span.end();
      }
    }
  }

  protected abstract processMessage(message: any): Promise<void>;
}
```

## Files to Create/Modify

### 1. New Files

- `src/common/otel/otel.service.ts` - Main OTEL service
- `src/common/otel/metrics.ts` - Metrics collection
- `src/common/otel/tracing.ts` - Tracing utilities
- `src/api/rest/metrics.router.ts` - Metrics endpoints

### 2. Modified Files

- `src/app.ts` - Integrate OTEL service
- `src/api/kafka/handlers/base-handler.ts` - Add metrics and tracing
- `src/api/rest/rest.router.ts` - Add metrics routes

### 3. Package.json Updates

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.48.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.48.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.48.0",
    "@opentelemetry/resources": "^1.21.0",
    "@opentelemetry/semantic-conventions": "^1.21.0"
  }
}
```

## Testing Strategy

### 1. OTEL Service Testing

```typescript
describe('OtelService', () => {
  let otelService: OtelService;

  beforeEach(() => {
    otelService = new OtelService();
  });

  afterEach(async () => {
    await otelService.shutdown();
  });

  it('should initialize successfully', () => {
    expect(otelService).toBeDefined();
  });

  it('should create metrics and traces', () => {
    const counter = otelService.createCounter('test_counter');
    const span = otelService.startSpan('test_span');

    expect(counter).toBeDefined();
    expect(span).toBeDefined();
  });
});
```

### 2. Metrics Testing

```typescript
describe('TaskManagerMetrics', () => {
  let metrics: TaskManagerMetrics;
  let otelService: OtelService;

  beforeEach(() => {
    otelService = new OtelService();
    metrics = new TaskManagerMetrics(otelService);
  });

  it('should increment task created counter', () => {
    expect(() => {
      metrics.incrementTaskCreated('web-crawl');
    }).not.toThrow();
  });

  it('should record task processing time', () => {
    expect(() => {
      metrics.recordTaskProcessingTime(1000, 'web-crawl');
    }).not.toThrow();
  });
});
```

### 3. Endpoints Testing

```typescript
describe('Metrics Router', () => {
  let router: Router;

  beforeEach(() => {
    router = createMetricsRouter();
  });

  it('should expose /metrics endpoint', async () => {
    const response = await request(router).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
  });

  it('should expose /health endpoint', async () => {
    const response = await request(router).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
```

## Success Criteria

1. **OTEL Service**: Successfully initializes and manages metrics/traces
2. **Metrics Collection**: Collects application metrics correctly
3. **Trace Generation**: Generates traces for key operations
4. **Collector Integration**: Sends data to OTEL collector
5. **Metrics Endpoints**: Exposes metrics endpoints for monitoring
6. **Integration**: Works seamlessly with existing application
7. **Performance**: No significant performance impact

## Environment Variables

```bash
# OTEL Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=task-manager
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=service.name=task-manager,service.version=1.0.0
```

## Dependencies

- `@opentelemetry/api`: Core OTEL API
- `@opentelemetry/sdk-node`: Node.js SDK
- `@opentelemetry/exporter-trace-otlp-http`: Trace exporter
- `@opentelemetry/exporter-metrics-otlp-http`: Metrics exporter
- `@opentelemetry/resources`: Resource management
- `@opentelemetry/semantic-conventions`: Semantic conventions

## Notes

- This is a secondary priority to the main logging work
- OTEL service provides the infrastructure for the OTEL logger
- Metrics and traces are sent to the existing OTEL collector
- Endpoints provide monitoring capabilities
- Integration is designed to be non-intrusive to existing code
- All metrics and traces include appropriate labels and attributes



