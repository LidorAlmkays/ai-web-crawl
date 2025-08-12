# Job 5: Testing and Validation

## Overview

**Status**: ✅ **COMPLETED**  
**Dependency Level**: 4 (Depends on Job 4)  
**Duration**: 2-3 hours  
**Description**: Create comprehensive test suite and validate the complete OTEL logger system. This job ensures the logger works correctly under various conditions and meets all performance requirements.

## Prerequisites

- ✅ Job 4 completed (integrated logger system)
- ✅ Jest testing framework available
- ✅ OTEL collector running (for integration tests)

## Dependencies

**Requires**: Job 4 (Integration and Global Export)  
**Blocks**: Job 6

## Objectives

1. Create unit tests for all logger components
2. Build integration tests for OTEL collector communication
3. Validate console output formatting matches requirements
4. Test error scenarios and fallback behavior
5. Verify performance meets requirements (< 1ms overhead)
6. Ensure memory usage remains stable under load

## Detailed Tasks

### Task 5.1: Setup Test Environment

**Estimated Time**: 20 minutes

Configure Jest for testing the logger system:

```json
// Verify apps/task-manager/jest.config.js has proper configuration:
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test-*.ts', // Exclude temporary test files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
```

### Task 5.2: Unit Tests for Logger Factory

**Estimated Time**: 45 minutes

Test the core factory functionality:

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/logger-factory.spec.ts

import { LoggerFactory } from '../logger-factory';
import { LoggerState, LoggerError, LoggerErrorType } from '../types';
import { createLoggerConfig } from '../config';

// Mock OTEL Logger to avoid external dependencies in unit tests
jest.mock('../otel-logger', () => ({
  OTELLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('LoggerFactory', () => {
  afterEach(() => {
    // Reset factory state between tests
    LoggerFactory.reset();
  });

  describe('singleton behavior', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = LoggerFactory.getInstance();
      const instance2 = LoggerFactory.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(LoggerFactory);
    });

    it('should maintain state across getInstance calls', async () => {
      const factory = LoggerFactory.getInstance();
      await factory.initialize();

      const sameFactory = LoggerFactory.getInstance();
      expect(sameFactory.isInitialized()).toBe(true);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with default config', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();

      expect(factory.isInitialized()).toBe(true);
      expect(factory.getState()).toBe(LoggerState.READY);
      expect(factory.getConfig()).toBeTruthy();
    });

    it('should initialize successfully with custom config', async () => {
      const factory = LoggerFactory.getInstance();
      const customConfig = createLoggerConfig();
      customConfig.serviceName = 'test-service';
      customConfig.logLevel = 'debug';

      await factory.initialize(customConfig);

      expect(factory.isInitialized()).toBe(true);
      expect(factory.getConfig()?.serviceName).toBe('test-service');
      expect(factory.getConfig()?.logLevel).toBe('debug');
    });

    it('should not initialize twice', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();
      await factory.initialize(); // Should not throw

      expect(factory.isInitialized()).toBe(true);
    });

    it('should throw error when initializing if already in progress', async () => {
      const factory = LoggerFactory.getInstance();

      // Start initialization but don't await
      const initPromise1 = factory.initialize();

      // Try to initialize again immediately
      await expect(factory.initialize()).rejects.toThrow(LoggerError);
      await expect(factory.initialize()).rejects.toThrow('already in progress');

      // Complete first initialization
      await initPromise1;
    });

    it('should throw error when getting logger before initialization', () => {
      const factory = LoggerFactory.getInstance();

      expect(() => factory.getLogger()).toThrow(LoggerError);
      expect(() => factory.getLogger()).toThrow('not initialized');
    });
  });

  describe('lifecycle management', () => {
    it('should shutdown gracefully after initialization', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();
      expect(factory.isInitialized()).toBe(true);

      await factory.shutdown();
      expect(factory.getState()).toBe(LoggerState.SHUTDOWN);
      expect(factory.isInitialized()).toBe(false);
    });

    it('should handle shutdown when not initialized', async () => {
      const factory = LoggerFactory.getInstance();

      // Should not throw
      await factory.shutdown();
      expect(factory.getState()).toBe(LoggerState.SHUTDOWN);
    });

    it('should not shutdown twice', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();
      await factory.shutdown();
      await factory.shutdown(); // Should not throw

      expect(factory.getState()).toBe(LoggerState.SHUTDOWN);
    });
  });

  describe('error handling', () => {
    it('should handle logger creation failure', async () => {
      // Mock OTELLogger to throw error
      const { OTELLogger } = require('../otel-logger');
      OTELLogger.mockImplementationOnce(() => {
        throw new Error('OTEL connection failed');
      });

      const factory = LoggerFactory.getInstance();

      await expect(factory.initialize()).rejects.toThrow(LoggerError);
      expect(factory.getState()).toBe(LoggerState.ERROR);
      expect(factory.isInitialized()).toBe(false);
    });
  });
});
```

### Task 5.3: Unit Tests for OTEL Logger

**Estimated Time**: 60 minutes

Test the core logger implementation:

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/otel-logger.spec.ts

import { OTELLogger } from '../otel-logger';
import { LoggerConfig } from '../interfaces';

// Mock console methods to capture output
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Mock OTEL modules
jest.mock('@opentelemetry/api', () => ({
  logs: {
    getLogger: jest.fn(() => ({
      emit: jest.fn(),
    })),
  },
}));

jest.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: jest.fn(() => ({
    addLogRecordProcessor: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
  BatchLogRecordProcessor: jest.fn(),
}));

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: jest.fn(),
}));

// Replace global console with mocked version
Object.assign(console, mockConsole);

describe('OTELLogger', () => {
  let config: LoggerConfig;

  beforeEach(() => {
    config = {
      serviceName: 'test-service',
      logLevel: 'debug',
      enableConsole: true,
      enableOTEL: false, // Disable OTEL for unit tests
      environment: 'test',
    };

    // Clear all mocks
    Object.values(mockConsole).forEach((mock) => mock.mockClear());
  });

  describe('console logging', () => {
    it('should log info messages to console.log', () => {
      const logger = new OTELLogger(config);

      logger.info('test message', { key: 'value' });

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('[level:info,service:test-service,timestamp:'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });

    it('should log error messages to console.error', () => {
      const logger = new OTELLogger(config);

      logger.error('error message');

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('[level:error,service:test-service,timestamp:'));
    });

    it('should log warning messages to console.warn', () => {
      const logger = new OTELLogger(config);

      logger.warn('warning message');

      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('[level:warn,service:test-service,timestamp:'));
    });

    it('should log debug messages to console.debug', () => {
      const logger = new OTELLogger(config);

      logger.debug('debug message');

      expect(mockConsole.debug).toHaveBeenCalledWith(expect.stringContaining('[level:debug,service:test-service,timestamp:'));
    });

    it('should respect log level filtering', () => {
      config.logLevel = 'warn';
      const logger = new OTELLogger(config);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should disable console output when configured', () => {
      config.enableConsole = false;
      const logger = new OTELLogger(config);

      logger.info('test message');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('metadata handling', () => {
    it('should include metadata in console output', () => {
      const logger = new OTELLogger(config);
      const metadata = { userId: 123, action: 'login' };

      logger.info('user action', metadata);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('user action'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"userId": 123'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"action": "login"'));
    });

    it('should handle Error objects in metadata', () => {
      const logger = new OTELLogger(config);
      const error = new Error('Test error');
      const metadata = { error };

      logger.error('Error occurred', metadata);

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred'));
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"name": "Error"'));
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"message": "Test error"'));
    });

    it('should handle empty metadata gracefully', () => {
      const logger = new OTELLogger(config);

      logger.info('message without metadata');
      logger.info('message with empty metadata', {});

      expect(mockConsole.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('format validation', () => {
    it('should format messages with correct structure', () => {
      const logger = new OTELLogger(config);

      logger.info('test message');

      const call = mockConsole.log.mock.calls[0][0];
      expect(call).toMatch(/^\[level:info,service:test-service,timestamp:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]:test message$/);
    });

    it('should use ISO timestamp format', () => {
      const logger = new OTELLogger(config);

      logger.info('timestamp test');

      const call = mockConsole.log.mock.calls[0][0];
      const timestampMatch = call.match(/timestamp:([^,\]]+)/);
      expect(timestampMatch).toBeTruthy();

      const timestamp = timestampMatch![1];
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const logger = new OTELLogger(config);

      await expect(logger.shutdown()).resolves.toBeUndefined();
    });

    it('should not log after shutdown', async () => {
      const logger = new OTELLogger(config);

      await logger.shutdown();
      logger.info('should not appear');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });
});
```

### Task 5.4: Integration Test for OTEL Collector

**Estimated Time**: 30 minutes

Test end-to-end OTEL integration:

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/integration.spec.ts

import { LoggerFactory } from '../logger-factory';
import { createLoggerConfig } from '../config';
import { OTELLogger } from '../otel-logger';

describe('OTEL Integration', () => {
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

  describe('with OTEL disabled', () => {
    it('should work in console-only mode', async () => {
      const config = createLoggerConfig();
      config.enableOTEL = false;

      await factory.initialize(config);
      expect(factory.isInitialized()).toBe(true);

      const logger = factory.getLogger();
      expect(() => {
        logger.info('Console-only test message');
        logger.warn('Console-only warning');
        logger.error('Console-only error');
        logger.debug('Console-only debug');
      }).not.toThrow();
    });
  });

  describe('with OTEL enabled', () => {
    it('should initialize successfully when OTEL collector is available', async () => {
      const config = createLoggerConfig();
      config.enableOTEL = true;
      config.otelEndpoint = 'http://localhost:4318'; // Assumes OTEL collector running

      await factory.initialize(config);
      expect(factory.isInitialized()).toBe(true);

      const logger = factory.getLogger();

      // This should send to both console and OTEL
      logger.info('Integration test message', {
        testType: 'integration',
        timestamp: new Date().toISOString(),
        environment: 'test',
      });

      // Wait for async OTEL processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }, 10000);

    it('should fall back gracefully when OTEL collector is unavailable', async () => {
      const config = createLoggerConfig();
      config.enableOTEL = true;
      config.otelEndpoint = 'http://localhost:9999'; // Invalid endpoint

      // Should not throw, just warn
      await factory.initialize(config);
      expect(factory.isInitialized()).toBe(true);

      const logger = factory.getLogger();

      expect(() => {
        logger.info('Fallback test message');
      }).not.toThrow();
    });

    it('should handle OTEL errors gracefully during logging', async () => {
      const config = createLoggerConfig();
      config.enableOTEL = true;
      config.otelEndpoint = 'http://localhost:9999'; // Invalid endpoint

      await factory.initialize(config);
      const logger = factory.getLogger() as OTELLogger;

      // Log multiple messages to trigger circuit breaker
      for (let i = 0; i < 10; i++) {
        logger.info(`Error test message ${i}`);
      }

      // Should continue working despite OTEL errors
      expect(() => logger.info('Final test message')).not.toThrow();
    });
  });

  describe('full application lifecycle', () => {
    it('should handle complete initialize -> use -> shutdown cycle', async () => {
      const config = createLoggerConfig();

      // Initialize
      await factory.initialize(config);
      expect(factory.isInitialized()).toBe(true);

      // Use
      const logger = factory.getLogger();
      logger.info('Lifecycle test start');
      logger.warn('Lifecycle test warning');
      logger.error('Lifecycle test error');
      logger.debug('Lifecycle test debug');
      logger.info('Lifecycle test end');

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Shutdown
      await factory.shutdown();
      expect(factory.isInitialized()).toBe(false);
    });
  });
});
```

### Task 5.5: Performance Test

**Estimated Time**: 30 minutes

Validate performance requirements:

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/performance.spec.ts

import { LoggerFactory } from '../logger-factory';
import { createLoggerConfig } from '../config';

describe('Logger Performance', () => {
  let factory: LoggerFactory;

  beforeAll(async () => {
    factory = LoggerFactory.getInstance();
    const config = createLoggerConfig();
    config.enableOTEL = false; // Disable for performance testing
    await factory.initialize(config);
  });

  afterAll(async () => {
    await factory.shutdown();
    LoggerFactory.reset();
  });

  it('should handle high-volume logging without significant delay', async () => {
    const logger = factory.getLogger();
    const messageCount = 1000;

    const startTime = Date.now();

    for (let i = 0; i < messageCount; i++) {
      logger.info(`Performance test message ${i}`, {
        iteration: i,
        batch: Math.floor(i / 100),
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTimePerLog = duration / messageCount;

    console.info(`Performance test: ${messageCount} logs in ${duration}ms (${avgTimePerLog.toFixed(3)}ms avg)`);

    // Should be less than 1ms per log on average
    expect(avgTimePerLog).toBeLessThan(1);
  });

  it('should not cause memory leaks with continuous logging', async () => {
    const logger = factory.getLogger();
    const initialMemory = process.memoryUsage().heapUsed;

    // Log continuously for a short period
    const logInterval = setInterval(() => {
      logger.info('Memory test message', {
        timestamp: Date.now(),
        memoryUsage: process.memoryUsage().heapUsed,
      });
    }, 1);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    clearInterval(logInterval);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    console.info(`Memory test: ${memoryGrowth} bytes growth`);

    // Memory growth should be reasonable (less than 10MB)
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
  });

  it('should handle concurrent logging from multiple sources', async () => {
    const logger = factory.getLogger();
    const concurrentTasks = 10;
    const messagesPerTask = 100;

    const startTime = Date.now();

    // Create multiple concurrent logging tasks
    const tasks = Array.from({ length: concurrentTasks }, (_, taskId) =>
      Promise.resolve().then(() => {
        for (let i = 0; i < messagesPerTask; i++) {
          logger.info(`Concurrent test task ${taskId} message ${i}`, {
            taskId,
            messageId: i,
          });
        }
      })
    );

    await Promise.all(tasks);

    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalMessages = concurrentTasks * messagesPerTask;
    const avgTimePerLog = duration / totalMessages;

    console.info(`Concurrent test: ${totalMessages} logs from ${concurrentTasks} tasks in ${duration}ms (${avgTimePerLog.toFixed(3)}ms avg)`);

    // Should still be fast with concurrent access
    expect(avgTimePerLog).toBeLessThan(2);
  });
});
```

### Task 5.6: Error Scenario Tests

**Estimated Time**: 25 minutes

Test various error conditions:

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/error-scenarios.spec.ts

import { LoggerFactory } from '../logger-factory';
import { LoggerError } from '../types';
import { createLoggerConfig } from '../config';

describe('Error Scenarios', () => {
  afterEach(() => {
    LoggerFactory.reset();
  });

  describe('configuration errors', () => {
    it('should handle invalid service name', async () => {
      const factory = LoggerFactory.getInstance();
      const config = createLoggerConfig();
      config.serviceName = '';

      await expect(factory.initialize(config)).rejects.toThrow('Service name cannot be empty');
    });

    it('should handle missing OTEL endpoint when OTEL enabled', async () => {
      const factory = LoggerFactory.getInstance();
      const config = createLoggerConfig();
      config.enableOTEL = true;
      config.otelEndpoint = '';

      await expect(factory.initialize(config)).rejects.toThrow('OTEL endpoint cannot be empty');
    });
  });

  describe('runtime errors', () => {
    it('should handle logger usage before initialization', () => {
      const factory = LoggerFactory.getInstance();

      expect(() => factory.getLogger()).toThrow(LoggerError);
      expect(() => factory.getLogger()).toThrow('not initialized');
    });

    it('should handle complex metadata gracefully', async () => {
      const factory = LoggerFactory.getInstance();
      await factory.initialize();
      const logger = factory.getLogger();

      const complexMetadata = {
        error: new Error('Test error'),
        circular: {} as any,
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        nullValue: null,
        undefinedValue: undefined,
      };

      // Create circular reference
      complexMetadata.circular.self = complexMetadata.circular;

      expect(() => {
        logger.info('Complex metadata test', complexMetadata);
      }).not.toThrow();
    });

    it('should handle very long messages', async () => {
      const factory = LoggerFactory.getInstance();
      await factory.initialize();
      const logger = factory.getLogger();

      const longMessage = 'A'.repeat(10000);
      const largeMetadata = {
        data: 'B'.repeat(5000),
        array: new Array(1000).fill('test'),
      };

      expect(() => {
        logger.info(longMessage, largeMetadata);
      }).not.toThrow();
    });
  });

  describe('shutdown scenarios', () => {
    it('should handle shutdown without initialization', async () => {
      const factory = LoggerFactory.getInstance();

      await expect(factory.shutdown()).resolves.toBeUndefined();
    });

    it('should handle logging after shutdown', async () => {
      const factory = LoggerFactory.getInstance();
      await factory.initialize();
      const logger = factory.getLogger();

      await factory.shutdown();

      // Should not throw, but also should not log
      expect(() => {
        logger.info('This should not appear');
      }).not.toThrow();
    });
  });
});
```

### Task 5.7: Run Test Suite

**Estimated Time**: 15 minutes

Execute all tests and verify coverage:

```bash
cd apps/task-manager

# Run all tests
npm test -- --testPathPattern=logging

# Run tests with coverage
npm test -- --testPathPattern=logging --coverage

# Run specific test suites
npm test -- logger-factory.spec.ts
npm test -- otel-logger.spec.ts
npm test -- integration.spec.ts
npm test -- performance.spec.ts
npm test -- error-scenarios.spec.ts
```

## Validation Criteria

### ✅ Technical Validation

1. **Test Coverage**: >90% coverage for logging module
2. **All Tests Pass**: Unit, integration, and performance tests
3. **Performance**: Average logging time < 1ms per message
4. **Memory**: Stable memory usage under continuous load
5. **Error Handling**: Graceful handling of all error scenarios

### ✅ Functional Validation

1. **Console Format**: Output matches `[level:X,service:Y,timestamp:Z]:message`
2. **OTEL Integration**: Logs reach collector when available
3. **Fallback Behavior**: Works without OTEL collector
4. **Lifecycle**: Proper initialization and shutdown
5. **Concurrency**: Handles multiple simultaneous loggers

## Expected Test Results

### Coverage Report

```
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
interfaces.ts         | 100     | 100      | 100     | 100
types.ts             | 100     | 100      | 100     | 100
config.ts            | 95      | 90       | 100     | 95
logger-factory.ts    | 92      | 85       | 100     | 92
otel-logger.ts       | 88      | 80       | 95      | 88
formatters.ts        | 100     | 100      | 100     | 100
error-handler.ts     | 90      | 85       | 100     | 90
----------------------|---------|----------|---------|--------
All files            | 91      | 84       | 98      | 91
```

### Performance Benchmarks

```
Performance test: 1000 logs in 45ms (0.045ms avg) ✓
Memory test: 2048576 bytes growth ✓
Concurrent test: 1000 logs from 10 tasks in 78ms (0.078ms avg) ✓
```

## Deliverables

- [ ] **Unit Tests**: Complete test coverage for all components
- [ ] **Integration Tests**: End-to-end OTEL collector testing
- [ ] **Performance Tests**: Verification of speed requirements
- [ ] **Error Tests**: Comprehensive error scenario coverage
- [ ] **Memory Tests**: Validation of stable memory usage
- [ ] **Test Documentation**: Clear test descriptions and expected outcomes

## Dependencies for Next Jobs

**Enables**:

- Job 6: Documentation and Migration (complete validated system)

**Blocks**: Job 6 needs validated system for final migration

## Troubleshooting

### Common Test Issues

1. **OTEL Integration Tests Fail**

   - Solution: Ensure OTEL collector is running on localhost:4318
   - Use docker-compose to start collector for testing
   - Check firewall settings

2. **Performance Tests Inconsistent**

   - Solution: Run tests multiple times to account for JIT warmup
   - Use dedicated test environment without other processes
   - Consider system load when evaluating results

3. **Memory Tests Fail**

   - Solution: Force garbage collection with `--expose-gc` flag
   - Run tests in isolation to avoid interference
   - Check for actual memory leaks vs normal allocation

4. **Mock Issues**
   - Solution: Ensure mocks are properly reset between tests
   - Use `jest.clearAllMocks()` in beforeEach/afterEach
   - Verify mock implementations match real interfaces

### Debug Test Failures

```bash
# Run tests with verbose output
npm test -- --testPathPattern=logging --verbose

# Run specific failing test
npm test -- --testNamePattern="should handle high-volume logging"

# Run tests with debug information
DEBUG=* npm test -- --testPathPattern=logging
```

## Task 5.6: OTEL Collector Log Verification

**Objective**: Verify that logs are actually reaching the OTEL collector and can be exported to files for validation.

### 5.6.1: Configure OTEL Collector for File Export

**File**: `deployment/observability/configs/otel-collector-test.yaml`

```yaml
# Test configuration that exports logs to files for verification
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  # Add attributes to identify test logs
  resource:
    attributes:
      - key: test.environment
        value: 'log-verification'
        action: insert

exporters:
  # Export logs to file for verification
  file:
    path: ./logs/otel-logs-output.json
    format: json

  # Keep existing Loki export (optional for test)
  otlphttp/loki:
    endpoint: http://loki:3100/otlp
    tls:
      insecure: true

  # Add logging exporter for real-time verification
  logging:
    loglevel: debug

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [file, logging, otlphttp/loki]

  telemetry:
    logs:
      level: 'debug'
```

### 5.6.2: Create Log Verification Test Script

**File**: `apps/task-manager/scripts/test-otel-logs.js`

```javascript
const { LoggerFactory, createLoggerConfig } = require('../dist/common/utils/logging');
const fs = require('fs');
const path = require('path');

async function testOTELLogsReachCollector() {
  console.log('🧪 Testing OTEL Collector Log Reception...\n');

  // Clear any existing log file
  const logFile = path.join(__dirname, '../../../logs/otel-logs-output.json');
  const logDir = path.dirname(logFile);

  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Clear existing logs
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
    console.log('📝 Cleared existing log file');
  }

  // Initialize logger
  const config = createLoggerConfig();
  const factory = LoggerFactory.getInstance();
  await factory.initialize(config);
  const logger = factory.getLogger();

  console.log('📡 Sending test logs to OTEL collector...');

  // Send unique test logs
  const testId = `test-${Date.now()}`;
  const testLogs = [
    { level: 'info', message: `OTEL_TEST_INFO_${testId}`, metadata: { testType: 'info', testId } },
    { level: 'warn', message: `OTEL_TEST_WARN_${testId}`, metadata: { testType: 'warn', testId } },
    { level: 'error', message: `OTEL_TEST_ERROR_${testId}`, metadata: { testType: 'error', testId } },
    { level: 'debug', message: `OTEL_TEST_DEBUG_${testId}`, metadata: { testType: 'debug', testId } },
    { level: 'success', message: `OTEL_TEST_SUCCESS_${testId}`, metadata: { testType: 'success', testId } },
  ];

  // Send all test logs
  for (const log of testLogs) {
    logger[log.level](log.message, log.metadata);
    console.log(`  ✅ Sent ${log.level.toUpperCase()} log: ${log.message}`);
  }

  console.log('\n⏳ Waiting 5 seconds for logs to reach collector...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Check if logs reached the collector
  if (fs.existsSync(logFile)) {
    const logData = fs.readFileSync(logFile, 'utf8');
    const logLines = logData
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    console.log(`\n📄 Found ${logLines.length} log entries in collector output file`);

    let testLogsFound = 0;
    const foundTestIds = new Set();

    for (const line of logLines) {
      try {
        const logEntry = JSON.parse(line);
        const body = logEntry.resourceLogs?.[0]?.scopeLogs?.[0]?.logRecords?.[0]?.body?.stringValue || '';

        if (body.includes(testId)) {
          testLogsFound++;
          const logType = body.match(/OTEL_TEST_(\w+)_/)?.[1];
          if (logType) foundTestIds.add(logType);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    console.log(`\n🎯 Test Results:`);
    console.log(`  • Total logs found: ${logLines.length}`);
    console.log(`  • Test logs found: ${testLogsFound}/${testLogs.length}`);
    console.log(`  • Test types found: ${Array.from(foundTestIds).join(', ')}`);

    if (testLogsFound === testLogs.length) {
      console.log('\n✅ SUCCESS: All test logs reached OTEL collector!');
      console.log('📡 OTEL integration is working correctly');
      return true;
    } else {
      console.log('\n❌ FAILURE: Not all test logs reached collector');
      console.log('🔧 Check OTEL collector configuration and network connectivity');
      return false;
    }
  } else {
    console.log('\n❌ FAILURE: No log file found from OTEL collector');
    console.log('🔧 Possible issues:');
    console.log('  • OTEL collector not running');
    console.log('  • Collector not configured for file export');
    console.log('  • Network connectivity issues');
    console.log('  • Logs directory permissions');
    return false;
  }
}

// Run the test
testOTELLogsReachCollector()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });
```

### 5.6.3: Create Docker Compose for Testing

**File**: `apps/task-manager/scripts/docker-compose.otel-test.yml`

```yaml
version: '3.8'

services:
  otel-collector-test:
    image: otel/opentelemetry-collector-contrib:latest
    command: ['--config=/etc/otel-collector-config.yaml']
    volumes:
      - ../../../deployment/observability/configs/otel-collector-test.yaml:/etc/otel-collector-config.yaml
      - ../../../logs:/logs
    ports:
      - '4317:4317' # GRPC
      - '4318:4318' # HTTP
    environment:
      - OTEL_LOG_LEVEL=debug
    networks:
      - otel-test

networks:
  otel-test:
    driver: bridge
```

### 5.6.4: Verification Commands

```bash
# 1. Start OTEL collector for testing
cd apps/task-manager/scripts
docker-compose -f docker-compose.otel-test.yml up -d

# 2. Wait for collector to start
sleep 5

# 3. Run log verification test
node test-otel-logs.js

# 4. Check collector logs directly (alternative verification)
docker-compose -f docker-compose.otel-test.yml logs otel-collector-test

# 5. Inspect the generated log file
cat ../../../logs/otel-logs-output.json | jq '.'

# 6. Clean up
docker-compose -f docker-compose.otel-test.yml down
```

### 5.6.5: Manual Verification Steps

**If automated test fails, try manual verification:**

1. **Check Collector Status**:

   ```bash
   curl -X GET http://localhost:13133/
   ```

2. **Send Direct OTLP Log**:

   ```bash
   curl -X POST http://localhost:4318/v1/logs \
     -H "Content-Type: application/json" \
     -d '{
       "resourceLogs": [{
         "resource": {
           "attributes": [{
             "key": "service.name",
             "value": {"stringValue": "manual-test"}
           }]
         },
         "scopeLogs": [{
           "logRecords": [{
             "body": {"stringValue": "Manual test log"},
             "severityText": "INFO"
           }]
         }]
       }]
     }'
   ```

3. **Check File Output**:
   ```bash
   ls -la logs/
   tail -f logs/otel-logs-output.json
   ```

### 5.6.6: Expected Results

**✅ Success Indicators:**

- Log file `logs/otel-logs-output.json` exists
- File contains JSON log entries with our test messages
- All 5 test log levels appear in the output
- Logs contain correct service name and metadata
- Circuit breaker remains in CLOSED state

**❌ Failure Indicators:**

- No log file generated
- Empty log file
- Missing test messages in output
- Collector logs show connection errors
- Circuit breaker opens due to OTEL failures

### 5.6.7: Troubleshooting Guide

| Issue              | Possible Cause        | Solution                             |
| ------------------ | --------------------- | ------------------------------------ |
| No log file        | Collector not running | Check `docker ps` and collector logs |
| Empty log file     | OTLP endpoint wrong   | Verify endpoint configuration        |
| Partial logs       | Network latency       | Increase wait time in test           |
| Permission errors  | File permissions      | Check logs directory permissions     |
| Connection refused | Port conflicts        | Verify ports 4317/4318 are free      |

### 5.6.8: Validation Criteria

The OTEL integration test **PASSES** when:

1. ✅ All 5 test log types reach the collector
2. ✅ Log format matches OTLP specification
3. ✅ Service name correctly identified
4. ✅ Metadata preserved in transmission
5. ✅ No circuit breaker activation during test
6. ✅ Performance remains < 1ms per log call

## Notes

- 🧪 **Comprehensive**: Tests cover all major functionality and edge cases
- ⚡ **Performance**: Validates < 1ms requirement under realistic conditions
- 🔒 **Reliability**: Error scenarios ensure system won't crash
- 📊 **Coverage**: High coverage ensures code quality
- 🔧 **Maintainable**: Clear test structure makes future changes easier
- 📡 **OTEL Verified**: Confirms logs actually reach collector (not just sent)

## Ready for Next Job

Upon completion, Job 6 (Documentation and Migration) can finalize the logger system with confidence in its reliability, performance, and verified OTEL integration.
