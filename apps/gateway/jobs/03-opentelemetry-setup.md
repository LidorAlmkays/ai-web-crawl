# Job 3: OpenTelemetry Setup

## Objective
Set up OpenTelemetry initialization and basic tracing infrastructure with trace context generation for the gateway service as the trace parent.

## Prerequisites
- Job 1 completed (utilities copied)
- Job 2 completed (configuration management)

## Inputs
- OpenTelemetry utilities from task-manager service
- Observability configuration from Job 2
- Gateway configuration requirements

## Detailed Implementation Steps

### Step 1: Create Trace Context Types

#### 1.1 Trace Context Type Definition
Create `apps/gateway/src/common/types/trace-context.type.ts`:

```typescript
/**
 * W3C Trace Context interface for propagating trace information
 * Follows the W3C Trace Context specification
 */
export interface TraceContext {
  /** W3C traceparent format: 00-<32hex>-<16hex>-<2hex> */
  traceparent: string;
  /** W3C tracestate format: key1=value1,key2=value2 */
  tracestate?: string;
}

/**
 * Extended trace context with additional metadata
 */
export interface ExtendedTraceContext extends TraceContext {
  /** Service name that generated the trace */
  serviceName: string;
  /** Operation name */
  operationName: string;
  /** Additional attributes */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Trace context extractor interface
 */
export interface TraceContextExtractor {
  extractTraceContext(): TraceContext;
}

/**
 * Trace context injector interface
 */
export interface TraceContextInjector {
  injectTraceContext(context: TraceContext, carrier: any): void;
}

/**
 * Trace context manager interface
 */
export interface TraceContextManager {
  createTraceContext(): TraceContext;
  extractTraceContext(carrier: any): TraceContext;
  injectTraceContext(context: TraceContext, carrier: any): void;
  getCurrentTraceContext(): TraceContext | null;
}
```

### Step 2: Create Trace Context Utilities

#### 2.1 Trace Context Utilities
Create `apps/gateway/src/common/utils/trace-context.utils.ts`:

```typescript
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { TraceContext, ExtendedTraceContext } from '../types/trace-context.type';
import { logger } from './logger';

/**
 * Utility class for managing trace context
 */
export class TraceContextUtils {
  private static readonly TRACEPARENT_REGEX = /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/;
  private static readonly TRACESTATE_REGEX = /^[a-z0-9_-]+=[a-z0-9_-]+(,[a-z0-9_-]+=[a-z0-9_-]+)*$/;

  /**
   * Create a new trace context for the gateway service
   * Gateway acts as the trace parent for all web crawl requests
   */
  public static createTraceContext(): TraceContext {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('gateway-root-span');
    
    const traceId = span.spanContext().traceId;
    const spanId = span.spanContext().spanId;
    const traceFlags = span.spanContext().traceFlags;
    
    const traceparent = `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
    
    span.end();
    
    logger.debug('Created new trace context', { traceparent });
    
    return { traceparent };
  }

  /**
   * Extract trace context from HTTP headers
   */
  public static extractFromHeaders(headers: Record<string, string>): TraceContext | null {
    const traceparent = headers['traceparent'] || headers['x-traceparent'];
    const tracestate = headers['tracestate'] || headers['x-tracestate'];
    
    if (!traceparent) {
      return null;
    }
    
    if (!this.isValidTraceparent(traceparent)) {
      logger.warn('Invalid traceparent format', { traceparent });
      return null;
    }
    
    if (tracestate && !this.isValidTracestate(tracestate)) {
      logger.warn('Invalid tracestate format', { tracestate });
      return null;
    }
    
    return { traceparent, tracestate };
  }

  /**
   * Inject trace context into HTTP headers
   */
  public static injectIntoHeaders(context: TraceContext, headers: Record<string, string>): void {
    headers['traceparent'] = context.traceparent;
    if (context.tracestate) {
      headers['tracestate'] = context.tracestate;
    }
  }

  /**
   * Inject trace context into Kafka headers
   */
  public static injectIntoKafkaHeaders(context: TraceContext, headers: Record<string, Buffer>): void {
    headers['traceparent'] = Buffer.from(context.traceparent);
    if (context.tracestate) {
      headers['tracestate'] = Buffer.from(context.tracestate);
    }
  }

  /**
   * Extract trace context from Kafka headers
   */
  public static extractFromKafkaHeaders(headers: Record<string, Buffer>): TraceContext | null {
    const traceparentBuffer = headers['traceparent'];
    const tracestateBuffer = headers['tracestate'];
    
    if (!traceparentBuffer) {
      return null;
    }
    
    const traceparent = traceparentBuffer.toString();
    const tracestate = tracestateBuffer ? tracestateBuffer.toString() : undefined;
    
    if (!this.isValidTraceparent(traceparent)) {
      logger.warn('Invalid traceparent format in Kafka headers', { traceparent });
      return null;
    }
    
    if (tracestate && !this.isValidTracestate(tracestate)) {
      logger.warn('Invalid tracestate format in Kafka headers', { tracestate });
      return null;
    }
    
    return { traceparent, tracestate };
  }

  /**
   * Validate traceparent format
   */
  private static isValidTraceparent(traceparent: string): boolean {
    return this.TRACEPARENT_REGEX.test(traceparent);
  }

  /**
   * Validate tracestate format
   */
  private static isValidTracestate(tracestate: string): boolean {
    return this.TRACESTATE_REGEX.test(tracestate);
  }

  /**
   * Get current active span context
   */
  public static getCurrentSpanContext(): any {
    return trace.getActiveSpan()?.spanContext();
  }

  /**
   * Create a child span with trace context
   */
  public static createChildSpan(name: string, attributes?: Record<string, any>): Span {
    const tracer = trace.getTracer('gateway-service');
    const parentSpan = trace.getActiveSpan();
    
    const span = tracer.startSpan(name, {
      attributes: {
        'service.name': 'gateway',
        'service.version': '1.0.0',
        ...attributes,
      },
    }, parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined);
    
    return span;
  }

  /**
   * Set span status and end it
   */
  public static endSpan(span: Span, status: SpanStatusCode, message?: string): void {
    span.setStatus({ code: status, message });
    span.end();
  }

  /**
   * Record exception in span
   */
  public static recordException(span: Span, error: Error): void {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
}
```

### Step 3: Create Trace Context Middleware

#### 3.1 Trace Context Middleware
Create `apps/gateway/src/common/middleware/trace-context.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { TraceContextUtils } from '../utils/trace-context.utils';
import { logger } from '../utils/logger';

/**
 * Middleware to handle trace context for HTTP requests
 */
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Extract trace context from headers or create new one
  let traceContext = TraceContextUtils.extractFromHeaders(req.headers);
  
  if (!traceContext) {
    // Gateway creates new trace context as the trace parent
    traceContext = TraceContextUtils.createTraceContext();
    logger.debug('Created new trace context for request', { 
      url: req.url, 
      method: req.method,
      traceparent: traceContext.traceparent 
    });
  } else {
    logger.debug('Extracted trace context from headers', { 
      url: req.url, 
      method: req.method,
      traceparent: traceContext.traceparent 
    });
  }

  // Create root span for this request
  const tracer = trace.getTracer('gateway-service');
  const span = tracer.startSpan('http-request', {
    attributes: {
      'service.name': 'gateway',
      'service.version': '1.0.0',
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.get('host'),
      'http.user_agent': req.get('user-agent'),
      'http.request_id': req.get('x-request-id'),
      'business.operation': 'http_request',
      'business.service': 'gateway',
    },
  });

  // Set trace context in request object for later use
  (req as any).traceContext = traceContext;
  (req as any).span = span;

  // Set active span for the request context
  const ctx = trace.setSpan(context.active(), span);
  (req as any).traceContext = ctx;

  // Add response headers
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'http.status_code': res.statusCode,
      'http.response_size': res.get('content-length'),
      'http.duration_ms': duration,
    });

    // Set span status based on HTTP status code
    if (res.statusCode >= 400) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: `HTTP ${res.statusCode}` 
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    // Add trace context to response headers
    TraceContextUtils.injectIntoHeaders(traceContext, res.getHeaders() as Record<string, string>);
    
    span.end();
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      traceparent: traceContext.traceparent,
    });
  });

  // Handle errors
  res.on('error', (error) => {
    TraceContextUtils.recordException(span, error);
    span.end();
  });

  next();
}

/**
 * Middleware to add request ID if not present
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.get('x-request-id') || generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Step 4: Update OpenTelemetry Initialization

#### 4.1 Enhanced OpenTelemetry Initialization
Update `apps/gateway/src/common/utils/otel-init.ts`:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { configuration } from '../../config';
import { logger } from './logger';

/**
 * Initialize OpenTelemetry for the gateway service
 */
export function initializeOpenTelemetry(): void {
  try {
    const config = configuration.getConfig();
    
    if (!config.observability.tracing.enabled) {
      logger.info('OpenTelemetry tracing is disabled');
      return;
    }

    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
      'service.type': 'gateway',
      'service.instance.id': `${config.serviceName}-${Date.now()}`,
    });

    // Create trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: config.observability.tracing.exporterEndpoint,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Create span processor
    const spanProcessor = new BatchSpanProcessor(traceExporter, {
      scheduledDelayMillis: 1000,
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
    });

    // Create SDK
    const sdk = new NodeSDK({
      resource,
      spanProcessor,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-express': {
            enabled: true,
            requestHook: (span, request) => {
              span.setAttribute('http.request.body', JSON.stringify(request.body));
            },
            responseHook: (span, response) => {
              span.setAttribute('http.response.body', JSON.stringify(response.body));
            },
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              span.setAttribute('http.request.headers', JSON.stringify(request.headers));
            },
            responseHook: (span, response) => {
              span.setAttribute('http.response.headers', JSON.stringify(response.headers));
            },
          },
          '@opentelemetry/instrumentation-kafkajs': {
            enabled: true,
            producerHook: (span, topic, message) => {
              span.setAttribute('messaging.kafka.topic', topic);
              span.setAttribute('messaging.kafka.message.key', message.key?.toString());
              span.setAttribute('messaging.kafka.message.headers', JSON.stringify(message.headers));
            },
            consumerHook: (span, topic, message) => {
              span.setAttribute('messaging.kafka.topic', topic);
              span.setAttribute('messaging.kafka.message.key', message.key?.toString());
              span.setAttribute('messaging.kafka.message.headers', JSON.stringify(message.headers));
            },
          },
        }),
      ],
    });

    // Initialize SDK
    sdk.start()
      .then(() => {
        logger.info('OpenTelemetry SDK started successfully', {
          service: config.serviceName,
          version: config.serviceVersion,
          environment: config.environment,
          exporterEndpoint: config.observability.tracing.exporterEndpoint,
          samplingRate: config.observability.tracing.samplingRate,
        });
      })
      .catch((error) => {
        logger.error('Failed to start OpenTelemetry SDK', { error });
        throw error;
      });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => {
          logger.info('OpenTelemetry SDK shutdown successfully');
        })
        .catch((error) => {
          logger.error('Error during OpenTelemetry SDK shutdown', { error });
        });
    });

  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error });
    throw error;
  }
}

/**
 * Check if OpenTelemetry is initialized
 */
export function isOpenTelemetryInitialized(): boolean {
  try {
    const sdk = require('@opentelemetry/sdk-node');
    return sdk.NodeSDK.isInitialized();
  } catch {
    return false;
  }
}

/**
 * Get current tracer
 */
export function getTracer(name: string = 'gateway-service') {
  const { trace } = require('@opentelemetry/api');
  return trace.getTracer(name);
}
```

### Step 5: Create Trace Context Manager

#### 5.1 Trace Context Manager Implementation
Create `apps/gateway/src/common/utils/trace-context-manager.ts`:

```typescript
import { trace, context, Span } from '@opentelemetry/api';
import { TraceContext, TraceContextManager } from '../types/trace-context.type';
import { TraceContextUtils } from './trace-context.utils';
import { logger } from './logger';

/**
 * Implementation of TraceContextManager
 */
export class GatewayTraceContextManager implements TraceContextManager {
  private static instance: GatewayTraceContextManager;

  private constructor() {}

  public static getInstance(): GatewayTraceContextManager {
    if (!GatewayTraceContextManager.instance) {
      GatewayTraceContextManager.instance = new GatewayTraceContextManager();
    }
    return GatewayTraceContextManager.instance;
  }

  /**
   * Create a new trace context for the gateway service
   */
  public createTraceContext(): TraceContext {
    return TraceContextUtils.createTraceContext();
  }

  /**
   * Extract trace context from carrier (headers, etc.)
   */
  public extractTraceContext(carrier: any): TraceContext {
    if (carrier.headers) {
      return TraceContextUtils.extractFromHeaders(carrier.headers) || this.createTraceContext();
    }
    return this.createTraceContext();
  }

  /**
   * Inject trace context into carrier (headers, etc.)
   */
  public injectTraceContext(context: TraceContext, carrier: any): void {
    if (carrier.headers) {
      TraceContextUtils.injectIntoHeaders(context, carrier.headers);
    }
  }

  /**
   * Get current trace context from active span
   */
  public getCurrentTraceContext(): TraceContext | null {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return null;
    }

    const spanContext = activeSpan.spanContext();
    const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
    
    return { traceparent };
  }

  /**
   * Create a span with trace context
   */
  public createSpan(name: string, attributes?: Record<string, any>): Span {
    return TraceContextUtils.createChildSpan(name, attributes);
  }

  /**
   * End a span with status
   */
  public endSpan(span: Span, success: boolean = true, error?: Error): void {
    if (error) {
      TraceContextUtils.recordException(span, error);
    } else {
      const status = success ? 'ok' : 'error';
      span.setStatus({ code: success ? 1 : 2, message: status });
    }
    span.end();
  }
}

// Export singleton instance
export const traceContextManager = GatewayTraceContextManager.getInstance();
```

## Outputs

### Files Created
- `apps/gateway/src/common/types/trace-context.type.ts` - Trace context type definitions
- `apps/gateway/src/common/utils/trace-context.utils.ts` - Trace context utility functions
- `apps/gateway/src/common/middleware/trace-context.middleware.ts` - HTTP trace context middleware
- `apps/gateway/src/common/utils/trace-context-manager.ts` - Trace context manager implementation

### Files Modified
- `apps/gateway/src/common/utils/otel-init.ts` - Enhanced OpenTelemetry initialization

## Detailed Testing Criteria

### 1. Trace Context Creation
- [ ] **New Trace Context Generation**:
  - [ ] Creates valid W3C traceparent format
  - [ ] Generates unique trace IDs for each request
  - [ ] Includes proper span IDs and trace flags
  - [ ] Logs trace context creation

- [ ] **Trace Context Validation**:
  - [ ] Validates traceparent format (00-32hex-16hex-2hex)
  - [ ] Validates tracestate format (key=value pairs)
  - [ ] Handles invalid formats gracefully
  - [ ] Logs validation errors

### 2. HTTP Middleware Testing
- [ ] **Request Processing**:
  - [ ] Extracts trace context from incoming headers
  - [ ] Creates new trace context when none provided
  - [ ] Creates root span for each HTTP request
  - [ ] Sets proper span attributes

- [ ] **Response Processing**:
  - [ ] Injects trace context into response headers
  - [ ] Records HTTP status codes
  - [ ] Measures request duration
  - [ ] Sets span status based on response

- [ ] **Error Handling**:
  - [ ] Records exceptions in spans
  - [ ] Sets error status on spans
  - [ ] Logs errors with trace context
  - [ ] Graceful handling of middleware errors

### 3. Kafka Integration Testing
- [ ] **Header Injection**:
  - [ ] Injects trace context into Kafka headers
  - [ ] Converts trace context to Buffer format
  - [ ] Handles missing tracestate gracefully
  - [ ] Validates header format

- [ ] **Header Extraction**:
  - [ ] Extracts trace context from Kafka headers
  - [ ] Converts Buffer format to string
  - [ ] Validates extracted trace context
  - [ ] Handles missing headers gracefully

### 4. OpenTelemetry Initialization
- [ ] **SDK Initialization**:
  - [ ] Initializes NodeSDK successfully
  - [ ] Configures resource attributes correctly
  - [ ] Sets up span processor
  - [ ] Configures instrumentations

- [ ] **Configuration Integration**:
  - [ ] Uses configuration from Job 2
  - [ ] Respects tracing enabled/disabled setting
  - [ ] Uses correct exporter endpoint
  - [ ] Applies sampling rate correctly

- [ ] **Graceful Shutdown**:
  - [ ] Handles SIGTERM signal
  - [ ] Shuts down SDK gracefully
  - [ ] Logs shutdown events
  - [ ] Handles shutdown errors

### 5. Span Management
- [ ] **Span Creation**:
  - [ ] Creates child spans correctly
  - [ ] Sets proper span attributes
  - [ ] Maintains parent-child relationships
  - [ ] Uses correct tracer name

- [ ] **Span Lifecycle**:
  - [ ] Starts spans at correct time
  - [ ] Ends spans properly
  - [ ] Sets span status correctly
  - [ ] Records exceptions properly

### 6. Performance Testing
- [ ] **Middleware Performance**:
  - [ ] Middleware adds < 5ms overhead
  - [ ] No memory leaks in span creation
  - [ ] Efficient trace context extraction
  - [ ] Fast header injection

- [ ] **SDK Performance**:
  - [ ] SDK initialization completes in < 2 seconds
  - [ ] No blocking operations during initialization
  - [ ] Efficient span processing
  - [ ] Low memory overhead

### 7. Integration Testing
- [ ] **Logger Integration**:
  - [ ] Trace context included in log entries
  - [ ] Proper log levels for trace events
  - [ ] Error logging with trace context
  - [ ] Performance logging

- [ ] **Configuration Integration**:
  - [ ] Uses observability configuration
  - [ ] Respects environment settings
  - [ ] Handles configuration changes
  - [ ] Validates configuration values

### 8. Error Handling
- [ ] **Invalid Input Handling**:
  - [ ] Handles malformed traceparent
  - [ ] Handles malformed tracestate
  - [ ] Graceful degradation on errors
  - [ ] Clear error messages

- [ ] **System Error Handling**:
  - [ ] Handles OpenTelemetry SDK errors
  - [ ] Handles middleware errors
  - [ ] Handles configuration errors
  - [ ] Proper error propagation

## Performance Requirements
- [ ] Trace context creation completes in < 1ms
- [ ] Middleware overhead is < 5ms per request
- [ ] SDK initialization completes in < 2 seconds
- [ ] No memory leaks in span management

## Error Handling Requirements
- [ ] Graceful handling of invalid trace context
- [ ] Clear error messages for debugging
- [ ] Proper error logging with trace context
- [ ] Fallback behavior when tracing fails

## Security Requirements
- [ ] No sensitive information in trace attributes
- [ ] Proper sanitization of trace context
- [ ] Secure handling of trace headers
- [ ] No information leakage in error messages

## Documentation Requirements
- [ ] All functions are documented with JSDoc
- [ ] Usage examples provided
- [ ] Configuration options documented
- [ ] Troubleshooting guide included

## Rollback Plan
If this job fails:
1. Disable OpenTelemetry initialization
2. Remove trace context middleware
3. Document what failed and why
4. Create issue for investigation

## Success Criteria
- [ ] All trace context utilities work correctly
- [ ] HTTP middleware functions properly
- [ ] OpenTelemetry SDK initializes successfully
- [ ] Trace context propagation works
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] No TypeScript compilation errors

## Estimated Time
**Total**: 2-3 hours
- Trace context types and utilities: 1 hour
- HTTP middleware: 45 minutes
- OpenTelemetry initialization: 45 minutes
- Testing and documentation: 30 minutes

## Dependencies for Next Job
This job must be completed before:
- Job 10: API Handlers (needs trace context management)
- Job 7: Infrastructure - Kafka Publisher (needs trace context injection)
- All subsequent jobs (need tracing infrastructure)
