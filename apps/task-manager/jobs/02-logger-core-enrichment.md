# Job J2: Logger Core Enrichment

**Status**: ⏳ Pending  
**Priority**: 🔴 Critical  
**Dependencies**: J1 (Enable Auto-Instrumentation)  
**Estimated Time**: 3-4 hours

## Summary
Update the logger system to automatically extract and include trace context from active OTEL spans in every log record.

## Files to Modify
1. **`src/common/utils/logging/otel-logger.ts`**
2. **`src/common/utils/logger.ts`** 
3. **`src/common/utils/logging/formatters.ts`** (new file)

## Detailed Changes

### J2.1: Update OTELLogger.createLogRecord()
**File**: `src/common/utils/logging/otel-logger.ts`  
**Method**: `createLogRecord()`  
**Changes**:
```typescript
// Add OTEL imports
import { trace } from '@opentelemetry/api';

// In createLogRecord method, add:
const active = trace.getActiveSpan();
const spanCtx = active?.spanContext();
const parentSpanId = (active as any)?.parentSpanId || 
                    (active as any)?.links?.[0]?.context?.spanId;

logRecord.trace = {
  traceId: spanCtx?.traceId,
  spanId: spanCtx?.spanId, 
  parentSpanId,
  traceState: spanCtx?.traceState?.serialize?.()
};
```

### J2.2: Update Fallback Logger
**File**: `src/common/utils/logger.ts`  
**Class**: `FallbackLogger`  
**Changes**:
```typescript
// Add trace field placeholders to all log methods
info(message: string, metadata?: any): void {
  const timestamp = new Date().toISOString();
  console.log(`[level:${LoggerLevel.INFO},service:task-manager,timestamp:${timestamp},trace:{traceId:null,spanId:null,parentSpanId:null,traceState:null}]:${message}`);
  if (metadata) console.log(JSON.stringify(metadata, null, 2));
}
```

### J2.3: Create Trace-Aware Formatters
**File**: `src/common/utils/logging/formatters.ts` (NEW)  
**Content**:
```typescript
export class ConsoleFormatter {
  static format(logRecord: any): string {
    const trace = logRecord.trace || {};
    return `[level:${logRecord.level},service:${logRecord.service},timestamp:${logRecord.timestamp},trace:{traceId:${trace.traceId || 'null'},spanId:${trace.spanId || 'null'},parentSpanId:${trace.parentSpanId || 'null'},traceState:${trace.traceState || 'null'}}]:${logRecord.message}`;
  }
}

export class JSONFormatter {
  static format(logRecord: any): string {
    return JSON.stringify({
      level: logRecord.level,
      message: logRecord.message,
      timestamp: logRecord.timestamp,
      service: logRecord.service,
      environment: logRecord.environment,
      trace: logRecord.trace || { traceId: null, spanId: null, parentSpanId: null, traceState: null },
      ...logRecord.metadata
    });
  }
}
```

## Benefits
- **Automatic trace context**: Every log includes traceId, spanId, parentSpanId, and traceState
- **Consistent format**: All logs follow the same trace structure
- **Fallback support**: Fallback logger includes trace field placeholders
- **Formatter support**: Both console and JSON formatters handle trace fields

## Tests
- [ ] Update `src/common/utils/__tests__/logger-integration.spec.ts`
- [ ] Add tests for trace field extraction
- [ ] Test fallback logger trace field placeholders
- [ ] Test formatter trace field handling

## Checklist
- [ ] Update OTELLogger.createLogRecord() to extract trace context
- [ ] Update FallbackLogger to include trace field placeholders
- [ ] Create trace-aware formatters
- [ ] Update logger integration tests
- [ ] Test trace field extraction with active spans
- [ ] Test fallback logger without active spans
- [ ] Update status to ✅ Completed

## Notes
- This job depends on J1 (auto-instrumentation) to provide active spans
- Trace context extraction should be efficient (<1ms overhead)
- Fallback logger provides consistent structure even without active spans
- Formatters ensure trace fields are properly displayed in all output formats
