# Job 8: Testing and Validation

## Overview

This job implements comprehensive testing for the updated logging system, focusing on the simple logger and OTEL logger. The tests will validate the logging behavior in different environments, ensure color support works correctly, and verify that the system produces the expected output without log spam.

## Objectives

1. **Unit Testing**: Test individual logger components
2. **Integration Testing**: Test logging behavior in different environments
3. **Color Support Testing**: Validate color formatting
4. **Environment Testing**: Test debug mode and log level filtering
5. **Performance Testing**: Ensure no performance impact
6. **OTEL Integration Testing**: Test OTEL logger functionality

## Testing Strategy

### 1. Logger Factory Testing

Test the updated logger factory with structured logger removed:

```typescript
// src/common/utils/__tests__/logger-factory.spec.ts
import { LoggerFactory, LoggerType } from '../logger-factory';

describe('LoggerFactory', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.LOG_FORMAT;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_COLORS;

    // Reset singleton instance
    (LoggerFactory as any).instance = null;
  });

  describe('Default Configuration', () => {
    it('should default to simple logger when LOG_FORMAT is not set', () => {
      const factory = LoggerFactory.getInstance();
      expect(factory.getLoggerType()).toBe('simple');
    });

    it('should use simple logger when LOG_FORMAT is set to simple', () => {
      process.env.LOG_FORMAT = 'simple';
      const factory = LoggerFactory.getInstance();
      expect(factory.getLoggerType()).toBe('simple');
    });

    it('should use otel logger when LOG_FORMAT is set to otel', () => {
      process.env.LOG_FORMAT = 'otel';
      const factory = LoggerFactory.getInstance();
      expect(factory.getLoggerType()).toBe('otel');
    });

    it('should reject structured logger type', () => {
      process.env.LOG_FORMAT = 'structured';
      const factory = LoggerFactory.getInstance();
      // Should default to simple since structured is not supported
      expect(factory.getLoggerType()).toBe('simple');
    });
  });

  describe('Environment-Based Log Levels', () => {
    it('should default to debug level in development', () => {
      process.env.NODE_ENV = 'development';
      const factory = LoggerFactory.getInstance();
      expect(factory.getLogLevel()).toBe('debug');
    });

    it('should default to info level in production', () => {
      process.env.NODE_ENV = 'production';
      const factory = LoggerFactory.getInstance();
      expect(factory.getLogLevel()).toBe('info');
    });

    it('should default to error level in test', () => {
      process.env.NODE_ENV = 'test';
      const factory = LoggerFactory.getInstance();
      expect(factory.getLogLevel()).toBe('error');
    });

    it('should use configured LOG_LEVEL when set', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';
      const factory = LoggerFactory.getInstance();
      expect(factory.getLogLevel()).toBe('warn');
    });
  });

  describe('Color Support', () => {
    it('should enable colors by default', () => {
      const factory = LoggerFactory.getInstance();
      expect(factory.isColorsEnabled()).toBe(true);
    });

    it('should disable colors when LOG_COLORS is false', () => {
      process.env.LOG_COLORS = 'false';
      const factory = LoggerFactory.getInstance();
      expect(factory.isColorsEnabled()).toBe(false);
    });

    it('should enable colors when LOG_COLORS is true', () => {
      process.env.LOG_COLORS = 'true';
      const factory = LoggerFactory.getInstance();
      expect(factory.isColorsEnabled()).toBe(true);
    });
  });

  describe('Debug Mode Detection', () => {
    it('should enable debug mode in development', () => {
      process.env.NODE_ENV = 'development';
      const factory = LoggerFactory.getInstance();
      expect(factory.isDebugEnabled()).toBe(true);
    });

    it('should disable debug mode in production', () => {
      process.env.NODE_ENV = 'production';
      const factory = LoggerFactory.getInstance();
      expect(factory.isDebugEnabled()).toBe(false);
    });

    it('should enable debug mode when LOG_LEVEL is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      const factory = LoggerFactory.getInstance();
      expect(factory.isDebugEnabled()).toBe(true);
    });
  });

  describe('Logger Switching', () => {
    it('should switch logger type correctly', () => {
      const factory = LoggerFactory.getInstance();

      // Start with simple logger
      expect(factory.getLoggerType()).toBe('simple');

      // Switch to otel logger
      factory.switchLogger('otel');
      expect(factory.getLoggerType()).toBe('otel');

      // Switch back to simple logger
      factory.switchLogger('simple');
      expect(factory.getLoggerType()).toBe('simple');
    });

    it('should not switch if same type is requested', () => {
      const factory = LoggerFactory.getInstance();
      const initialLogger = factory.getLogger();

      factory.switchLogger('simple');

      expect(factory.getLogger()).toBe(initialLogger);
    });
  });
});
```

### 2. Simple Logger Testing

Test the enhanced simple logger with color support:

```typescript
// src/common/utils/__tests__/simple-logger.spec.ts
import { SimpleLogger } from '../simple-logger';

describe('SimpleLogger', () => {
  let logger: SimpleLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new SimpleLogger('Test Service');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Color Support', () => {
    it('should format messages with colors when enabled', () => {
      process.env.LOG_COLORS = 'true';

      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    });

    it('should format messages without colors when disabled', () => {
      process.env.LOG_COLORS = 'false';

      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    });

    it('should use correct colors for different log levels', () => {
      process.env.LOG_COLORS = 'true';

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      logger.success('Success message');

      expect(consoleSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with correct structure', () => {
      logger.info('Test message');

      const call = consoleSpy.mock.calls[0][0];
      expect(call).toMatch(/\[INFO\] \[Test Service\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]: Test message/);
    });

    it('should include metadata when provided', () => {
      logger.info('Test message', { key: 'value' });

      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('{"key":"value"}');
    });

    it('should handle empty metadata gracefully', () => {
      logger.info('Test message', {});

      const call = consoleSpy.mock.calls[0][0];
      expect(call).not.toContain('{}');
    });
  });

  describe('Log Levels', () => {
    it('should log all levels correctly', () => {
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      logger.success('Success message');

      expect(consoleSpy).toHaveBeenCalledTimes(5);
    });

    it('should use correct log level names', () => {
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      logger.success('Success message');

      const calls = consoleSpy.mock.calls.map((call) => call[0]);
      expect(calls[0]).toContain('[ERROR]');
      expect(calls[1]).toContain('[WARN]');
      expect(calls[2]).toContain('[INFO]');
      expect(calls[3]).toContain('[DEBUG]');
      expect(calls[4]).toContain('[SUCCESS]');
    });
  });

  describe('Service Name', () => {
    it('should use provided service name', () => {
      const customLogger = new SimpleLogger('Custom Service');
      customLogger.info('Test message');

      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('[Custom Service]');
    });

    it('should use default service name when not provided', () => {
      const defaultLogger = new SimpleLogger();
      defaultLogger.info('Test message');

      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('[Task Manager]');
    });
  });
});
```

### 3. OTEL Logger Testing

Test the simplified OTEL logger:

```typescript
// src/common/utils/__tests__/otel-logger.spec.ts
import { OtelLogger } from '../otel-logger';
import { SimpleLogger } from '../simple-logger';

// Mock OTEL dependencies
jest.mock('@opentelemetry/exporter-logs-otlp-http');

describe('OtelLogger', () => {
  let logger: OtelLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger = new OtelLogger('Test Service');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Console Output', () => {
    it('should produce identical console output to SimpleLogger', () => {
      const simpleLogger = new SimpleLogger('Test Service');

      // Capture simple logger output
      const simpleSpy = jest.spyOn(console, 'log').mockImplementation();
      simpleLogger.info('Test message');
      const simpleOutput = simpleSpy.mock.calls[0][0];
      simpleSpy.mockRestore();

      // Capture OTEL logger output
      logger.info('Test message');
      const otelOutput = consoleSpy.mock.calls[0][0];

      // Should be identical
      expect(otelOutput).toBe(simpleOutput);
    });

    it('should format messages with correct structure', () => {
      logger.info('Test message');

      const call = consoleSpy.mock.calls[0][0];
      expect(call).toMatch(/\[INFO\] \[Test Service\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]: Test message/);
    });

    it('should include metadata when provided', () => {
      logger.info('Test message', { key: 'value' });

      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('{"key":"value"}');
    });
  });

  describe('OTEL Integration', () => {
    it('should send logs to OTEL collector', async () => {
      const mockExport = jest.fn();
      (logger as any).otelExporter = { export: mockExport };

      logger.info('Test message', { test: 'data' });

      expect(mockExport).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Test message',
          level: 'INFO',
          test: 'data',
        }),
      ]);
    });

    it('should handle OTEL export failures gracefully', () => {
      const mockExport = jest.fn().mockImplementation(() => {
        throw new Error('OTEL export failed');
      });
      (logger as any).otelExporter = { export: mockExport };

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw error
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('OTEL export failed:', expect.any(Error));
      errorSpy.mockRestore();
    });

    it('should work when OTEL exporter is not available', () => {
      (logger as any).otelExporter = null;

      // Should not throw error
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();

      // Should still log to console
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Log Levels', () => {
    it('should handle all log levels', () => {
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      logger.success('Success message');

      expect(consoleSpy).toHaveBeenCalledTimes(5);
    });
  });
});
```

### 4. Integration Testing

Test logging behavior in different environments:

```typescript
// src/api/kafka/__tests__/logging-integration.spec.ts
import { getLogger, switchLogger } from '../../../common/utils/logger-factory';
import { NewTaskHandler } from '../handlers/task-status/new-task.handler';

describe('Kafka Handler Logging Integration', () => {
  let handler: NewTaskHandler;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    handler = new NewTaskHandler();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'info';
      switchLogger('simple');
    });

    it('should only log INFO level messages', async () => {
      const message = {
        value: {
          taskId: 'task-123',
          status: 'new',
          userEmail: 'test@example.com',
        },
      };

      await handler.handleMessage(message);

      const calls = consoleSpy.mock.calls.map((call) => call[0]);

      // Should only contain INFO level logs
      const infoLogs = calls.filter((call) => call.includes('[INFO]'));
      const debugLogs = calls.filter((call) => call.includes('[DEBUG]'));

      expect(infoLogs.length).toBeGreaterThan(0);
      expect(debugLogs.length).toBe(0);
    });

    it('should log Kafka events clearly', async () => {
      const message = {
        value: {
          taskId: 'task-123',
          status: 'new',
          userEmail: 'test@example.com',
        },
      };

      await handler.handleMessage(message);

      const calls = consoleSpy.mock.calls.map((call) => call[0]);
      const kafkaEventLog = calls.find((call) => call.includes('Kafka event received:'));

      expect(kafkaEventLog).toBeDefined();
      expect(kafkaEventLog).toContain('new-task');
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'debug';
      switchLogger('simple');
    });

    it('should log both INFO and DEBUG level messages', async () => {
      const message = {
        value: {
          taskId: 'task-123',
          status: 'new',
          userEmail: 'test@example.com',
        },
      };

      await handler.handleMessage(message);

      const calls = consoleSpy.mock.calls.map((call) => call[0]);

      const infoLogs = calls.filter((call) => call.includes('[INFO]'));
      const debugLogs = calls.filter((call) => call.includes('[DEBUG]'));

      expect(infoLogs.length).toBeGreaterThan(0);
      expect(debugLogs.length).toBeGreaterThan(0);
    });
  });
});
```

### 5. Validation Error Logging Testing

Test enhanced validation error logging:

```typescript
// src/common/utils/__tests__/validation-error-logging.spec.ts
import { validateDto } from '../validation';
import { getLogger } from '../logger-factory';

// Mock DTO for testing
class TestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}

describe('Validation Error Logging', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log validation errors with received data', async () => {
    const invalidData = {
      name: '', // Invalid: empty string
      email: 'invalid-email', // Invalid: not an email
    };

    const result = await validateDto(TestDto, invalidData);

    expect(result.isValid).toBe(false);

    const errorLogs = consoleSpy.mock.calls.filter((call) => call[0].includes('[ERROR]') && call[0].includes('Validation failed'));

    expect(errorLogs.length).toBeGreaterThan(0);

    const errorLog = errorLogs[0][0];
    expect(errorLog).toContain('TestDto');
    expect(errorLog).toContain('name');
    expect(errorLog).toContain('email');
  });

  it('should sanitize sensitive data in logs', async () => {
    const dataWithSensitiveInfo = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret123',
      token: 'jwt-token-here',
    };

    await validateDto(TestDto, dataWithSensitiveInfo);

    const errorLogs = consoleSpy.mock.calls.filter((call) => call[0].includes('[ERROR]') && call[0].includes('Validation failed'));

    const errorLog = errorLogs[0][0];
    expect(errorLog).not.toContain('secret123');
    expect(errorLog).not.toContain('jwt-token-here');
    expect(errorLog).toContain('***');
  });

  it('should truncate large data in logs', async () => {
    const largeData = {
      name: 'Test User',
      email: 'test@example.com',
      largeField: 'x'.repeat(1000), // Very large field
    };

    await validateDto(TestDto, largeData);

    const errorLogs = consoleSpy.mock.calls.filter((call) => call[0].includes('[ERROR]') && call[0].includes('Validation failed'));

    const errorLog = errorLogs[0][0];
    expect(errorLog.length).toBeLessThan(2000); // Should be truncated
  });
});
```

### 6. Performance Testing

Test logging performance under load:

```typescript
// src/common/utils/__tests__/logging-performance.spec.ts
import { getLogger } from '../logger-factory';

describe('Logging Performance', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should handle high volume logging efficiently', () => {
    const logger = getLogger();
    const startTime = Date.now();

    // Log 1000 messages
    for (let i = 0; i < 1000; i++) {
      logger.info(`Test message ${i}`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (less than 1 second)
    expect(duration).toBeLessThan(1000);
    expect(consoleSpy).toHaveBeenCalledTimes(1000);
  });

  it('should handle large metadata efficiently', () => {
    const logger = getLogger();
    const largeMetadata = {
      data: Array(1000).fill('test').join(''),
      timestamp: new Date().toISOString(),
      correlationId: 'corr-123',
    };

    const startTime = Date.now();

    // Log 100 messages with large metadata
    for (let i = 0; i < 100; i++) {
      logger.info(`Test message ${i}`, largeMetadata);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time
    expect(duration).toBeLessThan(500);
    expect(consoleSpy).toHaveBeenCalledTimes(100);
  });

  it('should not block the event loop', async () => {
    const logger = getLogger();

    // Start a timer to measure event loop blocking
    const timerStart = Date.now();
    const timer = new Promise((resolve) => {
      setTimeout(() => {
        resolve(Date.now() - timerStart);
      }, 100);
    });

    // Log messages while timer is running
    for (let i = 0; i < 1000; i++) {
      logger.info(`Test message ${i}`);
    }

    const timerDuration = await timer;

    // Timer should complete close to expected time (100ms)
    expect(timerDuration).toBeGreaterThan(90);
    expect(timerDuration).toBeLessThan(150);
  });
});
```

## Test Configuration

### Jest Configuration Updates

```typescript
// jest.config.ts (updated)
export default {
  // ... existing config
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/test-setup.ts', '!src/**/__tests__/**'],
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

### Test Setup

```typescript
// src/test-setup.ts (updated)
import { getLogger } from './common/utils/logger-factory';

// Configure logging for tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.LOG_COLORS = 'false';

// Suppress console output during tests unless explicitly testing it
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

beforeAll(() => {
  // Only suppress if not explicitly testing console output
  if (!process.env.TEST_CONSOLE_OUTPUT) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();
  }
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.debug = originalConsoleDebug;
});

// Global test utilities
global.getTestLogger = () => {
  return getLogger();
};
```

## Success Criteria

1. **Unit Tests**: All logger components have comprehensive unit tests
2. **Integration Tests**: Logging behavior works correctly in different environments
3. **Color Support**: Colors work correctly when enabled/disabled
4. **Environment Awareness**: Debug logs only appear in development
5. **Performance**: No significant performance impact from logging
6. **OTEL Integration**: OTEL logger works correctly with collector
7. **Error Handling**: Validation errors are logged with proper context
8. **Coverage**: Test coverage meets minimum thresholds

## Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test -- --testNamePattern="LoggerFactory"
npm test -- --testNamePattern="SimpleLogger"
npm test -- --testNamePattern="OtelLogger"

# Run tests with console output enabled
TEST_CONSOLE_OUTPUT=true npm test

# Run performance tests
npm test -- --testNamePattern="Performance"
```

## Notes

- Tests are designed to be non-intrusive and not affect production logging
- Console output is mocked by default to avoid test noise
- Performance tests ensure logging doesn't impact application performance
- Integration tests validate real-world usage scenarios
- Coverage thresholds ensure comprehensive testing
- All tests maintain backward compatibility with existing logging calls
