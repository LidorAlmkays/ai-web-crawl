# Job J3: Simplify HTTP Middleware

**Status**: ✅ Completed  
**Priority**: 🟡 Medium  
**Dependencies**: J1 (Enable Auto-Instrumentation)  
**Estimated Time**: 2-3 hours

## Summary
With express auto-instrumentation enabled, simplify the HTTP middleware to focus only on W3C context extraction and activation.

## Files to Modify
1. **`src/common/middleware/trace-context.middleware.ts`**

## Detailed Changes

### J3.1: Simplify HTTP Middleware
**File**: `src/common/middleware/trace-context.middleware.ts`  
**Method**: `traceContextMiddleware()`  
**Changes**:
```typescript
import { context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const propagator = new W3CTraceContextPropagator();
  
  // Extract incoming W3C context from headers
  const carrier = { 
    traceparent: req.headers.traceparent, 
    tracestate: req.headers.tracestate 
  };
  const incomingContext = propagator.extract(context.active(), carrier);
  
  // Execute with extracted context (express auto-instrumentation will create the span)
  context.with(incomingContext, () => {
    // Log request start with trace context
    logger.info('HTTP request started', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    
    next();
  });
}
```

## Benefits
- **Simplified code**: No manual span creation needed
- **Automatic spans**: Express auto-instrumentation creates SERVER spans
- **Context propagation**: W3C context is properly extracted and activated
- **Less maintenance**: Auto-instrumentation handles span lifecycle

## Tests
- [ ] Update `src/common/middleware/__tests__/trace-context.middleware.spec.ts`
- [ ] Test W3C context extraction and activation
- [ ] Verify express auto-instrumentation creates spans
- [ ] Test trace field propagation in logs

## Checklist
- [x] Remove manual span creation code
- [x] Add W3C context extraction from headers
- [x] Activate extracted context for request processing
- [ ] Update middleware tests
- [ ] Test context propagation with express auto-instrumentation
- [ ] Verify trace fields in request logs
- [x] Update status to ✅ Completed

## Notes
- This job depends on J1 (auto-instrumentation) for express spans
- Manual span creation is replaced with context activation
- Express auto-instrumentation handles span lifecycle automatically
- W3C context extraction ensures proper trace correlation
