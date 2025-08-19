# Job J4: Simplify Kafka Operations

**Status**: ⏳ Pending  
**Priority**: 🟡 Medium  
**Dependencies**: J1 (Enable Auto-Instrumentation)  
**Estimated Time**: 3-4 hours

## Summary
With kafkajs auto-instrumentation enabled, simplify Kafka consumer and producer code to focus on business logic and context propagation.

## Files to Modify
1. **`src/api/kafka/consumers/base-consumer.ts`**
2. **`src/api/kafka/handlers/base-handler.ts`**
3. **`src/infrastructure/messaging/kafka/publishers/web-crawl-request.publisher.ts`**

## Detailed Changes

### J4.1: Simplify Base Consumer
**File**: `src/api/kafka/consumers/base-consumer.ts`  
**Method**: `processMessageWithTrace()`  
**Changes**:
```typescript
import { context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

protected async processMessageWithTrace(message: any, handler: IHandler, baseLogger: ILogger = logger): Promise<void> {
  const propagator = new W3CTraceContextPropagator();
  
  // Extract W3C context from headers
  const carrier = { 
    traceparent: message.headers?.traceparent, 
    tracestate: message.headers?.tracestate 
  };
  const parentContext = propagator.extract(context.active(), carrier);
  
  // Execute with extracted context (kafkajs auto-instrumentation will create the span)
  await context.with(parentContext, async () => {
    // Log message received with trace context
    logger.info('Kafka message received', {
      topic: this.topic,
      key: message.key?.toString(),
      partition: message.partition,
      offset: message.offset
    });
    
    // Process message (auto-instrumentation creates consumer span)
    await handler.process(message);
    
    // Log success
    logger.info('Kafka message processed successfully', {
      topic: this.topic,
      key: message.key?.toString()
    });
  });
}
```

### J4.2: Simplify Base Handler
**File**: `src/api/kafka/handlers/base-handler.ts`  
**Method**: `traceKafkaMessage()`  
**Changes**:
```typescript
// Remove custom TraceManager usage, rely on auto-instrumentation
protected async traceKafkaMessage<T>(message: EachMessagePayload, operation: string, handlerOperation: () => Promise<T>): Promise<T> {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    // Add business-specific attributes to auto-created span
    activeSpan.setAttributes({
      'business.operation': operation,
      'business.handler': this.constructor.name
    });
  }
  
  return handlerOperation();
}
```

### J4.3: Simplify Kafka Publisher
**File**: `src/infrastructure/messaging/kafka/publishers/web-crawl-request.publisher.ts`  
**Method**: `publishWebCrawlRequest()`  
**Changes**:
```typescript
async publishWebCrawlRequest(task: WebCrawlTaskEntity): Promise<void> {
  // Create message (kafkajs auto-instrumentation will create producer span)
  const message = this.createWebCrawlRequestMessage(task);
  
  // Publish message (auto-instrumentation handles W3C header injection)
  await this.kafkaClient.send(this.topic, message);
  
  logger.info('Web crawl request published successfully', {
    taskId: task.id,
    topic: this.topic
  });
}
```

## Benefits
- **Automatic spans**: kafkajs auto-instrumentation creates producer/consumer spans
- **Automatic W3C propagation**: Headers are injected/extracted automatically
- **Simplified code**: Focus on business logic, not span management
- **Better performance**: Auto-instrumentation is optimized

## Tests
- [ ] Verify kafkajs auto-instrumentation creates spans
- [ ] Test W3C context propagation in Kafka messages
- [ ] Verify trace field propagation in logs
- [ ] Test producer and consumer span creation

## Checklist
- [ ] Simplify base consumer with context extraction
- [ ] Simplify base handler to use auto-instrumentation
- [ ] Simplify Kafka publisher
- [ ] Remove custom TraceManager usage
- [ ] Test W3C context propagation
- [ ] Verify auto-instrumentation spans
- [ ] Update status to ✅ Completed

## Notes
- This job depends on J1 (auto-instrumentation) for kafkajs spans
- Manual span creation is replaced with context activation
- kafkajs auto-instrumentation handles W3C header injection/extraction
- Business-specific attributes are added to auto-created spans
