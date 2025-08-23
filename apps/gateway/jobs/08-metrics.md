# Job 8: Infrastructure - Metrics

## Objective
Implement metrics collection adapter that tracks request counts, response times, and web crawl specific metrics using a simple local counter approach.

## Prerequisites
- Job 7: Kafka Publisher completed
- Application ports defined
- Metrics port interface available

## Inputs
- IMetricsPort interface
- Simple local storage requirements
- Performance monitoring needs

## Detailed Implementation Steps

### Step 1: Create Local Metrics Adapter
```typescript
// src/infrastructure/metrics/local-metrics.adapter.ts
export class LocalMetricsAdapter implements IMetricsPort {
  private webCrawlRequestCounter: number = 0;

  incrementRequestCounter(endpoint: string, method: string, statusCode: number): void {
    // Not implemented - keeping interface compatibility
  }

  recordRequestDuration(endpoint: string, method: string, duration: number): void {
    // Not implemented - keeping interface compatibility  
  }

  incrementWebCrawlRequestCounter(): void {
    this.webCrawlRequestCounter++;
    logger.info('Web crawl request counter incremented', {
      totalRequests: this.webCrawlRequestCounter,
    });
  }

  recordWebCrawlProcessingTime(duration: number): void {
    // Not implemented - keeping interface compatibility
  }

  getMetricsData(): string {
    return `gateway_web_crawl_requests_total ${this.webCrawlRequestCounter}`;
  }

  getWebCrawlRequestCount(): number {
    return this.webCrawlRequestCounter;
  }

  reset(): void {
    this.webCrawlRequestCounter = 0;
    logger.info('Metrics reset');
  }
}
```

### Step 2: Add Future Prometheus Support (Optional)
```typescript
// src/infrastructure/metrics/prometheus-metrics.adapter.ts
// For future implementation when needed
export class PrometheusMetricsAdapter implements IMetricsPort {
  // Implementation with actual Prometheus metrics
}
```

### Step 3: Create Metrics Factory
```typescript
// src/infrastructure/metrics/metrics.factory.ts
export class MetricsFactory {
  static createMetricsAdapter(type: 'local' | 'prometheus' = 'local'): IMetricsPort {
    switch (type) {
      case 'local':
        return new LocalMetricsAdapter();
      case 'prometheus':
        // return new PrometheusMetricsAdapter();
        throw new Error('Prometheus metrics not implemented yet');
      default:
        return new LocalMetricsAdapter();
    }
  }
}
```

### Step 4: Add Metrics Middleware
```typescript
// src/common/middleware/metrics.middleware.ts
export function createMetricsMiddleware(metrics: IMetricsPort) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      metrics.incrementRequestCounter(req.path, req.method, res.statusCode);
      metrics.recordRequestDuration(req.path, req.method, duration);
    });
    
    next();
  };
}
```

### Step 5: Create Index Export
```typescript
// src/infrastructure/metrics/index.ts
export * from './local-metrics.adapter';
export * from './metrics.factory';
```

## Outputs
- `src/infrastructure/metrics/local-metrics.adapter.ts`
- `src/infrastructure/metrics/metrics.factory.ts`
- `src/infrastructure/metrics/index.ts`
- `src/common/middleware/metrics.middleware.ts`
- Simple metrics collection system

## Testing Criteria

### Unit Tests
- [ ] Counter increments correctly
- [ ] Metrics reset functionality
- [ ] Data retrieval methods
- [ ] Thread safety (if applicable)
- [ ] Factory creation methods

### Integration Tests
- [ ] Metrics collection during requests
- [ ] Multiple concurrent requests
- [ ] Metrics persistence
- [ ] Memory usage monitoring

### Performance Tests
- [ ] Metrics operations < 1ms
- [ ] Low memory overhead
- [ ] No performance impact on requests
- [ ] Concurrent access handling

### Functional Tests
- [ ] Counter accuracy
- [ ] Reset functionality
- [ ] Data format correctness
- [ ] Logging integration

## Performance Requirements
- Metrics operations: < 1ms
- Memory overhead: < 5MB
- No request latency impact
- Thread-safe operations
- Efficient data retrieval

## Error Handling
- Invalid metrics operations → log warning
- Memory overflow → reset counters
- Concurrent access → use thread-safe operations
- Data retrieval errors → return default values

## Success Criteria
- [ ] Local metrics adapter implemented
- [ ] Counter functionality working
- [ ] Reset capability available
- [ ] Data retrieval methods work
- [ ] Integration with application services
- [ ] Performance requirements met
- [ ] Thread safety ensured
- [ ] Logging integration complete

## Rollback Plan
If implementation fails:
1. Remove metrics infrastructure files
2. Revert application service integration
3. Document performance issues
4. Simplify metrics approach

## Notes
- Keep implementation simple and fast
- Focus on web crawl request counting
- Avoid complex metrics frameworks for now
- Ensure thread safety for concurrent requests
- Log metrics for debugging
- Design for future Prometheus integration
- Minimize performance impact
- Consider memory usage carefully
