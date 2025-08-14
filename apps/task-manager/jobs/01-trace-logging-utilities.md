# Job 01: Trace Logging Utilities Implementation

## Status

**COMPLETED**

## Sub-Jobs

### Sub-Job 1.1: Span ID Generation Middleware (COMPLETED)

**Objective**: Implement automatic span ID generation for incoming requests (HTTP and Kafka)

**Problem**: Currently, we can extract trace context from incoming requests, but we don't automatically generate new span IDs for new requests. This means we can't properly track request flows through our system.

**Solution**:

1. Create HTTP middleware that generates span IDs for incoming requests
2. Integrate span ID generation into Kafka consumer message processing
3. Ensure all incoming requests get proper trace context with unique span IDs

**Implementation Plan**:

#### 1. HTTP Request Span ID Middleware

**File**: `src/common/middleware/trace-context.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { TraceContextManager } from '../utils/tracing/trace-context';
import { TraceContextExtractor } from '../utils/tracing/trace-context-extractor';
import { logger } from '../utils/logger';

/**
 * Middleware to handle trace context for HTTP requests
 *
 * This middleware:
 * 1. Extracts existing trace context from request headers (if present)
 * 2. Generates new span ID for the current request
 * 3. Creates trace-aware logger for the request
 * 4. Attaches trace context to request object for downstream use
 */
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract existing trace context from headers
    const existingContext = TraceContextExtractor.extractTraceContextFromKafkaHeaders(req.headers);

    let traceContext: TraceContext;

    if (existingContext) {
      // If trace context exists, generate new span ID for this request
      traceContext = TraceContextManager.createTraceContext(
        existingContext.traceId,
        undefined, // Generate new span ID
        existingContext.traceFlags
      );
    } else {
      // If no trace context, create completely new trace context
      traceContext = TraceContextManager.createTraceContext();
    }

    // Create trace-aware logger for this request
    const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders({ traceparent: TraceContextManager.formatW3CTraceContext(traceContext.traceId, traceContext.spanId, traceContext.traceFlags) }, logger);

    // Attach trace context and logger to request object
    (req as any).traceContext = traceContext;
    (req as any).traceLogger = traceLogger;

    // Log request with trace context
    traceLogger.info('HTTP request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
    });

    next();
  } catch (error) {
    // Fallback to regular logger if trace context setup fails
    logger.warn('Failed to setup trace context for HTTP request', {
      error: error instanceof Error ? error.message : String(error),
      method: req.method,
      path: req.path,
    });
    next();
  }
}
```

#### 2. Kafka Consumer Span ID Integration

**File**: `src/common/utils/tracing/kafka-trace-context.ts`

```typescript
import { TraceContextManager, TraceContext } from './trace-context';
import { TraceContextExtractor } from './trace-context-extractor';
import { ILogger } from '../logging/interfaces';

/**
 * Kafka message trace context utilities
 *
 * Provides utilities for handling trace context in Kafka consumer message processing
 */
export class KafkaTraceContext {
  /**
   * Process incoming Kafka message and generate new span ID
   *
   * @param headers - Kafka message headers
   * @param baseLogger - Base logger instance
   * @returns Object containing trace context and trace-aware logger
   */
  static processMessage(
    headers: Record<string, any>,
    baseLogger: ILogger
  ): {
    traceContext: TraceContext;
    traceLogger: ILogger;
    isNewTrace: boolean;
  } {
    // Extract existing trace context from headers
    const existingContext = TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);

    let traceContext: TraceContext;
    let isNewTrace = false;

    if (existingContext) {
      // If trace context exists, generate new span ID for this message processing
      traceContext = TraceContextManager.createTraceContext(
        existingContext.traceId,
        undefined, // Generate new span ID
        existingContext.traceFlags
      );
    } else {
      // If no trace context, create completely new trace context
      traceContext = TraceContextManager.createTraceContext();
      isNewTrace = true;
    }

    // Create trace-aware logger
    const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders({ traceparent: TraceContextManager.formatW3CTraceContext(traceContext.traceId, traceContext.spanId, traceContext.traceFlags) }, baseLogger);

    return {
      traceContext,
      traceLogger,
      isNewTrace,
    };
  }

  /**
   * Create headers for outgoing Kafka messages with trace context
   *
   * @param existingHeaders - Existing headers to preserve
   * @param traceContext - Current trace context
   * @returns Headers with trace context injected
   */
  static createOutgoingHeaders(existingHeaders: Record<string, any> = {}, traceContext: TraceContext): Record<string, any> {
    return TraceContextManager.injectIntoKafkaHeaders(existingHeaders, traceContext.traceId, traceContext.spanId, traceContext.traceFlags);
  }
}
```

#### 3. Update Base Consumer to Use Trace Context

**File**: `src/api/kafka/consumers/base-consumer.ts` (enhancement)

```typescript
// Add to existing BaseConsumer class
import { KafkaTraceContext } from '../../../common/utils/tracing/kafka-trace-context';

export abstract class BaseConsumer implements IConsumer {
  // ... existing code ...

  /**
   * Process message with trace context
   *
   * @param message - Kafka message
   * @param handler - Message handler
   * @param baseLogger - Base logger
   */
  protected async processMessageWithTrace(message: any, handler: IHandler, baseLogger: ILogger): Promise<void> {
    const { traceContext, traceLogger, isNewTrace } = KafkaTraceContext.processMessage(message.headers || {}, baseLogger);

    try {
      // Log message received with trace context
      traceLogger.info('Kafka message received', {
        topic: this.topic,
        key: message.key?.toString(),
        partition: message.partition,
        offset: message.offset,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        isNewTrace,
      });

      // Process message with trace-aware logger
      await handler.process(message, traceLogger);

      // Log message processed successfully
      traceLogger.info('Kafka message processed successfully', {
        topic: this.topic,
        key: message.key?.toString(),
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
      });
    } catch (error) {
      // Log error with trace context
      traceLogger.error('Kafka message processing failed', {
        topic: this.topic,
        key: message.key?.toString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
      });
      throw error;
    }
  }
}
```

#### 4. Update REST Router to Use Trace Middleware

**File**: `src/api/rest/rest.router.ts` (enhancement)

```typescript
import { traceContextMiddleware } from '../../common/middleware/trace-context.middleware';

export function createRestRouter(healthCheckService: IHealthCheckService, metricsService: WebCrawlMetricsService): Router {
  const router = Router();

  // Add trace context middleware (must be first)
  router.use(traceContextMiddleware);

  // Add request logging middleware (now uses trace-aware logger)
  router.use((req, res, next) => {
    const traceLogger = (req as any).traceLogger || logger;
    traceLogger.debug('REST API request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });

  // ... rest of existing code ...
}
```

#### 5. Update Handler Interface to Support Trace Logger

**File**: `src/api/kafka/handlers/base-handler.interface.ts` (enhancement)

```typescript
import { ILogger } from '../../../common/utils/logging/interfaces';

export interface IHandler {
  /**
   * Process a message with optional trace-aware logger
   *
   * @param message - The message to process
   * @param traceLogger - Optional trace-aware logger (if not provided, use default logger)
   */
  process(message: any, traceLogger?: ILogger): Promise<void>;
}
```

**Testing Strategy**:

#### Unit Tests

**File**: `src/common/middleware/__tests__/trace-context.middleware.spec.ts`

```typescript
import { traceContextMiddleware } from '../trace-context.middleware';
import { Request, Response, NextFunction } from 'express';
import { TraceContextManager } from '../../utils/tracing/trace-context';

describe('traceContextMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      headers: {},
      get: jest.fn(),
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should generate new trace context when none exists', () => {
    traceContextMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as any).traceContext).toBeDefined();
    expect((mockReq as any).traceLogger).toBeDefined();
    expect((mockReq as any).traceContext.traceId).toMatch(/^[a-f0-9]{32}$/i);
    expect((mockReq as any).traceContext.spanId).toMatch(/^[a-f0-9]{16}$/i);
  });

  it('should preserve trace ID but generate new span ID when trace context exists', () => {
    const existingTraceId = '1234567890abcdef1234567890abcdef';
    const existingSpanId = '1234567890abcdef';

    mockReq.headers = {
      traceparent: `00-${existingTraceId}-${existingSpanId}-01`,
    };

    traceContextMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as any).traceContext.traceId).toBe(existingTraceId);
    expect((mockReq as any).traceContext.spanId).not.toBe(existingSpanId);
    expect((mockReq as any).traceContext.spanId).toMatch(/^[a-f0-9]{16}$/i);
  });

  it('should handle errors gracefully', () => {
    mockReq.headers = { traceparent: 'invalid-format' };

    expect(() => {
      traceContextMiddleware(mockReq as Request, mockRes as Response, mockNext);
    }).not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });
});
```

#### Integration Tests

**File**: `src/common/utils/tracing/__tests__/kafka-trace-context.spec.ts`

```typescript
import { KafkaTraceContext } from '../kafka-trace-context';
import { TraceContextManager } from '../trace-context';
import { ILogger } from '../../logging/interfaces';

describe('KafkaTraceContext', () => {
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

  describe('processMessage', () => {
    it('should create new trace context when none exists', () => {
      const result = KafkaTraceContext.processMessage({}, mockLogger);

      expect(result.traceContext).toBeDefined();
      expect(result.traceLogger).toBeDefined();
      expect(result.isNewTrace).toBe(true);
      expect(result.traceContext.traceId).toMatch(/^[a-f0-9]{32}$/i);
      expect(result.traceContext.spanId).toMatch(/^[a-f0-9]{16}$/i);
    });

    it('should preserve trace ID but generate new span ID when trace context exists', () => {
      const existingTraceId = '1234567890abcdef1234567890abcdef';
      const existingSpanId = '1234567890abcdef';

      const headers = {
        traceparent: `00-${existingTraceId}-${existingSpanId}-01`,
      };

      const result = KafkaTraceContext.processMessage(headers, mockLogger);

      expect(result.traceContext.traceId).toBe(existingTraceId);
      expect(result.traceContext.spanId).not.toBe(existingSpanId);
      expect(result.isNewTrace).toBe(false);
    });
  });

  describe('createOutgoingHeaders', () => {
    it('should inject trace context into headers', () => {
      const traceContext = TraceContextManager.createTraceContext();
      const existingHeaders = { 'custom-header': 'value' };

      const result = KafkaTraceContext.createOutgoingHeaders(existingHeaders, traceContext);

      expect(result['custom-header']).toBe('value');
      expect(result.traceparent).toContain(traceContext.traceId);
      expect(result.traceparent).toContain(traceContext.spanId);
    });
  });
});
```

**Success Criteria**:

- [ ] HTTP requests automatically get span IDs generated
- [ ] Kafka messages automatically get span IDs generated
- [ ] Trace context is properly propagated through the system
- [ ] All logs include trace ID and span ID
- [ ] Middleware handles errors gracefully
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance impact is minimal (<1ms per request)

**Dependencies**:

- Job 01 (Trace Logging Utilities) - COMPLETED ✅
- Existing trace context utilities

**Estimated Effort**: 0.5 days

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
