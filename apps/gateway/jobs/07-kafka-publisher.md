# Job 7: Infrastructure - Kafka Publisher

## Objective
Implement Kafka publisher adapter that publishes web crawl tasks to the "task-status" topic with proper trace context propagation, error handling, and retry logic.

## Prerequisites
- Job 6: Application Services completed
- Application ports defined
- Kafka configuration available
- OpenTelemetry setup working

## Inputs
- IWebCrawlTaskPublisherPort interface
- Kafka configuration
- Task-manager Kafka DTO patterns
- Trace context utilities

## Detailed Implementation Steps

### Step 1: Create Kafka Factory
```typescript
// src/infrastructure/messaging/kafka/kafka.factory.ts
export class KafkaFactory {
  private static instance: KafkaFactory;
  private kafka: Kafka;
  private producer: Producer | null = null;

  static getInstance(): KafkaFactory {
    if (!KafkaFactory.instance) {
      KafkaFactory.instance = new KafkaFactory();
    }
    return KafkaFactory.instance;
  }

  getKafka(): Kafka { /* Implementation */ }
  async getProducer(): Promise<Producer> { /* Implementation */ }
  createConsumer(groupId: string): Consumer { /* Implementation */ }
  async disconnect(): Promise<void> { /* Implementation */ }
}
```

### Step 2: Create Web Crawl Task Publisher
```typescript
// src/infrastructure/messaging/kafka/web-crawl-task.publisher.ts
export class KafkaWebCrawlTaskPublisher implements IWebCrawlTaskPublisherPort {
  constructor(private readonly kafkaFactory: KafkaFactory) {}

  async publishNewTask(
    taskId: string,
    userEmail: string,
    query: string,
    originalUrl: string,
    traceContext: TraceContext
  ): Promise<void> {
    // Implementation with trace context
  }
}
```

### Step 3: Implement Message Structure
Follow task-manager patterns:
```typescript
// Message Headers
{
  'traceparent': Buffer.from(traceContext.traceparent),
  'tracestate': Buffer.from(traceContext.tracestate || ''),
  'task-type': Buffer.from('web-crawl'),
  'source-service': Buffer.from('gateway'),
  'timestamp': Buffer.from(new Date().toISOString())
}

// Message Value
{
  taskId: string,
  userEmail: string,
  query: string,
  originalUrl: string,
  timestamp: string,
  status: 'new'
}
```

### Step 4: Add Error Handling & Retry
- Connection retry logic
- Message publishing retry
- Circuit breaker pattern
- Dead letter queue handling

### Step 5: Add OpenTelemetry Integration
- Create spans for Kafka operations
- Add messaging attributes
- Propagate trace context in headers
- Record exceptions

### Step 6: Create Index Export
```typescript
// src/infrastructure/messaging/kafka/index.ts
export * from './kafka.factory';
export * from './web-crawl-task.publisher';
```

## Outputs
- `src/infrastructure/messaging/kafka/kafka.factory.ts`
- `src/infrastructure/messaging/kafka/web-crawl-task.publisher.ts`
- `src/infrastructure/messaging/kafka/index.ts`
- Robust Kafka messaging implementation
- Trace context propagation

## Testing Criteria

### Unit Tests
- [ ] Publisher creation and configuration
- [ ] Message formatting and headers
- [ ] Trace context injection
- [ ] Error handling scenarios
- [ ] Factory singleton pattern
- [ ] Connection management

### Integration Tests
- [ ] Actual Kafka message publishing
- [ ] Message consumption verification
- [ ] Trace context propagation end-to-end
- [ ] Error recovery scenarios
- [ ] Performance under load

### Kafka-Specific Tests
- [ ] Message structure matches task-manager
- [ ] Headers include all required fields
- [ ] Message key is set correctly
- [ ] Topic routing works
- [ ] Partitioning is appropriate

### Performance Tests
- [ ] Message publishing < 10ms
- [ ] High-throughput scenarios (1000+ msg/sec)
- [ ] Memory usage is stable
- [ ] Connection pooling efficiency
- [ ] Retry logic performance

## Performance Requirements
- Message publishing: < 10ms average
- Throughput: > 1000 messages/second
- Memory usage: < 50MB for factory
- Connection recovery: < 5 seconds
- Retry attempts: 3 with exponential backoff

## Error Handling
- Connection failures → retry with backoff
- Publishing failures → retry and log
- Invalid configuration → fail fast
- Topic not found → create or fail
- Authentication failures → fail fast

## Success Criteria
- [ ] Publisher implementation complete
- [ ] Kafka factory working correctly
- [ ] Messages published successfully
- [ ] Trace context propagated properly
- [ ] Error handling comprehensive
- [ ] Performance requirements met
- [ ] Integration tests pass
- [ ] Compatible with task-manager patterns
- [ ] Proper resource cleanup

## Rollback Plan
If implementation fails:
1. Remove all Kafka infrastructure files
2. Revert application service dependencies
3. Document connection/publishing issues
4. Fix configuration problems

## Notes
- Follow task-manager message patterns exactly
- Ensure trace context propagation works
- Implement proper connection management
- Add comprehensive error handling
- Use singleton pattern for factory
- Ensure graceful shutdown
- Monitor message publishing success
- Consider message ordering requirements
