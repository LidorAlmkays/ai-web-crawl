# Job J6: Business-Specific Span Attributes

**Status**: ✅ Completed  
**Priority**: 🟢 Low  
**Dependencies**: J3 (Simplify HTTP Middleware), J4 (Simplify Kafka Operations)  
**Estimated Time**: 4-5 hours

## Summary
Add business-specific attributes and events to auto-created spans for better observability.

## Files to Modify
1. **`src/api/kafka/handlers/task-status/*.ts`**
2. **`src/application/services/web-crawl-task-manager.service.ts`**
3. **`src/application/metrics/services/WebCrawlMetricsService.ts`**

## Detailed Changes

### J6.1: Add Business Attributes to Kafka Handlers
**Files**: All files in `src/api/kafka/handlers/task-status/`  
**Changes**:
```typescript
// In each handler, add business attributes to auto-created spans
const activeSpan = trace.getActiveSpan();
if (activeSpan) {
  activeSpan.setAttributes({
    'business.task.status': status,
    'business.task.type': 'web-crawl',
    'business.handler.name': handlerName,
    'business.task.id': taskId,
    'business.user.email': userEmail
  });
  
  // Add business events
  activeSpan.addEvent('business.task.processing.started', { taskId, status });
  activeSpan.addEvent('business.task.processing.completed', { taskId, status });
}
```

### J6.2: Add Business Events to Services
**File**: `src/application/services/web-crawl-task-manager.service.ts`  
**Changes**:
```typescript
// Add business events to auto-created spans
const activeSpan = trace.getActiveSpan();
if (activeSpan) {
  activeSpan.addEvent('business.task.created', { taskId: task.id, userEmail: task.userEmail });
  activeSpan.addEvent('business.task.updated', { taskId: task.id, status: task.status });
}
```

## Benefits
- **Business context**: Spans include business-specific attributes
- **Event tracking**: Key business events are recorded
- **Simplified**: No manual span creation, just attribute/event addition
- **Observability**: Better insights into business operations

## Tests
- [x] Add unit tests for business attributes and events
- [x] Verify event data structure
- [x] Test span attribute setting
- [x] Test business event recording

## Checklist
- [x] Add business attributes to Kafka handlers
- [x] Add business events to services
- [x] Add business attributes to metrics service
- [x] Test business attribute setting
- [x] Test business event recording
- [x] Verify span observability
- [x] Update status to ✅ Completed

## Notes
- This job depends on J3 and J4 for auto-instrumentation spans
- Business attributes provide context for filtering and analysis
- Business events track key milestones in operations
- All attributes and events use consistent naming conventions
- **Successfully migrated from TraceManager to OTEL-based approach**
