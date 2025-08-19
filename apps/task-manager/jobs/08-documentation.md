# Job J8: Documentation & Examples

**Status**: ⏳ Pending  
**Priority**: 🟢 Low  
**Dependencies**: J6 (Business Attributes), J7 (Console Debugging)  
**Estimated Time**: 2-3 hours

## Summary
Create documentation and examples for the new tracing and logging features.

## Files to Create
1. **`docs/tracing-and-logging.md`** (NEW)

## Detailed Changes

### J8.1: Create Documentation
**File**: `docs/tracing-and-logging.md` (NEW)  
**Content**:
```markdown
# Tracing and Logging Guide

## Overview
This document describes how to use the enhanced tracing and logging features in the task-manager service.

## Automatic Trace Context
All application logs automatically include trace context when an OTEL span is active:
- `trace.traceId`: The current trace identifier
- `trace.spanId`: The current span identifier  
- `trace.parentSpanId`: The parent span identifier (if available)
- `trace.traceState`: The trace state (if available)

## Auto-Instrumentation
The following auto-instrumentation is enabled:
- **Express**: Automatic HTTP request spans with method, path, status code
- **KafkaJS**: Automatic producer/consumer spans with topic, partition, offset
- **PostgreSQL**: Automatic database query spans with SQL statements

## Adding Business Attributes to Auto-Created Spans
```typescript
import { trace } from '@opentelemetry/api';

const activeSpan = trace.getActiveSpan();
if (activeSpan) {
  activeSpan.setAttributes({
    'business.operation': 'task-creation',
    'business.user.id': userId
  });
  
  activeSpan.addEvent('business.task.created', { taskId, status });
}
```

## Best Practices
1. Let auto-instrumentation handle common spans (HTTP, Kafka, DB)
2. Add business-specific attributes and events to spans
3. Use meaningful attribute names with business context
4. Add events for key business milestones
```

## Benefits
- **User guidance**: Clear documentation for developers
- **Best practices**: Established patterns for tracing and logging
- **Examples**: Practical code examples for common use cases
- **Reference**: Complete guide for OTEL integration

## Tests
- [ ] Review documentation for accuracy
- [ ] Test code examples
- [ ] Verify best practices
- [ ] Check formatting and links

## Checklist
- [ ] Create documentation file
- [ ] Add overview and context sections
- [ ] Include auto-instrumentation details
- [ ] Add code examples
- [ ] Document best practices
- [ ] Review and test examples
- [ ] Update status to ✅ Completed

## Notes
- This job depends on J6 and J7 for complete feature set
- Documentation should be clear and practical
- Code examples should be tested and working
- Best practices should follow OTEL standards
