import { TraceManager } from '../trace-manager';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { TraceTestHelper } from '../../../../test-utils/trace-test-helper';

describe('TraceManager', () => {
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = TraceManager.getInstance();
    TraceTestHelper.clearCapturedSpans();
    TraceTestHelper.captureSpans();
  });

  afterEach(() => {
    TraceTestHelper.clearCapturedSpans();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TraceManager.getInstance();
      const instance2 = TraceManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createSpan', () => {
    it('should create span with attributes', () => {
      const attributes = { 'test.key': 'test.value' };
      const span = traceManager.createSpan('test.span', attributes);

      expect(span).toBeDefined();
      expect(span.name).toBe('test.span');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);
    });

    it('should create span without attributes', () => {
      const span = traceManager.createSpan('test.span');

      expect(span).toBeDefined();
      expect(span.name).toBe('test.span');
    });
  });

  describe('createChildSpan', () => {
    it('should create child span with parent context', () => {
      const parentSpan = traceManager.createSpan('parent.span');
      const childSpan = traceManager.createChildSpan('child.span', parentSpan);

      expect(childSpan).toBeDefined();
      expect(childSpan.name).toBe('child.span');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(2);
    });
  });

  describe('traceOperation', () => {
    it('should trace successful operation', async () => {
      const result = await traceManager.traceOperation(
        'test.operation',
        async () => 'success',
        { 'test.key': 'test.value' }
      );

      expect(result).toBe('success');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);

      const span = capturedSpans[0];
      expect(span.getStatus().code).toBe(SpanStatusCode.OK);
    });

    it('should trace failed operation', async () => {
      const error = new Error('Test error');

      await expect(
        traceManager.traceOperation(
          'test.operation',
          async () => {
            throw error;
          },
          { 'test.key': 'test.value' }
        )
      ).rejects.toThrow('Test error');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);

      const span = capturedSpans[0];
      expect(span.getStatus().code).toBe(SpanStatusCode.ERROR);
    });

    it('should trace operation without attributes', async () => {
      const result = await traceManager.traceOperation(
        'test.operation',
        async () => 'success'
      );

      expect(result).toBe('success');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);
    });
  });

  describe('traceOperationWithContext', () => {
    it('should trace operation with existing context', async () => {
      const parentSpan = traceManager.createSpan('parent.span');
      const parentContext = parentSpan.spanContext();

      const result = await traceManager.traceOperationWithContext(
        'test.operation',
        parentContext,
        async () => 'success',
        { 'test.key': 'test.value' }
      );

      expect(result).toBe('success');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(2);
    });
  });

  describe('getCurrentContext', () => {
    it('should return current span context', () => {
      const span = traceManager.createSpan('test.span');
      const context = traceManager.getCurrentContext();

      expect(context).toBeDefined();
      expect(context.traceId).toBe(span.spanContext().traceId);
    });
  });

  describe('addEvent', () => {
    it('should add event to current span', () => {
      const span = traceManager.createSpan('test.span');
      traceManager.addEvent('test.event', { 'event.key': 'event.value' });

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);
    });
  });

  describe('setAttributes', () => {
    it('should set attributes on current span', () => {
      const span = traceManager.createSpan('test.span');
      traceManager.setAttributes({ 'attr.key': 'attr.value' });

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);
    });
  });

  describe('recordException', () => {
    it('should record exception on current span', () => {
      const span = traceManager.createSpan('test.span');
      const error = new Error('Test exception');
      traceManager.recordException(error);

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(1);
    });
  });

  describe('performance', () => {
    it('should have minimal overhead for span creation', async () => {
      const overhead = await TraceTestHelper.measureTracingOverhead(
        async () => {
          for (let i = 0; i < 100; i++) {
            traceManager.createSpan(`test.span.${i}`);
          }
        }
      );

      expect(overhead).toBeLessThan(50); // Less than 50ms for 100 spans
    });

    it('should have minimal overhead for traced operations', async () => {
      const overhead = await TraceTestHelper.measureTracingOverhead(
        async () => {
          for (let i = 0; i < 50; i++) {
            await traceManager.traceOperation(
              `test.operation.${i}`,
              async () => 'success'
            );
          }
        }
      );

      expect(overhead).toBeLessThan(100); // Less than 100ms for 50 operations
    });
  });

  describe('error handling', () => {
    it('should handle null span gracefully', () => {
      expect(() => {
        traceManager.createChildSpan('child.span', null as any);
      }).not.toThrow();
    });

    it('should handle invalid context gracefully', async () => {
      const result = await traceManager.traceOperationWithContext(
        'test.operation',
        null as any,
        async () => 'success'
      );

      expect(result).toBe('success');
    });
  });
});
