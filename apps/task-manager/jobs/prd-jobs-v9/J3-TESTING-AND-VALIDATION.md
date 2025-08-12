# Job 3: Testing and Validation

## Overview

Implement comprehensive testing and validation for the distributed tracing implementation, including unit tests, integration tests, and performance validation.

## Objectives

- Create comprehensive unit test suite for all tracing components
- Implement integration tests for end-to-end trace flow
- Validate performance impact and optimization
- Test distributed tracing scenarios
- Create test utilities for trace validation

## Files to Create/Modify

### 1. Trace Test Helper

**File**: `apps/task-manager/src/test-utils/trace-test-helper.ts`

**Implementation**:

```typescript
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { TraceContextManager } from '../common/utils/tracing/trace-context';

export interface TraceValidationResult {
  isValid: boolean;
  errors: string[];
  spans: Span[];
  traceId?: string;
  duration?: number;
}

export class TraceTestHelper {
  private static capturedSpans: Span[] = [];

  /**
   * Capture spans for testing
   */
  static captureSpans(): void {
    // Mock span processor to capture spans
    const originalStartSpan = trace.getTracer('test').startSpan;
    trace.getTracer('test').startSpan = (name: string, options?: any) => {
      const span = originalStartSpan.call(trace.getTracer('test'), name, options);
      this.capturedSpans.push(span);
      return span;
    };
  }

  /**
   * Clear captured spans
   */
  static clearCapturedSpans(): void {
    this.capturedSpans = [];
  }

  /**
   * Get captured spans
   */
  static getCapturedSpans(): Span[] {
    return [...this.capturedSpans];
  }

  /**
   * Validate trace structure
   */
  static validateTraceStructure(spans: Span[]): TraceValidationResult {
    const errors: string[] = [];
    const traceIds = new Set<string>();

    for (const span of spans) {
      const context = span.context();
      traceIds.add(context.traceId);

      // Validate span has required attributes
      if (!span.name) {
        errors.push(`Span missing name: ${span}`);
      }

      // Validate span status
      const status = span.getStatus();
      if (status.code === SpanStatusCode.ERROR && !status.message) {
        errors.push(`Error span missing message: ${span.name}`);
      }
    }

    // Validate trace consistency
    if (traceIds.size > 1) {
      errors.push(`Multiple trace IDs found: ${Array.from(traceIds).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      spans,
      traceId: traceIds.size === 1 ? Array.from(traceIds)[0] : undefined,
    };
  }

  /**
   * Validate distributed trace context
   */
  static validateDistributedTraceContext(parentTraceId: string, childSpans: Span[]): TraceValidationResult {
    const errors: string[] = [];

    for (const span of childSpans) {
      const context = span.context();
      if (context.traceId !== parentTraceId) {
        errors.push(`Child span has different trace ID: expected ${parentTraceId}, got ${context.traceId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      spans: childSpans,
      traceId: parentTraceId,
    };
  }

  /**
   * Create mock Kafka message with trace context
   */
  static createMockKafkaMessageWithTrace(topic: string, value: any, traceId: string, spanId: string): any {
    const traceparent = `00-${traceId}-${spanId}-01`;

    return {
      topic,
      partition: 0,
      offset: 123,
      key: 'test-key',
      value: JSON.stringify(value),
      headers: {
        traceparent: traceparent,
        tracestate: '',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Create mock Kafka message without trace context
   */
  static createMockKafkaMessageWithoutTrace(topic: string, value: any): any {
    return {
      topic,
      partition: 0,
      offset: 123,
      key: 'test-key',
      value: JSON.stringify(value),
      headers: {},
      timestamp: Date.now(),
    };
  }

  /**
   * Measure trace operation performance
   */
  static async measureTracePerformance<T>(
    operation: () => Promise<T>,
    iterations: number = 100
  ): Promise<{
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
  }> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      durations.push(end - start);
    }

    durations.sort((a, b) => a - b);

    return {
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Validate trace attributes
   */
  static validateTraceAttributes(span: Span, expectedAttributes: Record<string, any>): string[] {
    const errors: string[] = [];
    const actualAttributes = span.attributes || {};

    for (const [key, expectedValue] of Object.entries(expectedAttributes)) {
      const actualValue = actualAttributes[key];
      if (actualValue !== expectedValue) {
        errors.push(`Attribute mismatch for ${key}: expected ${expectedValue}, got ${actualValue}`);
      }
    }

    return errors;
  }

  /**
   * Simulate OTEL collector for testing
   */
  static createMockOTELCollector(): {
    receivedSpans: Span[];
    reset: () => void;
    getSpanCount: () => number;
  } {
    const receivedSpans: Span[] = [];

    return {
      receivedSpans,
      reset: () => {
        receivedSpans.length = 0;
      },
      getSpanCount: () => receivedSpans.length,
    };
  }
}
```

### 2. Unit Tests for Trace Manager

**File**: `apps/task-manager/src/common/utils/tracing/__tests__/trace-manager.spec.ts`

**Implementation**:

```typescript
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
  });

  describe('traceOperation', () => {
    it('should trace successful operation', async () => {
      const result = await traceManager.traceOperation('test.operation', async () => 'success', { 'test.key': 'test.value' });

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
      expect(span.getStatus().message).toBe('Test error');
    });
  });

  describe('traceOperationWithContext', () => {
    it('should trace operation with parent context', async () => {
      const parentSpan = trace.getTracer('test').startSpan('parent.span');
      const parentContext = parentSpan.context();

      const result = await traceManager.traceOperationWithContext('child.operation', parentContext, async () => 'success', { 'test.key': 'test.value' });

      expect(result).toBe('success');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      expect(capturedSpans).toHaveLength(2); // parent + child

      const childSpan = capturedSpans[1];
      expect(childSpan.getStatus().code).toBe(SpanStatusCode.OK);
    });
  });
});
```

### 3. Unit Tests for Trace Context

**File**: `apps/task-manager/src/common/utils/tracing/__tests__/trace-context.spec.ts`

**Implementation**:

```typescript
import { TraceContextManager } from '../trace-context';
import { trace } from '@opentelemetry/api';

describe('TraceContextManager', () => {
  describe('extractFromKafkaHeaders', () => {
    it('should extract valid trace context from Kafka headers', () => {
      const traceId = '0af7651916cd43dd8448eb211c80319c';
      const spanId = 'b7ad6b7169203331';
      const traceparent = `00-${traceId}-${spanId}-01`;

      const headers = {
        traceparent: traceparent,
        tracestate: 'congo=t61rcWkgMzE',
      };

      const result = TraceContextManager.extractFromKafkaHeaders(headers);

      expect(result).toBeDefined();
      expect(result?.traceId).toBe(traceId);
      expect(result?.spanId).toBe(spanId);
      expect(result?.traceFlags).toBe(1);
      expect(result?.traceState).toBe('congo=t61rcWkgMzE');
    });

    it('should return null for missing traceparent', () => {
      const headers = {
        tracestate: 'congo=t61rcWkgMzE',
      };

      const result = TraceContextManager.extractFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });

    it('should return null for invalid traceparent format', () => {
      const headers = {
        traceparent: 'invalid-format',
      };

      const result = TraceContextManager.extractFromKafkaHeaders(headers);
      expect(result).toBeNull();
    });
  });

  describe('extractFromHttpHeaders', () => {
    it('should extract valid trace context from HTTP headers', () => {
      const traceId = '0af7651916cd43dd8448eb211c80319c';
      const spanId = 'b7ad6b7169203331';
      const traceparent = `00-${traceId}-${spanId}-01`;

      const headers = {
        traceparent: traceparent,
        tracestate: 'congo=t61rcWkgMzE',
      };

      const result = TraceContextManager.extractFromHttpHeaders(headers);

      expect(result).toBeDefined();
      expect(result?.traceId).toBe(traceId);
      expect(result?.spanId).toBe(spanId);
    });
  });

  describe('injectIntoKafkaHeaders', () => {
    it('should inject trace context into Kafka headers', () => {
      const span = trace.getTracer('test').startSpan('test.span');
      const context = span.context();

      const headers = TraceContextManager.injectIntoKafkaHeaders(context);

      expect(headers).toHaveProperty('traceparent');
      expect(headers).toHaveProperty('tracestate');
      expect(headers.traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-[0-9a-f]{2}$/);

      span.end();
    });
  });
});
```

### 4. Integration Tests

**File**: `apps/task-manager/src/test-utils/__tests__/trace-integration.spec.ts`

**Implementation**:

```typescript
import { TraceTestHelper } from '../trace-test-helper';
import { TracedKafkaApiManager } from '../../api/kafka/traced-kafka-api-manager';
import { TracedWebCrawlTaskManager } from '../../application/services/traced-web-crawl-task-manager';
import { TracedWebCrawlTaskRepository } from '../../infrastructure/persistence/postgres/traced-web-crawl-task-repository';

describe('Trace Integration Tests', () => {
  let tracedKafkaManager: TracedKafkaApiManager;
  let tracedTaskManager: TracedWebCrawlTaskManager;
  let tracedRepository: TracedWebCrawlTaskRepository;

  beforeEach(() => {
    TraceTestHelper.clearCapturedSpans();
    TraceTestHelper.captureSpans();

    // Mock dependencies
    const mockKafkaClient = {} as any;
    const mockPool = {} as any;

    tracedRepository = new TracedWebCrawlTaskRepository(mockPool);
    tracedTaskManager = new TracedWebCrawlTaskManager(tracedRepository);
    tracedKafkaManager = new TracedKafkaApiManager(mockKafkaClient, {
      webCrawlTaskManager: tracedTaskManager,
    });
  });

  afterEach(() => {
    TraceTestHelper.clearCapturedSpans();
  });

  describe('End-to-End Trace Flow', () => {
    it('should maintain trace context through Kafka message processing', async () => {
      const traceId = '0af7651916cd43dd8448eb211c80319c';
      const spanId = 'b7ad6b7169203331';

      const message = TraceTestHelper.createMockKafkaMessageWithTrace('test-topic', { url: 'https://example.com', priority: 'HIGH' }, traceId, spanId);

      await tracedKafkaManager.processMessage(message);

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      const validation = TraceTestHelper.validateDistributedTraceContext(traceId, capturedSpans);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should create new trace when no context provided', async () => {
      const message = TraceTestHelper.createMockKafkaMessageWithoutTrace('test-topic', { url: 'https://example.com', priority: 'HIGH' });

      await tracedKafkaManager.processMessage(message);

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      const validation = TraceTestHelper.validateTraceStructure(capturedSpans);

      expect(validation.isValid).toBe(true);
      expect(validation.traceId).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should have minimal performance impact for trace operations', async () => {
      const performance = await TraceTestHelper.measureTracePerformance(async () => {
        await tracedTaskManager.createTask({
          url: 'https://example.com',
          priority: 'HIGH',
        });
      }, 100);

      // Performance requirements: <1ms average overhead
      expect(performance.averageDuration).toBeLessThan(1);
      expect(performance.p95Duration).toBeLessThan(2);
      expect(performance.p99Duration).toBeLessThan(5);
    });

    it('should handle high-volume trace operations efficiently', async () => {
      const performance = await TraceTestHelper.measureTracePerformance(async () => {
        await tracedRepository.findById('test-id');
      }, 1000);

      // High-volume requirements: <0.5ms average overhead
      expect(performance.averageDuration).toBeLessThan(0.5);
      expect(performance.p99Duration).toBeLessThan(2);
    });
  });

  describe('Error Handling', () => {
    it('should preserve trace context during errors', async () => {
      const traceId = '0af7651916cd43dd8448eb211c80319c';
      const spanId = 'b7ad6b7169203331';

      const message = TraceTestHelper.createMockKafkaMessageWithTrace('test-topic', { invalid: 'data' }, traceId, spanId);

      // Mock repository to throw error
      jest.spyOn(tracedRepository, 'create').mockRejectedValue(new Error('Database error'));

      await expect(tracedKafkaManager.processMessage(message)).rejects.toThrow('Database error');

      const capturedSpans = TraceTestHelper.getCapturedSpans();
      const errorSpans = capturedSpans.filter(
        (span) => span.getStatus().code === 2 // ERROR
      );

      expect(errorSpans.length).toBeGreaterThan(0);

      const validation = TraceTestHelper.validateDistributedTraceContext(traceId, capturedSpans);
      expect(validation.isValid).toBe(true);
    });
  });
});
```

### 5. Performance Validation Tests

**File**: `apps/task-manager/src/test-utils/__tests__/performance-validation.spec.ts`

**Implementation**:

```typescript
import { TraceTestHelper } from '../trace-test-helper';
import { TraceManager } from '../../common/utils/tracing/trace-manager';

describe('Performance Validation', () => {
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = TraceManager.getInstance();
    TraceTestHelper.clearCapturedSpans();
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during high-volume tracing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate high-volume tracing
      for (let i = 0; i < 10000; i++) {
        await traceManager.traceOperation(`test.operation.${i}`, async () => 'success', { iteration: i });
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (<50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent trace operations efficiently', async () => {
      const concurrency = 100;
      const operations = Array.from({ length: concurrency }, (_, i) =>
        traceManager.traceOperation(`concurrent.operation.${i}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return `result-${i}`;
        })
      );

      const start = performance.now();
      const results = await Promise.all(operations);
      const end = performance.now();

      const totalDuration = end - start;

      expect(results).toHaveLength(concurrency);
      expect(totalDuration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Batch Processing', () => {
    it('should efficiently handle batch trace operations', async () => {
      const batchSize = 1000;
      const batches = 10;

      const performance = await TraceTestHelper.measureTracePerformance(async () => {
        const batchOperations = Array.from({ length: batchSize }, (_, i) => traceManager.traceOperation(`batch.operation.${i}`, async () => 'success'));
        await Promise.all(batchOperations);
      }, batches);

      // Batch processing should be efficient
      expect(performance.averageDuration).toBeLessThan(100); // <100ms per batch
      expect(performance.p95Duration).toBeLessThan(200);
    });
  });
});
```

## Test Configuration

### 1. Jest Configuration Update

**File**: `apps/task-manager/jest.config.js` (Enhanced)

**Changes**:

```javascript
module.exports = {
  // ... existing config ...

  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],

  // Add test environment variables
  testEnvironmentOptions: {
    env: {
      TRACING_ENABLED: 'true',
      TRACING_SAMPLING_RATE: '1.0',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318/v1/traces',
    },
  },

  // Coverage configuration
  collectCoverageFrom: ['src/common/utils/tracing/**/*.ts', 'src/application/services/traced-*.ts', 'src/api/kafka/traced-*.ts', 'src/infrastructure/persistence/postgres/traced-*.ts', '!**/*.spec.ts', '!**/*.test.ts'],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 2. Test Setup Enhancement

**File**: `apps/task-manager/src/test-setup.ts` (Enhanced)

**Changes**:

```typescript
// ... existing setup ...

// Initialize tracing for tests
import { initOpenTelemetry } from './common/utils/otel-init';

beforeAll(() => {
  // Initialize OTEL for testing
  initOpenTelemetry();
});

beforeEach(() => {
  // Clear any captured spans
  if (global.TraceTestHelper) {
    global.TraceTestHelper.clearCapturedSpans();
  }
});

afterEach(() => {
  // Clean up spans
  if (global.TraceTestHelper) {
    global.TraceTestHelper.clearCapturedSpans();
  }
});
```

## Success Criteria

- [ ] All unit tests pass with >80% coverage
- [ ] Integration tests validate end-to-end trace flow
- [ ] Performance tests show <1ms overhead per operation
- [ ] Memory usage tests show no significant leaks
- [ ] Concurrent operation tests pass
- [ ] Error handling tests preserve trace context
- [ ] Distributed tracing tests work correctly
- [ ] Test utilities are comprehensive and reusable

## Dependencies

- Job 1: Core Tracing Infrastructure (must be completed first)
- Job 2: Business Logic Instrumentation (must be completed first)
- Jest testing framework
- Performance testing utilities

## Estimated Time

**2-3 days**

## Next Steps

After completing this job, proceed to Job 4: Deployment and Monitoring.
