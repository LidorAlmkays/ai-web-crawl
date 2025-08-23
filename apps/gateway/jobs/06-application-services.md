# Job 6: Application Services

## Objective
Implement application layer services that contain the core business logic, orchestrate domain entities, and coordinate with infrastructure through ports.

## Prerequisites
- Job 5: Application Ports completed
- All ports defined and documented
- Domain entities available

## Inputs
- Application ports (interfaces)
- Domain entities
- Business logic requirements
- Dependency injection patterns

## Detailed Implementation Steps

### Step 1: Create Web Crawl Request Service
```typescript
// src/application/services/web-crawl-request.service.ts
export class WebCrawlRequestService implements IWebCrawlRequestPort {
  constructor(
    private readonly taskPublisher: IWebCrawlTaskPublisherPort,
    private readonly metrics: IMetricsPort
  ) {}

  async submitWebCrawlRequest(
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<{ message: string; status: string }> {
    // Implementation with business logic
  }
}
```

### Step 2: Create Application Factory
```typescript
// src/application/services/application.factory.ts
export class ApplicationFactory {
  private static instance: ApplicationFactory;

  static getInstance(): ApplicationFactory {
    if (!ApplicationFactory.instance) {
      ApplicationFactory.instance = new ApplicationFactory();
    }
    return ApplicationFactory.instance;
  }

  createWebCrawlRequestService(
    taskPublisher: IWebCrawlTaskPublisherPort,
    metrics: IMetricsPort
  ): IWebCrawlRequestPort {
    return new WebCrawlRequestService(taskPublisher, metrics);
  }
}
```

### Step 3: Implement Business Logic
- Create domain entity
- Validate business rules
- Publish task to external system
- Record metrics
- Handle errors appropriately
- Manage trace context

### Step 4: Add OpenTelemetry Integration
- Create spans for business operations
- Add business-relevant attributes
- Propagate trace context
- Record exceptions properly

### Step 5: Create Index Export
```typescript
// src/application/services/index.ts
export * from './web-crawl-request.service';
export * from './application.factory';
```

## Outputs
- `src/application/services/web-crawl-request.service.ts`
- `src/application/services/application.factory.ts`
- `src/application/services/index.ts`
- Complete business logic implementation
- Dependency injection setup

## Testing Criteria

### Unit Tests
- [ ] Service creation with dependencies
- [ ] Business logic execution
- [ ] Error handling scenarios
- [ ] Metrics recording
- [ ] Domain entity interactions
- [ ] Trace context management

### Integration Tests
- [ ] Service with mock adapters
- [ ] End-to-end request flow
- [ ] Error propagation
- [ ] Dependency injection
- [ ] Trace context propagation

### Business Logic Tests
- [ ] Valid request processing
- [ ] Invalid email handling
- [ ] Invalid URL handling
- [ ] Empty query handling
- [ ] Duplicate request handling
- [ ] Concurrent request handling

### Performance Tests
- [ ] Request processing time < 50ms
- [ ] Memory usage is stable
- [ ] No memory leaks
- [ ] Concurrent request handling
- [ ] High-throughput scenarios

## Performance Requirements
- Request processing: < 50ms (excluding external calls)
- Memory usage: < 10MB per service instance
- Concurrent requests: Support 100+ simultaneous
- CPU usage: < 50% under normal load

## Error Handling
- ValidationError → 400 Bad Request
- BusinessLogicError → 422 Unprocessable Entity
- ExternalServiceError → 503 Service Unavailable
- UnknownError → 500 Internal Server Error

## Success Criteria
- [ ] All services implemented correctly
- [ ] Business logic is complete
- [ ] Error handling is comprehensive
- [ ] Performance requirements met
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Dependency injection works
- [ ] Trace context is managed properly
- [ ] Metrics are recorded correctly

## Rollback Plan
If implementation fails:
1. Remove all service files
2. Revert factory changes
3. Document business logic issues
4. Fix dependency injection problems

## Notes
- Keep business logic in application layer
- Use dependency injection for all external dependencies
- Maintain trace context throughout request flow
- Record metrics for monitoring
- Handle all error scenarios gracefully
- Follow established patterns from task-manager
- Ensure services are easily testable
