import { TraceContextManager } from '../trace-context';
import { TraceTestHelper } from '../../../../test-utils/trace-test-helper';

describe('TraceContextManager', () => {
  describe('extractFromKafkaHeaders', () => {
    it('should extract valid trace context from Kafka headers', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const traceparent = TraceContextManager.formatW3CTraceContext(
        traceId,
        spanId
      );

      const headers = {
        traceparent,
        tracestate: '',
        'other-header': 'other-value',
      };

      const result = TraceContextManager.extractFromKafkaHeaders(headers);

      expect(result).toBeDefined();
      expect(result?.traceId).toBe(traceId);
      expect(result?.spanId).toBe(spanId);
    });

    it('should return null for missing traceparent header', () => {
      const headers = {
        tracestate: '',
        'other-header': 'other-value',
      };

      const result = TraceContextManager.extractFromKafkaHeaders(headers);

      expect(result).toBeNull();
    });

    it('should return null for invalid traceparent format', () => {
      const headers = {
        traceparent: 'invalid-format',
        tracestate: '',
      };

      const result = TraceContextManager.extractFromKafkaHeaders(headers);

      expect(result).toBeNull();
    });

    it('should handle empty headers object', () => {
      const result = TraceContextManager.extractFromKafkaHeaders({});

      expect(result).toBeNull();
    });
  });

  describe('extractFromHttpHeaders', () => {
    it('should extract valid trace context from HTTP headers', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const traceparent = TraceContextManager.formatW3CTraceContext(
        traceId,
        spanId
      );

      const headers = {
        traceparent: traceparent,
        tracestate: '',
        'content-type': 'application/json',
      };

      const result = TraceContextManager.extractFromHttpHeaders(headers);

      expect(result).toBeDefined();
      expect(result?.traceId).toBe(traceId);
      expect(result?.spanId).toBe(spanId);
    });

    it('should return null for missing traceparent header', () => {
      const headers = {
        tracestate: '',
        'content-type': 'application/json',
      };

      const result = TraceContextManager.extractFromHttpHeaders(headers);

      expect(result).toBeNull();
    });
  });

  describe('injectIntoKafkaHeaders', () => {
    it('should inject trace context into Kafka headers', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const existingHeaders = {
        'message-id': '123',
        timestamp: new Date().toISOString(),
      };

      const result = TraceContextManager.injectIntoKafkaHeaders(
        existingHeaders,
        traceId,
        spanId
      );

      expect(result).toBeDefined();
      expect(result.traceparent).toBe(
        TraceContextManager.formatW3CTraceContext(traceId, spanId)
      );
      expect(result.tracestate).toBe('');
      expect(result['message-id']).toBe('123');
      expect(result.timestamp).toBeDefined();
    });

    it('should preserve existing headers when injecting trace context', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const existingHeaders = {
        'custom-header': 'custom-value',
      };

      const result = TraceContextManager.injectIntoKafkaHeaders(
        existingHeaders,
        traceId,
        spanId
      );

      expect(result['custom-header']).toBe('custom-value');
      expect(result.traceparent).toBeDefined();
    });
  });

  describe('injectIntoHttpHeaders', () => {
    it('should inject trace context into HTTP headers', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const existingHeaders = {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      };

      const result = TraceContextManager.injectIntoHttpHeaders(
        existingHeaders,
        traceId,
        spanId
      );

      expect(result).toBeDefined();
      expect(result.traceparent).toBe(
        TraceContextManager.formatW3CTraceContext(traceId, spanId)
      );
      expect(result.tracestate).toBe('');
      expect(result['content-type']).toBe('application/json');
      expect(result.authorization).toBe('Bearer token');
    });
  });

  describe('parseW3CTraceContext', () => {
    it('should parse valid W3C trace context', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const traceparent = TraceContextManager.formatW3CTraceContext(
        traceId,
        spanId
      );

      const result = TraceContextManager.parseW3CTraceContext(traceparent);

      expect(result).toBeDefined();
      expect(result?.traceId).toBe(traceId);
      expect(result?.spanId).toBe(spanId);
      expect(result?.traceFlags).toBe(1);
    });

    it('should return null for invalid traceparent format', () => {
      const result = TraceContextManager.parseW3CTraceContext('invalid-format');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = TraceContextManager.parseW3CTraceContext('');

      expect(result).toBeNull();
    });

    it('should handle malformed traceparent', () => {
      const result = TraceContextManager.parseW3CTraceContext('00-123-456');

      expect(result).toBeNull();
    });
  });

  describe('formatW3CTraceContext', () => {
    it('should format valid W3C trace context', () => {
      const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
      const spanId = '00f067aa0ba902b7';

      const result = TraceContextManager.formatW3CTraceContext(traceId, spanId);

      expect(result).toBe(
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
      );
    });

    it('should handle different trace flags', () => {
      const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
      const spanId = '00f067aa0ba902b7';

      const result = TraceContextManager.formatW3CTraceContext(
        traceId,
        spanId,
        0
      );

      expect(result).toBe(
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'
      );
    });
  });

  describe('isValidTraceContext', () => {
    it('should validate correct trace context', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const traceparent = TraceContextManager.formatW3CTraceContext(
        traceId,
        spanId
      );

      const result = TraceContextManager.isValidTraceContext(traceparent);

      expect(result).toBe(true);
    });

    it('should reject invalid trace context', () => {
      const result = TraceContextManager.isValidTraceContext('invalid-format');

      expect(result).toBe(false);
    });

    it('should reject empty string', () => {
      const result = TraceContextManager.isValidTraceContext('');

      expect(result).toBe(false);
    });
  });

  describe('createTraceContext', () => {
    it('should create new trace context', () => {
      const result = TraceContextManager.createTraceContext();

      expect(result).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.spanId).toBeDefined();
      expect(result.traceFlags).toBe(1);
      expect(result.traceState).toBe('');
    });
  });

  describe('generateTraceId', () => {
    it('should generate valid trace ID', () => {
      const traceId = TraceContextManager.generateTraceId();

      expect(traceId).toBeDefined();
      expect(traceId.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);
    });

    it('should generate unique trace IDs', () => {
      const traceId1 = TraceContextManager.generateTraceId();
      const traceId2 = TraceContextManager.generateTraceId();

      expect(traceId1).not.toBe(traceId2);
    });
  });

  describe('generateSpanId', () => {
    it('should generate valid span ID', () => {
      const spanId = TraceContextManager.generateSpanId();

      expect(spanId).toBeDefined();
      expect(spanId.length).toBe(16);
      expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
    });

    it('should generate unique span IDs', () => {
      const spanId1 = TraceContextManager.generateSpanId();
      const spanId2 = TraceContextManager.generateSpanId();

      expect(spanId1).not.toBe(spanId2);
    });
  });

  describe('toSpanContext', () => {
    it('should convert trace context to span context', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();
      const traceContext = {
        traceId,
        spanId,
        traceFlags: 1,
        traceState: '',
      };

      const result = TraceContextManager.toSpanContext(traceContext);

      expect(result).toBeDefined();
      expect(result.traceId).toBe(traceId);
      expect(result.spanId).toBe(spanId);
      expect(result.traceFlags).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete Kafka message flow', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();

      // Create Kafka message with trace context
      const kafkaMessage = TraceTestHelper.createKafkaMessageWithTrace(
        traceId,
        spanId,
        'new',
        { test: 'data' }
      );

      // Extract trace context
      const extractedContext = TraceContextManager.extractFromKafkaHeaders(
        kafkaMessage.headers
      );

      expect(extractedContext).toBeDefined();
      expect(extractedContext?.traceId).toBe(traceId);
      expect(extractedContext?.spanId).toBe(spanId);

      // Inject into new headers
      const newHeaders = TraceContextManager.injectIntoKafkaHeaders(
        {},
        traceId,
        spanId
      );

      expect(newHeaders.traceparent).toBe(kafkaMessage.headers.traceparent);
    });

    it('should handle HTTP request flow', () => {
      const { traceId, spanId } = TraceTestHelper.generateTestTraceContext();

      // Simulate incoming HTTP request
      const incomingHeaders = {
        traceparent: TraceContextManager.formatW3CTraceContext(traceId, spanId),
        tracestate: '',
        'content-type': 'application/json',
      };

      // Extract trace context
      const extractedContext =
        TraceContextManager.extractFromHttpHeaders(incomingHeaders);

      expect(extractedContext).toBeDefined();
      expect(extractedContext?.traceId).toBe(traceId);

      // Inject into outgoing HTTP request
      const outgoingHeaders = TraceContextManager.injectIntoHttpHeaders(
        {},
        traceId,
        spanId
      );

      expect(outgoingHeaders.traceparent).toBe(incomingHeaders.traceparent);
    });
  });
});
