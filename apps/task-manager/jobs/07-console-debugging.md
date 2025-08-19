# Job J7: Console Span Debugging

**Status**: ⏳ Pending  
**Priority**: 🟢 Low  
**Dependencies**: J5 (DTO Validation)  
**Estimated Time**: 2-3 hours

## Summary
Add development utility to print span details similar to OTEL examples.

## Files to Create/Modify
1. **`src/common/utils/tracing/span-debug.ts`** (NEW)
2. **`src/common/utils/otel-init.ts`**

## Detailed Changes

### J7.1: Create Span Debug Utility
**File**: `src/common/utils/tracing/span-debug.ts` (NEW)  
**Content**:
```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

export class SpanDebugger {
  static enable() {
    if (process.env.NODE_ENV === 'production') return;
    
    const tracer = trace.getTracer('task-manager');
    
    // Listen for span end events
    tracer.on('spanEnd', (span) => {
      const spanCtx = span.spanContext();
      const parentSpanId = (span as any)?.parentSpanId || 
                          span.links?.[0]?.context?.spanId;
      
      console.log(JSON.stringify({
        resource: {
          attributes: {
            'service.name': 'task-manager',
            'service.version': process.env.npm_package_version || '1.0.0'
          }
        },
        traceId: spanCtx.traceId,
        parentId: parentSpanId,
        traceState: spanCtx.traceState?.serialize(),
        name: span.name,
        id: spanCtx.spanId,
        kind: span.kind,
        timestamp: span.startTime[0] * 1000000 + span.startTime[1] / 1000,
        duration: (span.endTime[0] - span.startTime[0]) * 1000000 + 
                 (span.endTime[1] - span.startTime[1]) / 1000,
        attributes: span.attributes,
        status: { code: span.status.code },
        events: span.events,
        links: span.links
      }, null, 2));
    });
  }
}
```

### J7.2: Wire into OTEL Initialization
**File**: `src/common/utils/otel-init.ts`  
**Changes**:
```typescript
import { SpanDebugger } from './tracing/span-debug';

export const initOpenTelemetry = () => {
  // ... existing initialization code ...
  
  // Enable span debugging in development
  if (process.env.NODE_ENV !== 'production') {
    SpanDebugger.enable();
  }
};
```

## Benefits
- **Development debugging**: Console output shows span details
- **OTEL format**: Output matches OTEL examples
- **Environment aware**: Only enabled in development
- **Complete span info**: Shows all span attributes and events

## Tests
- [ ] Smoke test in development environment
- [ ] Verify span details output format
- [ ] Test span debugger in production (should be disabled)
- [ ] Test span event listening

## Checklist
- [ ] Create span debug utility
- [ ] Add span end event listener
- [ ] Format span output to match OTEL examples
- [ ] Wire into OTEL initialization
- [ ] Test in development environment
- [ ] Verify production environment (disabled)
- [ ] Update status to ✅ Completed

## Notes
- This job depends on J5 (DTO validation) for trace context
- Span debugger only runs in development environment
- Output format matches OTEL documentation examples
- Provides complete span information for debugging
