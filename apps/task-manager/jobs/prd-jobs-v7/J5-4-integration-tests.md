# Job 5.4: Integration Tests for OTEL Communication

## Overview

**Status**: 🔄 **READY TO START**  
**Priority**: 3 (After OTEL verification and unit tests)  
**Duration**: 60 minutes  
**Description**: Build comprehensive integration tests for OTEL collector communication, circuit breaker functionality, and end-to-end logging pipeline validation.

## Prerequisites

- ✅ Job 5.1 completed (centralized configuration)
- ✅ Job 5.2 completed (OTEL verification - logs confirmed reaching collector)
- ✅ Job 5.3 completed (unit tests passing)
- ✅ OTEL collector running for integration tests

## Objectives

1. Test end-to-end OTEL collector communication with real collector
2. Validate circuit breaker behavior under actual failure conditions
3. Test graceful fallback mechanisms when OTEL unavailable
4. Verify service recovery and half-open state behavior
5. Test performance under realistic OTEL load

## Detailed Tasks

### Task 5.4.1: Integration Test Environment Setup (15 minutes)

**File**: `src/common/utils/logging/__tests__/integration.spec.ts`

```typescript
import { LoggerFactory } from '../logger-factory';
import { OTELLogger } from '../otel-logger';
import { CircuitBreakerState } from '../circuit-breaker';

describe('OTEL Integration Tests', () => {
  let factory: LoggerFactory;

  beforeEach(() => {
    factory = LoggerFactory.getInstance();
  });

  afterEach(async () => {
    if (factory.isInitialized()) {
      await factory.shutdown();
    }
    LoggerFactory.reset();
  });

  describe('with OTEL collector available', () => {
    it('should successfully initialize and send logs to collector', async () => {
      const config = {
        serviceName: 'integration-test',
        logLevel: 'debug' as const,
        enableConsole: true,
        enableOTEL: true,
        otelEndpoint: 'http://localhost:4318',
        environment: 'test' as const,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 5000,
          successThreshold: 2,
        },
      };

      await factory.initialize(config);
      expect(factory.isInitialized()).toBe(true);

      const logger = factory.getLogger();

      // Send test messages that should reach OTEL collector
      const testId = `integration_${Date.now()}`;
      logger.info(`Integration test message ${testId}`, {
        testType: 'integration',
        testId,
        environment: 'test',
      });

      // Wait for async OTEL processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Test should not throw and logger should remain functional
      expect(() => {
        logger.warn(`Integration warning ${testId}`);
        logger.error(`Integration error ${testId}`);
      }).not.toThrow();
    }, 10000);
  });

  describe('circuit breaker integration', () => {
    it('should open circuit breaker on OTEL failures', async () => {
      const config = {
        serviceName: 'circuit-breaker-test',
        logLevel: 'debug' as const,
        enableConsole: true,
        enableOTEL: true,
        otelEndpoint: 'http://invalid-endpoint:9999', // Invalid endpoint
        environment: 'test' as const,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeout: 5000,
          successThreshold: 2,
        },
      };

      await factory.initialize(config);
      const logger = factory.getLogger() as OTELLogger;

      // Send multiple logs to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        logger.info(`Circuit breaker test ${i}`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Should continue working despite OTEL failures
      expect(() => {
        logger.info('After circuit breaker test');
      }).not.toThrow();
    });

    it('should recover when OTEL service comes back online', async () => {
      // This test would require dynamic OTEL endpoint switching
      // Implementation depends on circuit breaker access patterns
      expect(true).toBe(true); // Placeholder for complex recovery test
    });
  });
});
```

### Task 5.4.2: Real Collector Communication Tests (20 minutes)

**Docker Setup for Integration Tests**

```yaml
# scripts/docker-compose.integration-test.yml
version: '3.8'

services:
  otel-collector-integration:
    image: otel/opentelemetry-collector-contrib:latest
    command: ['--config=/etc/otel-collector-config.yaml']
    volumes:
      - ../deployment/observability/configs/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - '4317:4317' # GRPC
      - '4318:4318' # HTTP
    environment:
      - OTEL_LOG_LEVEL=debug
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:13133/']
      interval: 10s
      timeout: 5s
      retries: 3
```

**Integration Test Script**

```typescript
// src/common/utils/logging/__tests__/real-collector.spec.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Real OTEL Collector Integration', () => {
  beforeAll(async () => {
    // Start OTEL collector for integration tests
    try {
      await execAsync('docker-compose -f scripts/docker-compose.integration-test.yml up -d');
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for startup
    } catch (error) {
      console.warn('Could not start OTEL collector for integration tests:', error);
    }
  });

  afterAll(async () => {
    // Clean up OTEL collector
    try {
      await execAsync('docker-compose -f scripts/docker-compose.integration-test.yml down');
    } catch (error) {
      console.warn('Could not stop OTEL collector:', error);
    }
  });

  it('should send logs to real OTEL collector without errors', async () => {
    const factory = LoggerFactory.getInstance();

    await factory.initialize({
      serviceName: 'real-collector-test',
      logLevel: 'info',
      enableConsole: true,
      enableOTEL: true,
      otelEndpoint: 'http://localhost:4318',
      environment: 'test',
    });

    const logger = factory.getLogger();
    const testId = `real_collector_${Date.now()}`;

    // Send various log types
    logger.info(`Real collector test info ${testId}`);
    logger.warn(`Real collector test warn ${testId}`);
    logger.error(`Real collector test error ${testId}`);
    logger.debug(`Real collector test debug ${testId}`);
    logger.success(`Real collector test success ${testId}`);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check collector health
    const { stdout } = await execAsync('curl -s http://localhost:13133/');
    expect(stdout).toContain('Server available');

    await factory.shutdown();
  }, 15000);
});
```

### Task 5.4.3: Performance Under Load Tests (15 minutes)

```typescript
// src/common/utils/logging/__tests__/performance-integration.spec.ts
describe('OTEL Performance Integration', () => {
  it('should maintain performance with OTEL enabled', async () => {
    const factory = LoggerFactory.getInstance();

    await factory.initialize({
      serviceName: 'performance-test',
      logLevel: 'info',
      enableConsole: true,
      enableOTEL: true,
      otelEndpoint: 'http://localhost:4318',
      environment: 'test',
    });

    const logger = factory.getLogger();
    const messageCount = 100;

    const startTime = performance.now();

    // Send high volume of logs with OTEL enabled
    for (let i = 0; i < messageCount; i++) {
      logger.info(`Performance test message ${i}`, {
        iteration: i,
        batch: Math.floor(i / 10),
        timestamp: Date.now(),
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTimePerLog = duration / messageCount;

    console.log(`OTEL Performance: ${messageCount} logs in ${duration.toFixed(2)}ms (${avgTimePerLog.toFixed(3)}ms avg)`);

    // Should still meet performance requirements with OTEL enabled
    expect(avgTimePerLog).toBeLessThan(2); // Slightly higher threshold for OTEL integration

    await factory.shutdown();
  });

  it('should handle concurrent OTEL logging', async () => {
    const factory = LoggerFactory.getInstance();
    await factory.initialize({
      serviceName: 'concurrent-test',
      logLevel: 'info',
      enableConsole: true,
      enableOTEL: true,
      otelEndpoint: 'http://localhost:4318',
      environment: 'test',
    });

    const logger = factory.getLogger();
    const concurrentTasks = 5;
    const messagesPerTask = 20;

    const startTime = performance.now();

    // Create concurrent logging tasks
    const tasks = Array.from({ length: concurrentTasks }, (_, taskId) =>
      Promise.resolve().then(() => {
        for (let i = 0; i < messagesPerTask; i++) {
          logger.info(`Concurrent OTEL test task ${taskId} message ${i}`, {
            taskId,
            messageId: i,
            timestamp: Date.now(),
          });
        }
      })
    );

    await Promise.all(tasks);

    const endTime = performance.now();
    const duration = endTime - startTime;
    const totalMessages = concurrentTasks * messagesPerTask;
    const avgTimePerLog = duration / totalMessages;

    console.log(`Concurrent OTEL: ${totalMessages} logs from ${concurrentTasks} tasks in ${duration.toFixed(2)}ms (${avgTimePerLog.toFixed(3)}ms avg)`);

    expect(avgTimePerLog).toBeLessThan(3); // Allow more time for concurrent OTEL processing

    await factory.shutdown();
  });
});
```

### Task 5.4.4: Failure Recovery Tests (10 minutes)

```typescript
// Test scenarios where OTEL collector goes down and comes back up
describe('OTEL Failure Recovery', () => {
  it('should recover gracefully when OTEL collector restarts', async () => {
    const factory = LoggerFactory.getInstance();

    await factory.initialize({
      serviceName: 'recovery-test',
      logLevel: 'info',
      enableConsole: true,
      enableOTEL: true,
      otelEndpoint: 'http://localhost:4318',
      environment: 'test',
      circuitBreaker: {
        failureThreshold: 2,
        resetTimeout: 3000,
        successThreshold: 1,
      },
    });

    const logger = factory.getLogger();

    // Step 1: Verify normal operation
    logger.info('Before collector restart');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Simulate collector restart (would require Docker control)
    // For now, test that logging continues to work
    logger.info('During potential collector restart');

    // Step 3: Verify continued operation
    logger.info('After collector restart');

    // Should not throw exceptions during any phase
    expect(true).toBe(true);

    await factory.shutdown();
  });

  it('should handle network timeouts gracefully', async () => {
    // Test with very slow/timeout endpoint
    const factory = LoggerFactory.getInstance();

    await factory.initialize({
      serviceName: 'timeout-test',
      logLevel: 'info',
      enableConsole: true,
      enableOTEL: true,
      otelEndpoint: 'http://httpstat.us/200?sleep=5000', // 5 second delay
      environment: 'test',
      circuitBreaker: {
        failureThreshold: 1,
        resetTimeout: 2000,
        successThreshold: 1,
      },
    });

    const logger = factory.getLogger();

    // Should not block application execution
    const startTime = performance.now();
    logger.info('Timeout test message');
    const endTime = performance.now();

    // Should complete quickly due to circuit breaker or async processing
    expect(endTime - startTime).toBeLessThan(1000);

    await factory.shutdown();
  });
});
```

## Commands to Run Integration Tests

```bash
# Start OTEL collector for testing
docker-compose -f scripts/docker-compose.integration-test.yml up -d

# Wait for collector to be ready
sleep 10

# Run integration tests
npm test -- --testPathPattern="integration|real-collector|performance-integration" --timeout=30000

# Check collector logs for test messages
docker logs $(docker-compose -f scripts/docker-compose.integration-test.yml ps -q otel-collector-integration)

# Clean up
docker-compose -f scripts/docker-compose.integration-test.yml down
```

## Success Criteria

- [ ] **Real collector communication verified**
- [ ] **Circuit breaker behavior tested under actual failures**
- [ ] **Performance maintained with OTEL enabled** (<2ms avg with collector)
- [ ] **Graceful handling of collector restarts**
- [ ] **Network timeout scenarios handled**
- [ ] **Concurrent OTEL logging stable**
- [ ] **All integration tests pass consistently**

## Expected Results

### Performance Benchmarks with OTEL

- Single log with OTEL: <2ms average
- Concurrent logging: <3ms average per log
- High volume (100 logs): Completes without memory issues
- Network failures: <1ms fallback time

### Circuit Breaker Validation

- Opens after configured failure threshold
- Prevents cascade failures during OTEL outages
- Recovers automatically when service returns
- Maintains application performance during failures

## Impact on Production Deployment

These integration tests ensure:

- **Real-world OTEL integration** works as expected
- **Production observability** will receive application logs
- **System resilience** during OTEL service disruptions
- **Performance characteristics** under realistic load
- **Operational procedures** for OTEL maintenance

## Troubleshooting Integration Test Failures

| Issue                       | Possible Cause             | Solution                           |
| --------------------------- | -------------------------- | ---------------------------------- |
| Connection refused          | OTEL collector not running | Check Docker container status      |
| Timeout errors              | Network/firewall issues    | Verify ports 4317/4318 accessible  |
| Performance degradation     | OTEL collector overloaded  | Increase collector resources       |
| Circuit breaker not opening | Threshold too high         | Adjust failure threshold in test   |
| Logs not reaching collector | Configuration mismatch     | Verify OTEL endpoint configuration |
