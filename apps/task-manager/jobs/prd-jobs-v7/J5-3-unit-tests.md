# Job 5.3: Unit Tests for Logger Components

## Overview

**Status**: 🔄 **READY TO START**  
**Priority**: 3 (After OTEL verification)  
**Duration**: 90 minutes  
**Description**: Create comprehensive unit tests for Logger Factory, OTEL Logger, and configuration components. Focus on critical compatibility requirements and performance validation.

## Prerequisites

- ✅ Job 5.1 completed (centralized configuration)
- ✅ Job 5.2 completed (OTEL verification)
- ✅ Jest testing framework configured

## Critical Compatibility Requirements [[memory:5901845]]

Based on the existing codebase analysis:

- **182 logger calls across 33 files** - all must continue working
- **5 methods required**: `info`, `warn`, `error`, `debug`, `success` with exact signatures
- **Console format**: `[level:X,service:Y,timestamp:Z]:message` with metadata as JSON on new line
- **Success method**: Custom method that maps to info level (required for compatibility)
- **Performance**: <1ms per call (critical for Kafka message processing)
- **Error handling**: 26 critical error logging calls must never fail silently

## Detailed Tasks

### Task 5.3.1: Setup Test Environment (15 minutes)

**Verify Jest Configuration**

```javascript
// apps/task-manager/jest.config.js - ensure proper setup
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/common/utils/logging/**/*.ts', '!src/**/*.d.ts', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testTimeout: 10000,
};
```

**Create Test Setup File**

```typescript
// apps/task-manager/src/test-setup.ts
import 'jest';

// Mock console methods to capture output during tests
global.mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  Object.values(global.mockConsole).forEach((mock: any) => mock.mockClear());
});
```

### Task 5.3.2: Configuration Tests (20 minutes)

**File**: `src/config/__tests__/logger.spec.ts`

```typescript
import { loggerConfig, validateLoggerConfig, LoggerConfigType } from '../logger';

describe('Logger Configuration', () => {
  describe('default configuration', () => {
    it('should provide sensible defaults', () => {
      expect(loggerConfig.serviceName).toBe('task-manager');
      expect(loggerConfig.logLevel).toBe('info');
      expect(loggerConfig.enableConsole).toBe(true);
      expect(loggerConfig.enableOTEL).toBe(false);
      expect(loggerConfig.circuitBreaker.failureThreshold).toBe(5);
    });

    it('should disable OTEL in test environment', () => {
      // Test environment should disable OTEL regardless of LOG_ENABLE_OTEL
      expect(loggerConfig.enableOTEL).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate valid configuration', () => {
      expect(() => validateLoggerConfig()).not.toThrow();
    });

    it('should throw for invalid circuit breaker config', () => {
      const originalConfig = { ...loggerConfig };

      // Test invalid failure threshold
      (loggerConfig as any).circuitBreaker.failureThreshold = 0;
      expect(() => validateLoggerConfig()).toThrow('failure threshold must be at least 1');

      // Restore config
      Object.assign(loggerConfig, originalConfig);
    });
  });

  describe('environment variable integration', () => {
    it('should respect environment variables', () => {
      // Note: This tests the schema parsing, not runtime changes
      expect(loggerConfig.serviceName).toBeDefined();
      expect(loggerConfig.otelEndpoint).toMatch(/^http/);
    });
  });
});
```

### Task 5.3.3: Logger Factory Tests (25 minutes)

**File**: `src/common/utils/logging/__tests__/logger-factory.spec.ts`

```typescript
import { LoggerFactory } from '../logger-factory';
import { LoggerState, LoggerError, LoggerErrorType } from '../types';

// Mock OTEL Logger to avoid external dependencies
jest.mock('../otel-logger', () => ({
  OTELLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('LoggerFactory', () => {
  afterEach(() => {
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

  describe('initialization lifecycle', () => {
    it('should initialize successfully with default config', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();

      expect(factory.isInitialized()).toBe(true);
      expect(factory.getState()).toBe(LoggerState.READY);
      expect(factory.getConfig()).toBeTruthy();
    });

    it('should not initialize twice', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();
      await factory.initialize(); // Should not throw

      expect(factory.isInitialized()).toBe(true);
    });

    it('should throw error when getting logger before initialization', () => {
      const factory = LoggerFactory.getInstance();

      expect(() => factory.getLogger()).toThrow(LoggerError);
      expect(() => factory.getLogger()).toThrow('not initialized');
    });
  });

  describe('shutdown lifecycle', () => {
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

      await factory.shutdown(); // Should not throw
      expect(factory.getState()).toBe(LoggerState.SHUTDOWN);
    });
  });
});
```

### Task 5.3.4: OTEL Logger Tests (30 minutes)

**File**: `src/common/utils/logging/__tests__/otel-logger.spec.ts`

```typescript
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

    Object.values(mockConsole).forEach((mock) => mock.mockClear());
  });

  describe('console logging format [[memory:5901845]]', () => {
    it('should format info messages correctly', () => {
      const logger = new OTELLogger(config);

      logger.info('test message', { key: 'value' });

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringMatching(/^\[level:info,service:test-service,timestamp:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]:test message$/));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('"key": "value"'));
    });

    it('should format error messages correctly', () => {
      const logger = new OTELLogger(config);

      logger.error('error message');

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringMatching(/^\[level:error,service:test-service,timestamp:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]:error message$/));
    });

    it('should format success messages as info level [[memory:5901845]]', () => {
      const logger = new OTELLogger(config);

      logger.success('success message');

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringMatching(/^\[level:info,service:test-service,timestamp:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]:success message$/));
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

  describe('log level filtering', () => {
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
  });

  describe('metadata handling', () => {
    it('should handle Error objects in metadata', () => {
      const logger = new OTELLogger(config);
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';

      logger.error('Error occurred', { error });

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Error occurred'));
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"name": "Error"'));
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('"message": "Test error"'));
    });

    it('should handle circular references gracefully', () => {
      const logger = new OTELLogger(config);
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.info('circular test', { data: circular });
      }).not.toThrow();
    });
  });

  describe('performance requirements [[memory:5901845]]', () => {
    it('should log within 1ms performance requirement', () => {
      const logger = new OTELLogger(config);

      const start = performance.now();
      logger.info('performance test');
      const end = performance.now();

      expect(end - start).toBeLessThan(1); // <1ms requirement
    });
  });
});
```

## Expected Test Results

### Coverage Targets

```
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
config/logger.ts      | >95     | >90      | 100     | >95
logger-factory.ts     | >90     | >85      | 100     | >90
otel-logger.ts        | >85     | >80      | >95     | >85
interfaces.ts         | 100     | 100      | 100     | 100
All files            | >90     | >85      | >98     | >90
```

### Performance Benchmarks

- Average logging time: <1ms (critical for Kafka processing)
- Memory usage: Stable under continuous logging
- No memory leaks during extended test runs

## Success Criteria

- [ ] **All tests pass** with >90% coverage
- [ ] **Console format validated** - matches exact requirement
- [ ] **5 methods tested** - info, warn, error, debug, success
- [ ] **Performance verified** - <1ms per call
- [ ] **Error handling robust** - no exceptions thrown
- [ ] **Metadata serialization** - handles complex objects
- [ ] **Circuit breaker integration** - factory tests include config

## Commands to Run Tests

```bash
cd apps/task-manager

# Run unit tests
npm test -- --testPathPattern="__tests__.*spec\.ts$"

# Run with coverage
npm test -- --testPathPattern="__tests__.*spec\.ts$" --coverage

# Run specific test files
npm test -- logger-factory.spec.ts
npm test -- otel-logger.spec.ts
npm test -- config/logger.spec.ts
```

## Impact on Production Readiness

These unit tests ensure:

- **182 existing logger calls** continue working after any changes
- **Console format compatibility** with existing log parsing
- **Performance requirements** met for high-frequency Kafka processing
- **Error scenarios** handled gracefully without breaking application
- **Configuration changes** validated before deployment

## Next Steps

After unit tests pass:

- **Job 5.4**: Integration tests for full OTEL collector communication
- **Job 5.5**: Performance tests under realistic load conditions
- **Job 5.6**: Error scenario and edge case testing
