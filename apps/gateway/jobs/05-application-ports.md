# Job 5: Application Ports

## Objective
Define application layer ports (interfaces) that establish type-safe contracts between the application layer and infrastructure adapters, following clean architecture principles.

## Prerequisites
- Job 4: Domain Entities completed
- Domain entities properly implemented
- TypeScript configuration working

## Inputs
- Domain entities
- Business requirements
- Clean architecture patterns from task-manager

## Detailed Implementation Steps

### Step 1: Create Web Crawl Request Port
```typescript
// src/application/ports/web-crawl-request.port.ts
export interface IWebCrawlRequestPort {
  submitWebCrawlRequest(
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<{ message: string; status: string }>;
}
```

### Step 2: Create Task Publisher Port
```typescript
// src/application/ports/web-crawl-task-publisher.port.ts
export interface IWebCrawlTaskPublisherPort {
  publishNewTask(
    taskId: string,
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<void>;
}
```

### Step 3: Create Metrics Port
```typescript
// src/application/ports/metrics.port.ts
export interface IMetricsPort {
  incrementRequestCounter(endpoint: string, method: string, statusCode: number): void;
  recordRequestDuration(endpoint: string, method: string, duration: number): void;
  incrementWebCrawlRequestCounter(): void;
  recordWebCrawlProcessingTime(duration: number): void;
}
```

### Step 4: Create Repository Port (Future)
```typescript
// src/application/ports/web-crawl-repository.port.ts
export interface IWebCrawlRepositoryPort {
  save(request: WebCrawlRequest): Promise<void>;
  findById(id: string): Promise<WebCrawlRequest | null>;
  findByUserEmail(userEmail: string): Promise<WebCrawlRequest[]>;
  updateStatus(id: string, status: WebCrawlRequestStatus): Promise<void>;
}
```

### Step 5: Create Index Export
```typescript
// src/application/ports/index.ts
export * from './web-crawl-request.port';
export * from './web-crawl-task-publisher.port';
export * from './metrics.port';
export * from './web-crawl-repository.port';
```

## Outputs
- `src/application/ports/web-crawl-request.port.ts`
- `src/application/ports/web-crawl-task-publisher.port.ts`
- `src/application/ports/metrics.port.ts`
- `src/application/ports/web-crawl-repository.port.ts`
- `src/application/ports/index.ts`
- Clear contracts for infrastructure adapters

## Testing Criteria

### Interface Design Tests
- [ ] All ports follow naming conventions
- [ ] Method signatures are type-safe
- [ ] Return types are appropriate
- [ ] Parameters include all necessary data
- [ ] Trace context is properly included
- [ ] Error handling is defined in contracts

### Architecture Tests
- [ ] Ports don't depend on infrastructure
- [ ] Ports only use domain types
- [ ] Ports follow single responsibility principle
- [ ] Ports are easily testable via mocks
- [ ] Ports support dependency injection

### Documentation Tests
- [ ] All methods have clear JSDoc comments
- [ ] Parameter types are documented
- [ ] Return types are documented
- [ ] Error conditions are documented
- [ ] Usage examples are provided

## Performance Requirements
- Interface definition: No runtime impact
- Type checking: < 5ms compilation time
- Documentation generation: < 2s

## Error Handling
- Ports should define expected error types
- Clear contracts for error conditions
- Consistent error handling patterns
- Proper async/await error propagation

## Success Criteria
- [ ] All port interfaces created
- [ ] Clear separation between layers
- [ ] Type safety maintained
- [ ] Dependency injection ready
- [ ] Documentation complete
- [ ] Follows clean architecture principles
- [ ] Compatible with existing task-manager patterns
- [ ] No circular dependencies

## Rollback Plan
If implementation fails:
1. Remove all port files
2. Revert any imports in other files
3. Document interface design issues
4. Redesign problematic contracts

## Notes
- Ports should be abstract interfaces only
- No implementation details in ports
- Use dependency inversion principle
- Keep interfaces focused and cohesive
- Consider future extensibility needs
- Follow established patterns from task-manager
