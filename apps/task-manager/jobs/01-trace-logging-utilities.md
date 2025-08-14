# Job 01: Trace Logging Utilities Implementation

## Status

**NOT_COMPLETED**

## Overview

Create centralized trace context extraction and logging enhancement utilities to ensure consistent trace ID propagation across all Kafka message processing flows.

## Objectives

- Create reusable trace logging utilities
- Ensure trace context extraction from Kafka headers
- Provide logger enhancement capabilities
- Handle missing trace contexts gracefully

## Files to Create/Modify

### New Files

- `src/common/utils/trace-logging.ts` - Main trace logging utilities

### Files to Modify

- `src/common/utils/logging/index.ts` - Export new utilities
- `src/common/utils/logging/interfaces.ts` - Add trace-related interfaces

## Detailed Implementation

### 1. Create Trace Logging Interfaces

**File**: `src/common/utils/logging/interfaces.ts`

Add new interfaces for trace context:

```typescript
export interface TraceContext {
  traceId: string;
  spanId?: string;
  traceparent?: string;
  tracestate?: string;
}

export interface TraceLoggingOptions {
  extractFromHeaders?: boolean;
  fallbackToActiveSpan?: boolean;
  logMissingTrace?: boolean;
}
```

### 2. Implement TraceLoggingUtils Class

**File**: `src/common/utils/trace-logging.ts`

```typescript
import { ILogger } from './logging/interfaces';
import { TraceContext, TraceLoggingOptions } from './logging/interfaces';

/**
 * Log level enum for type-safe logging
 * Provides centralized control over log levels and their string representations
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
  SUCCESS = 'success',
}

export class TraceLoggingUtils {
  /**
   * Extract trace ID from Kafka message headers
   * Supports both traceparent and custom trace headers
   */
  static extractTraceFromKafkaHeaders(headers: Record<string, any>): string | null {
    try {
      // Try traceparent header first (W3C standard)
      const traceparent = headers['traceparent'];
      if (traceparent) {
        const parts = traceparent.split('-');
        return parts.length >= 2 ? parts[1] : null;
      }

      // Try custom trace headers
      const customTraceId = headers['trace-id'] || headers['x-trace-id'];
      if (customTraceId) {
        return customTraceId;
      }

      return null;
    } catch (error) {
      console.error('Error extracting trace from Kafka headers:', error);
      return null;
    }
  }

  /**
   * Extract full trace context from Kafka headers
   */
  static extractTraceContextFromKafkaHeaders(headers: Record<string, any>): TraceContext | null {
    try {
      const traceId = this.extractTraceFromKafkaHeaders(headers);
      if (!traceId) return null;

      return {
        traceId,
        spanId: headers['span-id'] || headers['x-span-id'],
        traceparent: headers['traceparent'],
        tracestate: headers['tracestate'],
      };
    } catch (error) {
      console.error('Error extracting trace context from Kafka headers:', error);
      return null;
    }
  }

  /**
   * Enhance logger with trace context
   */
  static enhanceLoggerWithTrace(logger: ILogger, traceContext: TraceContext): ILogger {
    try {
      return logger.child({
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        traceparent: traceContext.traceparent,
        tracestate: traceContext.tracestate,
      });
    } catch (error) {
      console.error('Error enhancing logger with trace context:', error);
      return logger; // Fallback to original logger
    }
  }

  /**
   * Create trace-enhanced logger from Kafka headers
   */
  static createTraceLoggerFromHeaders(logger: ILogger, headers: Record<string, any>): ILogger {
    const traceContext = this.extractTraceContextFromKafkaHeaders(headers);
    if (traceContext) {
      return this.enhanceLoggerWithTrace(logger, traceContext);
    }
    return logger;
  }

  /**
   * Log with trace context if available
   */
  static logWithTraceContext(logger: ILogger, level: LogLevel, message: string, metadata?: Record<string, any>, traceContext?: TraceContext): void {
    try {
      const enhancedLogger = traceContext ? this.enhanceLoggerWithTrace(logger, traceContext) : logger;

      enhancedLogger[level](message, metadata);
    } catch (error) {
      console.error('Error logging with trace context:', error);
      // Fallback to original logger
      logger[level](message, metadata);
    }
  }

  /**
   * Validate trace context format
   */
  static validateTraceContext(traceContext: TraceContext): boolean {
    if (!traceContext.traceId) return false;

    // Validate trace ID format (32 hex characters)
    const traceIdRegex = /^[0-9a-f]{32}$/i;
    return traceIdRegex.test(traceContext.traceId);
  }
}
```

### 3. Update Logging Index

**File**: `src/common/utils/logging/index.ts`

```typescript
// ... existing exports ...
export { TraceLoggingUtils, LogLevel } from '../trace-logging';
export type { TraceContext, TraceLoggingOptions } from './interfaces';
```

## Testing Strategy

### Unit Tests

**File**: `src/common/utils/__tests__/trace-logging.spec.ts`

```typescript
import { TraceLoggingUtils, LogLevel } from '../trace-logging';
import { ILogger } from '../logging/interfaces';

describe('LogLevel', () => {
  it('should have correct string values', () => {
    expect(LogLevel.INFO).toBe('info');
    expect(LogLevel.WARN).toBe('warn');
    expect(LogLevel.ERROR).toBe('error');
    expect(LogLevel.DEBUG).toBe('debug');
    expect(LogLevel.SUCCESS).toBe('success');
  });
});

describe('TraceLoggingUtils', () => {
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };
  });

  describe('extractTraceFromKafkaHeaders', () => {
    it('should extract trace ID from traceparent header', () => {
      const headers = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(headers);
      expect(result).toBe('1234567890abcdef1234567890abcdef');
    });

    it('should extract trace ID from custom header', () => {
      const headers = {
        'trace-id': '1234567890abcdef1234567890abcdef',
      };
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(headers);
      expect(result).toBe('1234567890abcdef1234567890abcdef');
    });

    it('should return null for invalid headers', () => {
      const headers = { invalid: 'header' };
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });

    it('should handle malformed traceparent', () => {
      const headers = { traceparent: 'invalid-format' };
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });
  });

  describe('enhanceLoggerWithTrace', () => {
    it('should enhance logger with trace context', () => {
      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      TraceLoggingUtils.enhanceLoggerWithTrace(mockLogger, traceContext);

      expect(mockLogger.child).toHaveBeenCalledWith({
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        traceparent: undefined,
        tracestate: undefined,
      });
    });

    it('should handle logger enhancement errors gracefully', () => {
      mockLogger.child.mockImplementation(() => {
        throw new Error('Logger enhancement failed');
      });

      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
      };

      const result = TraceLoggingUtils.enhanceLoggerWithTrace(mockLogger, traceContext);
      expect(result).toBe(mockLogger);
    });
  });

  describe('logWithTraceContext', () => {
    it('should log with trace context using LogLevel enum', () => {
      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
      };

      TraceLoggingUtils.logWithTraceContext(mockLogger, LogLevel.INFO, 'Test message', { key: 'value' }, traceContext);

      expect(mockLogger.child).toHaveBeenCalledWith({
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        traceparent: undefined,
        tracestate: undefined,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Test message', { key: 'value' });
    });

    it('should log without trace context when not provided', () => {
      TraceLoggingUtils.logWithTraceContext(mockLogger, LogLevel.ERROR, 'Error message');

      expect(mockLogger.child).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error message', undefined);
    });

    it('should handle logging errors gracefully', () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      TraceLoggingUtils.logWithTraceContext(mockLogger, LogLevel.INFO, 'Test message');

      expect(mockLogger.info).toHaveBeenCalledTimes(2); // Original call + fallback
    });
  });

  describe('validateTraceContext', () => {
    it('should validate correct trace context', () => {
      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(true);
    });

    it('should reject invalid trace ID format', () => {
      const traceContext = {
        traceId: 'invalid-trace-id',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(false);
    });

    it('should reject missing trace ID', () => {
      const traceContext = {
        spanId: '1234567890abcdef',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(false);
    });

    it('should validate trace ID with mixed case', () => {
      const traceContext = {
        traceId: '1234567890ABCDEF1234567890abcdef',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(true);
    });

    it('should reject trace ID that is too short', () => {
      const traceContext = {
        traceId: '1234567890abcdef',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(false);
    });

    it('should reject trace ID that is too long', () => {
      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdef1234567890abcdef',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(false);
    });

    it('should reject trace ID with non-hex characters', () => {
      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdeg',
      };
      expect(TraceLoggingUtils.validateTraceContext(traceContext)).toBe(false);
    });
  });

  describe('extractTraceContextFromKafkaHeaders', () => {
    it('should extract complete trace context from headers', () => {
      const headers = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'vendor=value',
        'span-id': '1234567890abcdef',
      };

      const result = TraceLoggingUtils.extractTraceContextFromKafkaHeaders(headers);

      expect(result).toEqual({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'vendor=value',
      });
    });

    it('should return null when no trace ID is found', () => {
      const headers = {
        'other-header': 'value',
        'span-id': '1234567890abcdef',
      };

      const result = TraceLoggingUtils.extractTraceContextFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });

    it('should handle missing optional fields gracefully', () => {
      const headers = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      const result = TraceLoggingUtils.extractTraceContextFromKafkaHeaders(headers);

      expect(result).toEqual({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: undefined,
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: undefined,
      });
    });

    it('should handle extraction errors gracefully', () => {
      const headers = null;

      const result = TraceLoggingUtils.extractTraceContextFromKafkaHeaders(headers as any);
      expect(result).toBeNull();
    });
  });

  describe('createTraceLoggerFromHeaders', () => {
    it('should create trace logger when headers contain trace context', () => {
      const headers = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      const result = TraceLoggingUtils.createTraceLoggerFromHeaders(mockLogger, headers);

      expect(mockLogger.child).toHaveBeenCalledWith({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: undefined,
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: undefined,
      });
      expect(result).toBe(mockLogger);
    });

    it('should return original logger when no trace context found', () => {
      const headers = { 'other-header': 'value' };

      const result = TraceLoggingUtils.createTraceLoggerFromHeaders(mockLogger, headers);

      expect(mockLogger.child).not.toHaveBeenCalled();
      expect(result).toBe(mockLogger);
    });
  });

  describe('LogLevel enum integration', () => {
    it('should work with all log levels', () => {
      const traceContext = {
        traceId: '1234567890abcdef1234567890abcdef',
      };

      Object.values(LogLevel).forEach((level) => {
        TraceLoggingUtils.logWithTraceContext(mockLogger, level, `Test ${level} message`, undefined, traceContext);
        expect(mockLogger[level]).toHaveBeenCalledWith(`Test ${level} message`, undefined);
      });
    });

    it('should maintain type safety with LogLevel enum', () => {
      // This test ensures TypeScript compilation works correctly
      const validLevels: LogLevel[] = [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.DEBUG, LogLevel.SUCCESS];
      expect(validLevels).toHaveLength(5);
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle null headers gracefully', () => {
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined headers gracefully', () => {
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(undefined as any);
      expect(result).toBeNull();
    });

    it('should handle empty headers object', () => {
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders({});
      expect(result).toBeNull();
    });

    it('should handle malformed traceparent with insufficient parts', () => {
      const headers = { traceparent: '00-1234567890abcdef' };
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });

    it('should handle non-string header values', () => {
      const headers = { traceparent: 123 };
      const result = TraceLoggingUtils.extractTraceFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });
  });
});
```

## Potential Issues and Mitigations

### 1. Header Format Variations

**Issue**: Different systems might use different header formats
**Mitigation**: Support multiple header formats and provide clear documentation

### 2. Logger Enhancement Failures

**Issue**: Logger.child() might fail in some implementations
**Mitigation**: Always provide fallback to original logger

### 3. Performance Impact

**Issue**: Trace extraction might impact message processing performance
**Mitigation**: Use efficient string operations and caching where appropriate

### 4. Invalid Trace Contexts

**Issue**: Malformed trace contexts might cause downstream issues
**Mitigation**: Validate trace context format and provide clear error handling

## Success Criteria

- [ ] Trace ID extraction works with W3C traceparent format
- [ ] Trace ID extraction works with custom header formats
- [ ] Logger enhancement handles errors gracefully
- [ ] Trace context validation works correctly
- [ ] All unit tests pass
- [ ] Performance impact is minimal (<1ms per extraction)
- [ ] Clear error messages for debugging

## Dependencies

- Existing logger implementation
- TypeScript configuration with decorators enabled

## Estimated Effort

- **Development**: 1 day
- **Testing**: 0.5 day
- **Total**: 1.5 days

## Notes

- This job provides the foundation for all trace logging enhancements
- LogLevel enum provides type safety and centralized control over log levels
- Easy to add new log levels or change string representations by updating the enum
- All error handling should be defensive to prevent cascading failures
- Performance should be monitored during implementation
