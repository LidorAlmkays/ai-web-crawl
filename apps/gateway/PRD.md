# Gateway Service Refactor - Product Requirements Document (PRD)

## Executive Summary

This PRD outlines the complete refactor of the Gateway Service to implement a clean, scalable architecture that serves as the primary entry point for frontend-backend communication. The service will follow the same clean architecture patterns as the task-manager service, with proper separation of concerns, dependency injection, and observability.

## Problem Statement

The current gateway service lacks proper architectural structure and needs to be refactored to:
- Support multiple communication protocols (REST, WebSocket, Socket.IO) through a unified API layer
- Implement proper DTO validation and error handling
- Provide comprehensive observability with OpenTelemetry tracing
- Follow clean architecture principles for maintainability and testability
- Support easy protocol switching between services (Kafka ↔ REST)

## High-Level Architecture Overview

The Gateway Service will implement a **Hexagonal Architecture (Ports & Adapters)** pattern with the following layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   REST API  │  │ WebSocket   │  │  Socket.IO  │            │
│  │   Router    │  │   Router    │  │   Router    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Web Crawl Request Service                      │ │
│  │  - DTO Validation                                          │ │
│  │  - Business Logic Orchestration                            │ │
│  │  - Trace Context Management                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Kafka     │  │   REST      │  │   gRPC      │            │
│  │ Publisher   │  │   Client    │  │   Client    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Core Requirements

### 1. REST API Endpoint for Web Crawl Requests

**Endpoint**: `POST /api/web-crawl`

**Request DTO**:
```typescript
export class WebCrawlRequestDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  userEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  query: string;

  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  originalUrl: string;
}
```

**Response DTO**:
```typescript
export class WebCrawlResponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  status: string;
}
```

**Example Success Response**:
```json
{
  "message": "Web crawl task received successfully",
  "status": "accepted"
}
```

**Example Error Response**:
```json
{
  "message": "Invalid email format provided",
  "status": "error"
}
```

### 2. Kafka Message Structure

The service must publish to the "task-status" topic with the following structure:

**Header DTO** (following task-manager pattern):
```typescript
export class WebCrawlNewTaskHeaderDto extends BaseTaskHeaderDto {
  // Inherits from BaseTaskHeaderDto:
  // - task_type: TaskType.WEB_CRAWL
  // - status: TaskStatus.NEW
  // - timestamp: ISO date string
  // - traceparent: W3C trace context (REQUIRED - gateway creates this)
  // - tracestate: W3C trace state (REQUIRED - gateway creates this)
}
```

**Message DTO** (following task-manager pattern):
```typescript
export class WebCrawlNewTaskMessageDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  user_email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query: string;

  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  base_url: string;
}
```

### 3. OpenTelemetry Integration

- **Trace ID Generation**: The API layer MUST generate new trace IDs for each request (gateway is the trace parent)
- **Span Management**: Create spans for each layer (API → Application → Infrastructure)
- **Context Propagation**: Propagate trace context through Kafka headers (REQUIRED)
- **Trace Parent Role**: Gateway acts as the root trace parent for all web crawl requests
- **Metrics**: Track request count and response times
- **Logging**: Structured logging with trace context

### 4. Ports & Adapters Architecture

**Inbound Ports**:
```typescript
export interface IWebCrawlRequestPort {
  submitWebCrawlRequest(
    userEmail: string,
    query: string,
    originalUrl: string
  ): Promise<{ message: string; status: string }>;
}
```

**Outbound Ports**:
```typescript
export interface IWebCrawlTaskPublisherPort {
  publishNewTask(
    taskId: string,
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<void>;
}

export interface IMetricsPort {
  incrementRequestCount(): void;
  recordResponseTime(duration: number): void;
}
```

## Technical Specifications

### 1. Project Structure

```
apps/gateway/
├── src/
│   ├── api/
│   │   ├── rest/
│   │   │   ├── dtos/
│   │   │   │   ├── web-crawl-request.dto.ts
│   │   │   │   └── web-crawl-response.dto.ts
│   │   │   ├── handlers/
│   │   │   │   └── web-crawl.handler.ts
│   │   │   └── rest.router.ts
│   │   └── websocket/ (future)
│   ├── application/
│   │   ├── ports/
│   │   │   ├── web-crawl-request.port.ts
│   │   │   ├── web-crawl-task-publisher.port.ts
│   │   │   └── metrics.port.ts
│   │   └── services/
│   │       ├── web-crawl-request.service.ts
│   │       └── application.factory.ts
│   ├── common/
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── validation.ts
│   │   │   └── otel-init.ts
│   │   ├── types/
│   │   │   └── trace-context.type.ts
│   │   └── middleware/
│   │       └── trace-context.middleware.ts
│   ├── config/
│   │   ├── index.ts
│   │   ├── kafka.ts
│   │   ├── observability.ts
│   │   └── server.ts
│   ├── domain/
│   │   └── entities/
│   │       └── web-crawl-request.entity.ts
│   ├── infrastructure/
│   │   ├── messaging/
│   │   │   └── kafka/
│   │   │       ├── web-crawl-task.publisher.ts
│   │   │       └── kafka.factory.ts
│   │   └── metrics/
│   │       └── prometheus-metrics.adapter.ts
│   ├── app.ts
│   └── server.ts
```

### 2. Dependencies

**Note**: This service will use existing packages from the Nx workspace root `package.json`. No new dependencies need to be installed.

**Core Dependencies** (already available in workspace):
```json
{
  "express": "^4.21.2",
  "class-validator": "^0.14.2", 
  "class-transformer": "^0.5.1",
  "kafkajs": "^2.2.4",
  "uuid": "^11.1.0"
}
```

**Observability Dependencies** (already available in workspace):
```json
{
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-node": "^0.203.0",
  "@opentelemetry/auto-instrumentations-node": "^0.62.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.203.0",
  "@opentelemetry/resources": "^2.0.1",
  "@opentelemetry/semantic-conventions": "^1.36.0"
}
```

**Development Dependencies** (already available in workspace):
```json
{
  "@types/express": "^4.17.21",
  "@types/uuid": "^10.0.0",
  "jest": "^30.0.2",
  "supertest": "^7.1.4",
  "@nx/node": "21.3.7"
}
```

**Reusable Utilities** (from task-manager service):
- Logger utility (`common/utils/logger.ts`)
- Validation utility (`common/utils/validation.ts`)
- OpenTelemetry initialization (`common/utils/otel-init.ts`)
- Configuration patterns (`config/` directory)
- DTO validation patterns (`api/kafka/dtos/`)
- Clean architecture patterns (ports, services, adapters)

### 3. Configuration

**Environment Variables**:
```bash
# Application
NODE_ENV=development
APP_NAME=gateway
APP_VERSION=1.0.0
APP_PORT=3002

# Health check configuration
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=3003
HEALTH_CHECK_PATH=/health

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=gateway-service
KAFKA_TOPIC_TASK_STATUS=task-status

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=1.0

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9465
```

### 4. Key Implementation Details

#### Trace Context Type Definition

```typescript
// common/types/trace-context.type.ts
export interface TraceContext {
  traceparent: string;  // W3C traceparent format: 00-<32hex>-<16hex>-<2hex>
  tracestate?: string;  // W3C tracestate format: key1=value1,key2=value2
}

export interface TraceContextExtractor {
  extractTraceContext(): TraceContext;
}
```

#### A. Trace Context Management

```typescript
// API Layer - Generate new trace for each request (Gateway as Trace Parent)
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class WebCrawlHandler {
  async handleRequest(req: Request, res: Response): Promise<void> {
    const tracer = trace.getTracer('gateway-service');
    
    // Create root span for this request (Gateway is the trace parent)
    const span = tracer.startSpan('web-crawl-request', {
      attributes: {
        'service.name': 'gateway',
        'operation.type': 'http_request',
        'http.method': req.method,
        'http.url': req.url,
        'business.operation': 'web_crawl_request'
      }
    });
    
    // Set this span as the active span for the entire request lifecycle
    const ctx = trace.setSpan(context.active(), span);
    
    try {
      // Process request within the trace context
      const result = await context.with(ctx, async () => {
        return await this.webCrawlService.submitRequest(
          req.body.userEmail,
          req.body.query,
          req.body.originalUrl
        );
      });
      
      span.setAttributes({
        'business.user_email': req.body.userEmail,
        'business.status': result.status,
        'business.task_received': true
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

#### B. Kafka Publisher with Trace Context

```typescript
import { trace, context } from '@opentelemetry/api';

export class KafkaWebCrawlTaskPublisher implements IWebCrawlTaskPublisherPort {
  async publishNewTask(
    taskId: string,
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<void> {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('kafka-publish-task', {
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': 'task-status',
        'messaging.operation': 'send',
        'business.task_id': taskId
      }
    });

    try {
      const headers: Record<string, Buffer> = {
        task_type: Buffer.from('WEB_CRAWL'),
        status: Buffer.from('NEW'),
        timestamp: Buffer.from(new Date().toISOString()),
        // ALWAYS include trace context (Gateway is the trace parent)
        traceparent: Buffer.from(traceContext.traceparent),
        tracestate: Buffer.from(traceContext.tracestate || '')
      };

      await this.producer.send({
        topic: 'task-status',
        messages: [{
          key: taskId,
          headers,
          value: JSON.stringify({
            user_email: userEmail,
            user_query: query,
            base_url: originalUrl
          })
        }]
      });

      span.setAttributes({
        'messaging.message_id': taskId,
        'business.user_email': userEmail,
        'business.task_published': true
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

#### C. Metrics Collection

```typescript
export class PrometheusMetricsAdapter implements IMetricsPort {
  private requestCounter: Counter;
  private responseTimeHistogram: Histogram;

  constructor() {
    this.requestCounter = new Counter({
      name: 'gateway_requests_total',
      help: 'Total number of requests to the gateway service',
      labelNames: ['method', 'endpoint', 'status']
    });

    this.responseTimeHistogram = new Histogram({
      name: 'gateway_response_time_seconds',
      help: 'Response time in seconds',
      labelNames: ['method', 'endpoint']
    });
  }

  incrementRequestCount(method: string, endpoint: string, status: string): void {
    this.requestCounter.inc({ method, endpoint, status });
  }

  recordResponseTime(method: string, endpoint: string, duration: number): void {
    this.responseTimeHistogram.observe({ method, endpoint }, duration);
  }
}
```

### 5. Router Implementation

```typescript
export function createRestRouter(
  webCrawlHandler: WebCrawlHandler,
  metricsAdapter: IMetricsPort
): Router {
  const router = Router();

  // Add trace context middleware
  router.use(traceContextMiddleware);

  // Web crawl endpoint
  router.post('/web-crawl', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      await webCrawlHandler.handleRequest(req, res);
      
      metricsAdapter.incrementRequestCount('POST', '/web-crawl', '200');
    } catch (error) {
      metricsAdapter.incrementRequestCount('POST', '/web-crawl', '500');
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      metricsAdapter.recordResponseTime('POST', '/web-crawl', duration);
    }
  });

  return router;
}
```

## Implementation Phases

### Phase 0: Cleanup Existing Gateway (Week 0)
- [ ] **Document current functionality** - Document existing features and endpoints for reference
- [ ] **Remove existing gateway files** - Clean up current gateway implementation (git history preserved)
- [ ] **Preserve configuration** - Keep any existing environment configurations
- [ ] **Update documentation** - Remove references to old gateway architecture

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up project structure and dependencies
- [ ] Implement OpenTelemetry initialization
- [ ] Create configuration management
- [ ] Set up Kafka client factory

### Phase 2: Domain & Application Layer (Week 2)
- [ ] Create domain entities
- [ ] Implement application ports
- [ ] Create application services
- [ ] Set up dependency injection factory

### Phase 3: Infrastructure Layer (Week 3)
- [ ] Implement Kafka publisher adapter
- [ ] Create metrics adapter
- [ ] Set up health check services

### Phase 4: API Layer (Week 4)
- [ ] Create DTOs with validation
- [ ] Implement REST handlers
- [ ] Set up router with middleware
- [ ] Add comprehensive error handling

### Phase 5: Testing & Documentation (Week 5)
- [ ] Write unit tests for all layers
- [ ] Create integration tests
- [ ] Add API documentation
- [ ] Performance testing

## Success Criteria

1. **Architecture Compliance**: Service follows clean architecture principles with proper layer separation
2. **Protocol Flexibility**: Easy to switch between Kafka and REST communication with task-manager
3. **Observability**: Complete trace context propagation and metrics collection
4. **Validation**: Comprehensive DTO validation with proper error responses
5. **Testability**: High test coverage with proper mocking and isolation
6. **Performance**: Sub-100ms response times for web crawl requests
7. **Reliability**: 99.9% uptime with proper error handling and recovery

## Future Extensibility

The architecture supports future enhancements:
- **WebSocket Support**: Add WebSocket router and handlers
- **Socket.IO Support**: Add Socket.IO router and handlers
- **gRPC Support**: Add gRPC server and handlers
- **Rate Limiting**: Add rate limiting middleware
- **Authentication**: Add authentication middleware
- **Caching**: Add Redis caching layer
- **Load Balancing**: Support for horizontal scaling

## Risk Mitigation

1. **Kafka Connection Issues**: Implement retry logic and circuit breaker pattern
2. **High Load**: Add request queuing and backpressure handling
3. **Trace Context Loss**: Implement fallback trace generation
4. **DTO Validation Failures**: Provide detailed error messages and logging
5. **Metrics Collection Overhead**: Use batch processing and sampling

## Cleanup Strategy

### Phase 0: Existing Gateway Cleanup

#### 1. Git-Based Backup Strategy
```bash
# Current gateway is already preserved in git history
# No manual backup needed - git provides full version control

# Optional: Create a tag for the current state before cleanup
git tag gateway-v1.0.0-before-refactor
git push origin gateway-v1.0.0-before-refactor
```

#### 2. Files to Remove
```
apps/gateway/src/
├── api/
│   ├── kafka/           # Remove - will be replaced with new structure
│   └── websocket/       # Remove - will be replaced with new structure
├── application/
│   ├── ports/           # Remove - will be replaced with new ports
│   └── services/        # Remove - will be replaced with new services
├── common/
│   ├── clients/         # Remove - will be replaced with new clients
│   ├── interfaces/      # Remove - will be replaced with new interfaces
│   ├── types/           # Remove - will be replaced with new types
│   └── utils/           # Remove - will be replaced with new utils
├── config/              # Remove - will be replaced with new config
├── domain/              # Remove - will be replaced with new domain
├── infrastructure/      # Remove - will be replaced with new infrastructure
├── app.ts               # Remove - will be replaced with new app.ts
└── server.ts            # Remove - will be replaced with new server.ts
```

#### 3. Files to Preserve
```
apps/gateway/
├── package.json         # Keep - update with new dependencies
├── tsconfig.json        # Keep - update if needed
├── jest.config.ts       # Keep - update if needed
├── README.md            # Keep - update with new architecture
└── docs/                # Keep - update with new documentation
```

#### 4. Environment Configuration
- **Preserve**: Any existing `.env` files or environment configurations
- **Document**: Current environment variables and their purposes
- **Migrate**: Relevant configurations to new structure

#### 5. Dependencies to Review
- **Remove**: Unused dependencies from `package.json`
- **Keep**: Dependencies that will be reused in new implementation
- **Update**: Dependencies to match workspace versions

#### 6. Documentation Updates
- **Update**: `README.md` with new architecture
- **Remove**: References to old gateway patterns
- **Add**: New implementation guidelines
- **Preserve**: Any useful architectural decisions or learnings

### Cleanup Checklist

- [ ] **Git Tag Creation**
  - [ ] Create git tag for current gateway state
  - [ ] Push tag to remote repository
  - [ ] Document tag name for future reference

- [ ] **Current State Documentation**
  - [ ] Document existing endpoints and functionality
  - [ ] Document current architecture patterns
  - [ ] Document any useful utilities or patterns to preserve

- [ ] **File Cleanup**
  - [ ] Remove old source files
  - [ ] Preserve configuration files
  - [ ] Update package.json dependencies
  - [ ] Clean up unused dependencies

- [ ] **Documentation Updates**
  - [ ] Update README.md
  - [ ] Remove old architecture references
  - [ ] Add new implementation guidelines

- [ ] **Configuration Migration**
  - [ ] Preserve environment configurations
  - [ ] Document current environment variables
  - [ ] Plan migration to new configuration structure

## Implementation Notes

### DTO Validation Rules
- Follow the established DTO validation patterns from the task-manager service
- Use class-validator decorators for all validation
- Always export both the class and a type alias
- Include comprehensive JSDoc comments

### Logging Strategy
- Use the application's custom logger instead of console.log
- Send logs to OpenTelemetry collector at info level
- Include trace context in all log entries
- Avoid printing metrics logs

### Package Management
- **NO NEW PACKAGES**: Use only existing packages from the workspace root `package.json`
- Leverage existing utilities from task-manager service where possible
- Use Nx workspace conventions for dependency management
- Reuse existing configuration patterns and utilities

### Code Reuse Strategy
- Copy and adapt logger utility from `apps/task-manager/src/common/utils/logger.ts`
- Copy and adapt validation utility from `apps/task-manager/src/common/utils/validation.ts`
- Copy and adapt OpenTelemetry initialization from `apps/task-manager/src/common/utils/otel-init.ts`
- Reuse DTO patterns from `apps/task-manager/src/api/kafka/dtos/`
- Follow the same clean architecture structure as task-manager

This PRD provides a comprehensive blueprint for refactoring the gateway service into a clean, scalable, and observable architecture that can serve as the foundation for future communication protocol additions.
