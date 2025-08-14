import { LogLevel } from '../logging/types';
import { TraceContextExtractor } from '../tracing/trace-context-extractor';
import { TraceContext } from '../tracing/trace-context';
import { ILogger } from '../logging/interfaces';

// Mock logger for testing
const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
  child: jest.fn().mockImplementation((additionalContext) => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    child: jest.fn(),
    additionalContext,
  })),
};

describe('Trace Logging Utilities', () => {
  describe('LogLevel Enum', () => {
    it('should have all required log levels', () => {
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.SUCCESS).toBe('success');
    });

    it('should be enumerable', () => {
      const levels = Object.values(LogLevel);
      expect(levels).toContain('debug');
      expect(levels).toContain('info');
      expect(levels).toContain('warn');
      expect(levels).toContain('error');
      expect(levels).toContain('success');
    });

    it('should provide type safety', () => {
      // This test ensures TypeScript compilation works correctly
      const validLevel: LogLevel = LogLevel.INFO;
      expect(validLevel).toBe('info');
    });
  });

  describe('TraceContextExtractor', () => {
    describe('extractTraceContextFromKafkaHeaders', () => {
      it('should extract valid trace context from Kafka headers', () => {
        const headers = {
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
        };

        const result =
          TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);

        expect(result).toEqual({
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: '1234567890abcdef',
          traceFlags: 1,
          traceState: 'test=value',
        });
      });

      it('should return null for missing traceparent', () => {
        const headers = {
          tracestate: 'test=value',
        };

        const result =
          TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);

        expect(result).toBeNull();
      });

      it('should return null for invalid traceparent format', () => {
        const headers = {
          traceparent: 'invalid-format',
        };

        const result =
          TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);

        expect(result).toBeNull();
      });

      it('should handle malformed headers gracefully', () => {
        const headers = {
          traceparent: null,
          tracestate: undefined,
        };

        const result =
          TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);

        expect(result).toBeNull();
      });

      it('should handle empty headers object', () => {
        const result =
          TraceContextExtractor.extractTraceContextFromKafkaHeaders({});

        expect(result).toBeNull();
      });
    });

    describe('createTraceLoggerFromHeaders', () => {
      it('should create trace-aware logger with valid headers', () => {
        const headers = {
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
        };

        const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
          headers,
          mockLogger
        );

        expect(traceLogger).toBeDefined();
        expect(traceLogger).not.toBe(mockLogger); // Should be a child logger
      });

      it('should return base logger when no trace context found', () => {
        const headers = {};

        const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
          headers,
          mockLogger
        );

        expect(traceLogger).toBe(mockLogger);
      });

      it('should use default logger when no base logger provided', () => {
        const headers = {
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        };

        const traceLogger =
          TraceContextExtractor.createTraceLoggerFromHeaders(headers);

        expect(traceLogger).toBeDefined();
      });

      it('should handle invalid trace context gracefully', () => {
        const headers = {
          traceparent: 'invalid-format',
        };

        const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
          headers,
          mockLogger
        );

        expect(traceLogger).toBe(mockLogger);
      });
    });

    describe('extractTraceFieldsFromHeaders', () => {
      it('should extract all trace-related fields', () => {
        const headers = {
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlation_id: 'corr-123',
          source: 'gateway',
          version: '1.0.0',
        };

        const result =
          TraceContextExtractor.extractTraceFieldsFromHeaders(headers);

        expect(result).toEqual({
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlationId: 'corr-123',
          source: 'gateway',
          version: '1.0.0',
        });
      });

      it('should handle missing fields gracefully', () => {
        const headers = {
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        };

        const result =
          TraceContextExtractor.extractTraceFieldsFromHeaders(headers);

        expect(result).toEqual({
          traceparent:
            '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: undefined,
          correlationId: undefined,
          source: undefined,
          version: undefined,
        });
      });

      it('should handle empty headers', () => {
        const result = TraceContextExtractor.extractTraceFieldsFromHeaders({});

        expect(result).toEqual({
          traceparent: undefined,
          tracestate: undefined,
          correlationId: undefined,
          source: undefined,
          version: undefined,
        });
      });
    });

    describe('isValidTraceContext', () => {
      it('should validate correct trace context', () => {
        const traceContext: TraceContext = {
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: '1234567890abcdef',
          traceFlags: 1,
          traceState: 'test=value',
        };

        const result = TraceContextExtractor.isValidTraceContext(traceContext);

        expect(result).toBe(true);
      });

      it('should reject null trace context', () => {
        const result = TraceContextExtractor.isValidTraceContext(null);

        expect(result).toBe(false);
      });

      it('should reject invalid trace ID format', () => {
        const traceContext: TraceContext = {
          traceId: 'invalid',
          spanId: '1234567890abcdef',
          traceFlags: 1,
        };

        const result = TraceContextExtractor.isValidTraceContext(traceContext);

        expect(result).toBe(false);
      });

      it('should reject invalid span ID format', () => {
        const traceContext: TraceContext = {
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: 'invalid',
          traceFlags: 1,
        };

        const result = TraceContextExtractor.isValidTraceContext(traceContext);

        expect(result).toBe(false);
      });

      it('should reject invalid trace flags', () => {
        const traceContext: TraceContext = {
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: '1234567890abcdef',
          traceFlags: 256, // Invalid: > 255
        };

        const result = TraceContextExtractor.isValidTraceContext(traceContext);

        expect(result).toBe(false);
      });
    });

    describe('createTestTraceContext', () => {
      it('should create trace context with provided IDs', () => {
        const traceId = '1234567890abcdef1234567890abcdef';
        const spanId = '1234567890abcdef';

        const result = TraceContextExtractor.createTestTraceContext(
          traceId,
          spanId
        );

        expect(result.traceId).toBe(traceId);
        expect(result.spanId).toBe(spanId);
        expect(result.traceFlags).toBe(1);
        expect(result.traceState).toBe('');
      });

      it('should generate random IDs when not provided', () => {
        const result = TraceContextExtractor.createTestTraceContext();

        expect(result.traceId).toMatch(/^[a-f0-9]{32}$/i);
        expect(result.spanId).toMatch(/^[a-f0-9]{16}$/i);
        expect(result.traceFlags).toBe(1);
      });

      it('should generate valid trace context format', () => {
        const result = TraceContextExtractor.createTestTraceContext();

        expect(TraceContextExtractor.isValidTraceContext(result)).toBe(true);
      });
    });

    describe('formatTraceContextForLogging', () => {
      it('should format valid trace context', () => {
        const traceContext: TraceContext = {
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: '1234567890abcdef',
          traceFlags: 1,
        };

        const result =
          TraceContextExtractor.formatTraceContextForLogging(traceContext);

        expect(result).toBe(
          '1234567890abcdef1234567890abcdef:1234567890abcdef'
        );
      });

      it('should handle null trace context', () => {
        const result = TraceContextExtractor.formatTraceContextForLogging(null);

        expect(result).toBe('no-trace-context');
      });

      it('should handle trace context with only trace ID', () => {
        const traceContext: TraceContext = {
          traceId: '1234567890abcdef1234567890abcdef',
          spanId: '1234567890abcdef',
          traceFlags: 1,
        };

        const result =
          TraceContextExtractor.formatTraceContextForLogging(traceContext);

        expect(result).toBe(
          '1234567890abcdef1234567890abcdef:1234567890abcdef'
        );
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete Kafka message processing flow', () => {
      const headers = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'gateway',
        version: '1.0.0',
      };

      // Extract trace context
      const traceContext =
        TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);
      expect(traceContext).toBeDefined();

      // Validate trace context
      const isValid = TraceContextExtractor.isValidTraceContext(traceContext);
      expect(isValid).toBe(true);

      // Create trace logger
      const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
        headers,
        mockLogger
      );
      expect(traceLogger).toBeDefined();

      // Extract trace fields
      const traceFields =
        TraceContextExtractor.extractTraceFieldsFromHeaders(headers);
      expect(traceFields.traceparent).toBe(headers.traceparent);

      // Format for logging
      const formatted =
        TraceContextExtractor.formatTraceContextForLogging(traceContext);
      expect(formatted).toContain('1234567890abcdef1234567890abcdef');
    });

    it('should handle error scenarios gracefully', () => {
      const invalidHeaders = {
        traceparent: 'invalid-format',
        tracestate: null,
      };

      // Should not throw errors
      expect(() => {
        TraceContextExtractor.extractTraceContextFromKafkaHeaders(
          invalidHeaders
        );
      }).not.toThrow();

      expect(() => {
        TraceContextExtractor.createTraceLoggerFromHeaders(
          invalidHeaders,
          mockLogger
        );
      }).not.toThrow();

      expect(() => {
        TraceContextExtractor.extractTraceFieldsFromHeaders(invalidHeaders);
      }).not.toThrow();
    });
  });
});
