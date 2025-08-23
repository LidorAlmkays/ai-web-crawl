# Job 13: Integration Testing

## Objective
Create comprehensive integration tests that validate the end-to-end request flow, Kafka message publishing, error handling, and system behavior under various conditions.

## Prerequisites
- Job 12: Application Entry Points completed
- Full application working
- All components integrated
- Test infrastructure available

## Inputs
- Complete application implementation
- Test configuration
- Mock/test utilities
- Performance testing tools

## Detailed Implementation Steps

### Step 1: Setup Test Infrastructure
```typescript
// src/__tests__/setup.ts
import 'reflect-metadata';
import { Application } from '../app';
import { KafkaFactory } from '../infrastructure/messaging/kafka/kafka.factory';

export class TestApplication {
  private app: Application;
  private kafkaFactory: KafkaFactory;

  async setup(): Promise<void> {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.APP_PORT = '0'; // Random port
    process.env.KAFKA_BROKERS = 'localhost:9092';
    
    this.app = new Application();
    this.kafkaFactory = KafkaFactory.getInstance();
    
    await this.app.start();
  }

  async teardown(): Promise<void> {
    await this.app.stop();
    await this.kafkaFactory.disconnect();
  }

  getApp() {
    return this.app.getApp();
  }
}
```

### Step 2: Create End-to-End Tests
```typescript
// src/__tests__/integration/end-to-end.spec.ts
import request from 'supertest';
import { TestApplication } from '../setup';
import { KafkaFactory } from '../../infrastructure/messaging/kafka/kafka.factory';

describe('End-to-End Integration Tests', () => {
  let testApp: TestApplication;
  let app: any;
  let kafkaConsumer: any;
  let receivedMessages: any[] = [];

  beforeAll(async () => {
    testApp = new TestApplication();
    await testApp.setup();
    app = testApp.getApp();

    // Setup Kafka consumer to verify messages
    const kafka = KafkaFactory.getInstance().getKafka();
    kafkaConsumer = kafka.consumer({ groupId: 'test-consumer' });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({ topic: 'task-status' });
    
    await kafkaConsumer.run({
      eachMessage: async ({ message }: any) => {
        receivedMessages.push({
          key: message.key?.toString(),
          value: JSON.parse(message.value?.toString() || '{}'),
          headers: message.headers,
        });
      },
    });
  });

  afterAll(async () => {
    await kafkaConsumer.disconnect();
    await testApp.teardown();
  });

  beforeEach(() => {
    receivedMessages = [];
  });

  describe('Web Crawl Request Flow', () => {
    it('should process valid web crawl request end-to-end', async () => {
      const requestData = {
        userEmail: 'test@example.com',
        query: 'test search query',
        originalUrl: 'https://example.com',
      };

      const response = await request(app)
        .post('/api/web-crawl')
        .send(requestData)
        .expect(202);

      expect(response.body).toMatchObject({
        message: 'Web crawl task received successfully',
        status: 'accepted',
      });

      // Wait for Kafka message
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].value).toMatchObject({
        userEmail: requestData.userEmail,
        query: requestData.query,
        originalUrl: requestData.originalUrl,
        status: 'new',
      });

      // Verify headers
      expect(receivedMessages[0].headers).toHaveProperty('task-type');
      expect(receivedMessages[0].headers).toHaveProperty('source-service');
      expect(receivedMessages[0].headers).toHaveProperty('traceparent');
    });

    it('should handle validation errors correctly', async () => {
      const invalidData = {
        userEmail: 'invalid-email',
        query: '', // Too short
        originalUrl: 'not-a-url',
      };

      const response = await request(app)
        .post('/api/web-crawl')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('error');

      // Should not publish invalid requests to Kafka
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(receivedMessages).toHaveLength(0);
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        userEmail: 'test@example.com',
        // Missing query and originalUrl
      };

      await request(app)
        .post('/api/web-crawl')
        .send(incompleteData)
        .expect(400);

      expect(receivedMessages).toHaveLength(0);
    });
  });

  describe('Trace Context Propagation', () => {
    it('should propagate trace context through the system', async () => {
      const traceparent = '00-12345678901234567890123456789012-1234567890123456-01';
      const tracestate = 'vendor=value';

      const requestData = {
        userEmail: 'test@example.com',
        query: 'test query',
        originalUrl: 'https://example.com',
      };

      await request(app)
        .post('/api/web-crawl')
        .set('traceparent', traceparent)
        .set('tracestate', tracestate)
        .send(requestData)
        .expect(202);

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].headers.traceparent.toString()).toBe(traceparent);
      expect(receivedMessages[0].headers.tracestate.toString()).toBe(tracestate);
    });
  });
});
```

### Step 3: Create Performance Tests
```typescript
// src/__tests__/performance/load.spec.ts
import request from 'supertest';
import { TestApplication } from '../setup';

describe('Performance Tests', () => {
  let testApp: TestApplication;
  let app: any;

  beforeAll(async () => {
    testApp = new TestApplication();
    await testApp.setup();
    app = testApp.getApp();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('should handle high concurrent requests', async () => {
    const requestData = {
      userEmail: 'test@example.com',
      query: 'performance test',
      originalUrl: 'https://example.com',
    };

    const concurrentRequests = 100;
    const startTime = Date.now();

    const promises = Array.from({ length: concurrentRequests }, () =>
      request(app)
        .post('/api/web-crawl')
        .send(requestData)
        .expect(202)
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(responses).toHaveLength(concurrentRequests);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    const avgResponseTime = duration / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(50); // Average < 50ms per request
  });

  it('should maintain performance under sustained load', async () => {
    const requestData = {
      userEmail: 'test@example.com',
      query: 'sustained load test',
      originalUrl: 'https://example.com',
    };

    const requestsPerSecond = 50;
    const durationSeconds = 10;
    const totalRequests = requestsPerSecond * durationSeconds;

    const startTime = Date.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < totalRequests; i++) {
      promises.push(
        request(app)
          .post('/api/web-crawl')
          .send(requestData)
          .expect(202)
      );

      // Throttle to maintain requests per second
      if (i % requestsPerSecond === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const responses = await Promise.all(promises);
    const endTime = Date.now();

    expect(responses).toHaveLength(totalRequests);
    expect(endTime - startTime).toBeLessThan((durationSeconds + 2) * 1000);
  });
});
```

### Step 4: Create Error Handling Tests
```typescript
// src/__tests__/integration/error-handling.spec.ts
import request from 'supertest';
import { TestApplication } from '../setup';

describe('Error Handling Integration Tests', () => {
  let testApp: TestApplication;
  let app: any;

  beforeAll(async () => {
    testApp = new TestApplication();
    await testApp.setup();
    app = testApp.getApp();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('HTTP Error Responses', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .post('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        message: 'Endpoint not found',
        error: 'Not Found',
      });
    });

    it('should return 400 for malformed JSON', async () => {
      await request(app)
        .post('/api/web-crawl')
        .send('invalid json{')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should handle content-length mismatch gracefully', async () => {
      await request(app)
        .post('/api/web-crawl')
        .set('Content-Length', '1000')
        .send('{}')
        .expect(400);
    });
  });

  describe('Service Error Scenarios', () => {
    it('should handle Kafka connection failures gracefully', async () => {
      // Temporarily break Kafka connection
      process.env.KAFKA_BROKERS = 'invalid:9092';

      const requestData = {
        userEmail: 'test@example.com',
        query: 'test query',
        originalUrl: 'https://example.com',
      };

      const response = await request(app)
        .post('/api/web-crawl')
        .send(requestData)
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('service unavailable'),
      });

      // Restore Kafka connection
      process.env.KAFKA_BROKERS = 'localhost:9092';
    });
  });
});
```

### Step 5: Create Health Check Tests
```typescript
// src/__tests__/integration/health-check.spec.ts
import request from 'supertest';
import { TestApplication } from '../setup';

describe('Health Check Integration Tests', () => {
  let testApp: TestApplication;
  let app: any;

  beforeAll(async () => {
    testApp = new TestApplication();
    await testApp.setup();
    app = testApp.getApp();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('should return healthy status when all systems are working', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      checks: expect.objectContaining({
        service: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.any(Object),
        version: expect.any(String),
      }),
    });
  });

  it('should provide metrics endpoint', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect(200);

    expect(response.text).toContain('gateway_web_crawl_requests_total');
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('should provide API info endpoint', async () => {
    const response = await request(app)
      .get('/api/info')
      .expect(200);

    expect(response.body).toMatchObject({
      service: 'gateway',
      version: expect.any(String),
      environment: expect.any(String),
      endpoints: expect.arrayContaining([
        'GET /health',
        'POST /api/web-crawl',
        'GET /api/info',
        'GET /metrics',
      ]),
    });
  });
});
```

### Step 6: Create Test Configuration
```typescript
// jest.config.integration.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests serially to avoid port conflicts
};
```

## Outputs
- `src/__tests__/setup.ts`
- `src/__tests__/integration/end-to-end.spec.ts`
- `src/__tests__/performance/load.spec.ts`
- `src/__tests__/integration/error-handling.spec.ts`
- `src/__tests__/integration/health-check.spec.ts`
- `jest.config.integration.js`
- Comprehensive test suite

## Testing Criteria

### Test Coverage
- [ ] End-to-end request flow covered
- [ ] Error scenarios tested
- [ ] Performance requirements validated
- [ ] Health checks verified
- [ ] Kafka integration tested
- [ ] Trace context propagation verified

### Integration Scenarios
- [ ] Valid request processing
- [ ] Invalid request handling
- [ ] Concurrent request handling
- [ ] Service failure scenarios
- [ ] Network timeout scenarios
- [ ] Resource exhaustion scenarios

### Performance Validation
- [ ] Response time < 100ms (95th percentile)
- [ ] Throughput > 100 requests/second
- [ ] Memory usage stable under load
- [ ] No memory leaks detected
- [ ] Graceful degradation under stress

### Quality Metrics
- [ ] Test coverage > 80%
- [ ] All critical paths tested
- [ ] Error handling comprehensive
- [ ] Performance benchmarks met
- [ ] Documentation complete

## Performance Requirements
- Test execution time: < 60 seconds for full suite
- Memory usage during tests: < 500MB
- Test reliability: > 99% pass rate
- Setup/teardown time: < 10 seconds each

## Error Handling
- Test failures should provide clear diagnostics
- Resource cleanup on test failure
- Proper isolation between tests
- Timeout handling for long-running tests

## Success Criteria
- [ ] All integration tests pass
- [ ] Performance requirements met
- [ ] Error scenarios handled correctly
- [ ] Test coverage adequate
- [ ] Test suite is reliable
- [ ] Documentation complete
- [ ] CI/CD integration ready

## Rollback Plan
If tests fail:
1. Document failing scenarios
2. Fix underlying implementation issues
3. Adjust test expectations if needed
4. Ensure test environment stability

## Notes
- Use test containers for Kafka if available
- Ensure tests are deterministic
- Clean up resources between tests
- Monitor test performance
- Add debugging capabilities
- Consider contract testing
- Plan for CI/CD integration
- Document test scenarios clearly
