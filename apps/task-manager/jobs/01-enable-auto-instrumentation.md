# Job J1: Enable Auto-Instrumentation

**Status**: ⏳ Pending  
**Priority**: 🔴 Critical  
**Dependencies**: None  
**Estimated Time**: 2-3 hours

## Summary
Enable express, kafkajs, and pg auto-instrumentation to automatically create spans for HTTP requests, Kafka operations, and database queries. This will significantly simplify our implementation and provide more detailed traces.

## Files to Modify
1. **`src/common/utils/otel-init.ts`**

## Detailed Changes

### J1.1: Enable Auto-Instrumentation
**File**: `src/common/utils/otel-init.ts`  
**Method**: `initOpenTelemetry()`  
**Changes**:
```typescript
// Remove the disabled instrumentations and enable them with proper configuration
const sdk = new NodeSDK({
  resource,
  spanProcessors: [spanProcessor],
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable express auto-instrumentation with configuration
      '@opentelemetry/instrumentation-express': {
        enabled: true,
        requestHook: (span, request) => {
          // Add custom attributes to HTTP spans
          span.setAttributes({
            'http.request_id': request.headers['x-request-id'],
            'http.user_agent': request.headers['user-agent'],
            'http.client_ip': request.ip
          });
        },
        responseHook: (span, response) => {
          // Add response attributes
          span.setAttributes({
            'http.response_size': response.get('content-length'),
            'http.status_code': response.statusCode
          });
        }
      },
      // Enable kafkajs auto-instrumentation with configuration
      '@opentelemetry/instrumentation-kafkajs': {
        enabled: true,
        producerHook: (span, topic, message) => {
          // Add custom attributes to producer spans
          span.setAttributes({
            'kafka.message.key': message.key?.toString(),
            'kafka.message.size': message.value?.length || 0,
            'kafka.topic': topic
          });
        },
        consumerHook: (span, topic, message) => {
          // Add custom attributes to consumer spans
          span.setAttributes({
            'kafka.message.key': message.key?.toString(),
            'kafka.message.size': message.value?.length || 0,
            'kafka.topic': topic,
            'kafka.partition': message.partition,
            'kafka.offset': message.offset
          });
        }
      },
      // Enable pg auto-instrumentation with configuration
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
        queryHook: (span, query) => {
          // Add custom attributes to database spans
          span.setAttributes({
            'db.statement': query.text,
            'db.parameters': JSON.stringify(query.values || []),
            'db.operation': query.text.trim().split(' ')[0].toUpperCase()
          });
        }
      }
    }),
  ],
});
```

## Benefits
- **Automatic HTTP spans**: Every Express request creates a SERVER span with method, path, status code
- **Automatic Kafka spans**: Every producer/consumer operation creates appropriate spans
- **Automatic DB spans**: Every PostgreSQL query creates a span with SQL statement
- **W3C context propagation**: Automatic trace context injection/extraction in Kafka headers
- **Reduced manual code**: No need to manually create spans for common operations

## Tests
- [ ] Verify auto-instrumentation is enabled
- [ ] Test that HTTP requests create spans automatically
- [ ] Test that Kafka operations create spans automatically
- [ ] Test that database queries create spans automatically

## Checklist
- [ ] Remove disabled instrumentation configuration
- [ ] Enable express auto-instrumentation with hooks
- [ ] Enable kafkajs auto-instrumentation with hooks
- [ ] Enable pg auto-instrumentation with hooks
- [ ] Test auto-instrumentation functionality
- [ ] Update status to ✅ Completed

## Notes
- This is the foundation job - all other jobs depend on this
- Auto-instrumentation will provide automatic spans for common operations
- Custom hooks add business-specific attributes to auto-created spans
- W3C trace context propagation is handled automatically by kafkajs instrumentation
