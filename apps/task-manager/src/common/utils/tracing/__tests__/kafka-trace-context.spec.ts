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

    it('should handle empty headers gracefully', () => {
      const result = KafkaTraceContext.processMessage({}, mockLogger);

      expect(result.traceContext).toBeDefined();
      expect(result.isNewTrace).toBe(true);
    });

    it('should handle null headers gracefully', () => {
      const result = KafkaTraceContext.processMessage(null as any, mockLogger);

      expect(result.traceContext).toBeDefined();
      expect(result.isNewTrace).toBe(true);
    });

    it('should create trace-aware logger', () => {
      const result = KafkaTraceContext.processMessage({}, mockLogger);

      expect(result.traceLogger).toBeDefined();
      expect(typeof result.traceLogger.info).toBe('function');
      expect(typeof result.traceLogger.error).toBe('function');
    });
  });

  describe('createOutgoingHeaders', () => {
    it('should inject trace context into headers', () => {
      const traceContext = TraceContextManager.createTraceContext();
      const existingHeaders = { 'custom-header': 'value' };

      const result = KafkaTraceContext.createOutgoingHeaders(
        existingHeaders,
        traceContext
      );

      expect(result['custom-header']).toBe('value');
      expect(result.traceparent).toContain(traceContext.traceId);
      expect(result.traceparent).toContain(traceContext.spanId);
    });

    it('should create headers with empty existing headers', () => {
      const traceContext = TraceContextManager.createTraceContext();

      const result = KafkaTraceContext.createOutgoingHeaders({}, traceContext);

      expect(result.traceparent).toContain(traceContext.traceId);
      expect(result.traceparent).toContain(traceContext.spanId);
    });

    it('should preserve all existing headers', () => {
      const traceContext = TraceContextManager.createTraceContext();
      const existingHeaders = {
        header1: 'value1',
        header2: 'value2',
        traceparent: 'old-trace',
      };

      const result = KafkaTraceContext.createOutgoingHeaders(
        existingHeaders,
        traceContext
      );

      expect(result.header1).toBe('value1');
      expect(result.header2).toBe('value2');
      expect(result.traceparent).toContain(traceContext.traceId);
      expect(result.traceparent).not.toBe('old-trace');
    });
  });

  describe('integration with TraceContextManager', () => {
    it('should work with valid trace context from TraceContextManager', () => {
      const traceContext = TraceContextManager.createTraceContext();
      const headers = {
        traceparent: TraceContextManager.formatW3CTraceContext(
          traceContext.traceId,
          traceContext.spanId,
          traceContext.traceFlags
        ),
      };

      const result = KafkaTraceContext.processMessage(headers, mockLogger);

      expect(result.traceContext.traceId).toBe(traceContext.traceId);
      expect(result.traceContext.spanId).not.toBe(traceContext.spanId); // Should generate new span ID
      expect(result.isNewTrace).toBe(false);
    });

    it('should handle invalid trace context gracefully', () => {
      const headers = {
        traceparent: 'invalid-format',
      };

      const result = KafkaTraceContext.processMessage(headers, mockLogger);

      expect(result.traceContext).toBeDefined();
      expect(result.isNewTrace).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle malformed headers gracefully', () => {
      const headers = {
        traceparent: null,
        tracestate: undefined,
      };

      const result = KafkaTraceContext.processMessage(headers, mockLogger);

      expect(result.traceContext).toBeDefined();
      expect(result.isNewTrace).toBe(true);
    });

    it('should handle missing trace flags', () => {
      const existingTraceId = '1234567890abcdef1234567890abcdef';
      const existingSpanId = '1234567890abcdef';

      const headers = {
        traceparent: `00-${existingTraceId}-${existingSpanId}-`, // Missing trace flags
      };

      const result = KafkaTraceContext.processMessage(headers, mockLogger);

      expect(result.traceContext).toBeDefined();
      expect(result.isNewTrace).toBe(true);
    });
  });
});

