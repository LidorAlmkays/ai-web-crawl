# Job 2: Core Interface and Factory Design

## Overview

**Status**: ✅ **COMPLETED**  
**Dependency Level**: 1 (Depends on Job 1)  
**Duration**: 2-3 hours  
**Description**: Implement foundation interfaces, types, and factory pattern for the logging system. This creates the architectural backbone for the OTEL logger.

## Prerequisites

- ✅ Job 1 completed (clean slate with temporary logger)
- ✅ Understanding of singleton pattern
- ✅ TypeScript knowledge for interface design

## Dependencies

**Requires**: Job 1 (Clean Slate Preparation)  
**Blocks**: Jobs 3, 4, 5, 6

## Objectives

1. Define core `ILogger` interface for project-wide consistency
2. Create comprehensive type definitions and enums
3. Implement singleton `LoggerFactory` with proper lifecycle management
4. Build configuration utilities with environment variable parsing
5. Establish error handling with custom error types

## Detailed Tasks

### Task 2.1: Create Core Interfaces

**Estimated Time**: 30 minutes

Create the fundamental interfaces that define the logging contract:

```typescript
// apps/task-manager/src/common/utils/logging/interfaces.ts

import { LogLevel, Environment } from './types';

/**
 * Core logger interface that all logger implementations must follow
 * This interface ensures consistency across the entire project
 */
export interface ILogger {
  /**
   * Log info level message
   * @param message - The log message
   * @param metadata - Optional metadata object for structured logging
   */
  info(message: string, metadata?: Record<string, any>): void;

  /**
   * Log warning level message
   * @param message - The log message
   * @param metadata - Optional metadata object for structured logging
   */
  warn(message: string, metadata?: Record<string, any>): void;

  /**
   * Log error level message
   * @param message - The log message
   * @param metadata - Optional metadata object for structured logging
   */
  error(message: string, metadata?: Record<string, any>): void;

  /**
   * Log debug level message
   * @param message - The log message
   * @param metadata - Optional metadata object for structured logging
   */
  debug(message: string, metadata?: Record<string, any>): void;
}

/**
 * Configuration interface for logger initialization
 * Defines all parameters needed to configure the logging system
 */
export interface LoggerConfig {
  /** Service name for identification in logs and OTEL */
  serviceName: string;

  /** Minimum log level to output */
  logLevel: LogLevel;

  /** Enable console output (always true for our use case) */
  enableConsole: boolean;

  /** Enable OTEL collector output */
  enableOTEL: boolean;

  /** OTEL collector endpoint URL */
  otelEndpoint?: string;

  /** Current environment (affects default settings) */
  environment: Environment;
}

/**
 * Log record structure for internal processing
 * Used internally to represent a log entry before formatting
 */
export interface LogRecord {
  /** ISO timestamp string */
  timestamp: string;

  /** Log level */
  level: LogLevel;

  /** Service name */
  service: string;

  /** Log message */
  message: string;

  /** Optional metadata */
  metadata?: Record<string, any>;

  /** Trace ID if available (for correlation) */
  traceId?: string;

  /** Span ID if available (for correlation) */
  spanId?: string;
}
```

### Task 2.2: Create Type Definitions and Enums

**Estimated Time**: 20 minutes

Define all types, enums, and custom error classes:

```typescript
// apps/task-manager/src/common/utils/logging/types.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Environment = 'development' | 'production' | 'test';

/**
 * Logger initialization state
 * Tracks the current state of the logger factory
 */
export enum LoggerState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  SHUTDOWN = 'shutdown',
}

/**
 * Error types for logger operations
 * Categorizes different types of logger-related errors
 */
export enum LoggerErrorType {
  INITIALIZATION_FAILED = 'initialization_failed',
  OTEL_CONNECTION_FAILED = 'otel_connection_failed',
  CONFIGURATION_INVALID = 'configuration_invalid',
  SHUTDOWN_FAILED = 'shutdown_failed',
}

/**
 * Custom error class for logger operations
 * Provides structured error handling with categorization
 */
export class LoggerError extends Error {
  constructor(message: string, public readonly type: LoggerErrorType, public readonly cause?: Error) {
    super(message);
    this.name = 'LoggerError';
  }
}
```

### Task 2.3: Create Configuration Utilities

**Estimated Time**: 45 minutes

Build utilities for parsing environment variables and validating configuration:

```typescript
// apps/task-manager/src/common/utils/logging/config.ts

import { LoggerConfig, LogLevel, Environment } from './types';

/**
 * Create logger configuration from environment variables
 * Provides sensible defaults and handles missing environment variables
 */
export function createLoggerConfig(): LoggerConfig {
  const serviceName = process.env.SERVICE_NAME || 'task-manager';
  const logLevel = parseLogLevel(process.env.LOG_LEVEL);
  const environment = parseEnvironment(process.env.NODE_ENV);
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  return {
    serviceName,
    logLevel,
    enableConsole: true, // Always enable console output
    enableOTEL: environment !== 'test', // Disable OTEL in test environment
    otelEndpoint,
    environment,
  };
}

/**
 * Parse and validate log level from string
 * Provides fallback to 'info' if invalid level specified
 */
function parseLogLevel(level?: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  if (!level) {
    return 'info'; // Default level
  }

  const normalizedLevel = level.toLowerCase() as LogLevel;

  if (validLevels.includes(normalizedLevel)) {
    return normalizedLevel;
  }

  console.warn(`Invalid log level '${level}', defaulting to 'info'`);
  return 'info';
}

/**
 * Parse and validate environment from string
 * Provides fallback to 'development' if invalid environment specified
 */
function parseEnvironment(env?: string): Environment {
  const validEnvironments: Environment[] = ['development', 'production', 'test'];

  if (!env) {
    return 'development'; // Default environment
  }

  const normalizedEnv = env.toLowerCase() as Environment;

  if (validEnvironments.includes(normalizedEnv)) {
    return normalizedEnv;
  }

  console.warn(`Invalid environment '${env}', defaulting to 'development'`);
  return 'development';
}

/**
 * Validate logger configuration
 * Throws errors for invalid configuration that would prevent logger operation
 */
export function validateLoggerConfig(config: LoggerConfig): boolean {
  if (!config.serviceName || config.serviceName.trim() === '') {
    throw new Error('Service name cannot be empty');
  }

  if (config.enableOTEL && (!config.otelEndpoint || config.otelEndpoint.trim() === '')) {
    throw new Error('OTEL endpoint cannot be empty when OTEL is enabled');
  }

  return true;
}
```

### Task 2.4: Implement Logger Factory

**Estimated Time**: 60 minutes

Create the singleton factory that manages logger lifecycle:

```typescript
// apps/task-manager/src/common/utils/logging/logger-factory.ts

import { ILogger, LoggerConfig } from './interfaces';
import { LoggerState, LoggerError, LoggerErrorType } from './types';
import { createLoggerConfig, validateLoggerConfig } from './config';

/**
 * Singleton factory for managing logger instances
 * Ensures single logger instance across application with proper lifecycle management
 */
export class LoggerFactory {
  private static instance: LoggerFactory | null = null;
  private logger: ILogger | null = null;
  private config: LoggerConfig | null = null;
  private state: LoggerState = LoggerState.UNINITIALIZED;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance of LoggerFactory
   * Creates instance on first call, returns same instance on subsequent calls
   */
  public static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * Initialize logger with configuration
   * Must be called before using the logger
   * @param config - Logger configuration (optional, will use environment if not provided)
   */
  public async initialize(config?: LoggerConfig): Promise<void> {
    if (this.state === LoggerState.READY) {
      return; // Already initialized, no-op
    }

    if (this.state === LoggerState.INITIALIZING) {
      throw new LoggerError('Logger initialization already in progress', LoggerErrorType.INITIALIZATION_FAILED);
    }

    try {
      this.state = LoggerState.INITIALIZING;

      // Use provided config or create from environment variables
      this.config = config || createLoggerConfig();

      // Validate configuration before proceeding
      validateLoggerConfig(this.config);

      // Import and create logger (dynamic import to avoid circular dependencies)
      const { OTELLogger } = await import('./otel-logger');
      this.logger = new OTELLogger(this.config);

      this.state = LoggerState.READY;

      // Log successful initialization (this should work now)
      this.logger.info('Logger initialized successfully', {
        serviceName: this.config.serviceName,
        logLevel: this.config.logLevel,
        environment: this.config.environment,
        otelEnabled: this.config.enableOTEL,
      });
    } catch (error) {
      this.state = LoggerState.ERROR;
      const loggerError = new LoggerError('Failed to initialize logger', LoggerErrorType.INITIALIZATION_FAILED, error instanceof Error ? error : new Error(String(error)));

      // Fallback to console logging for error reporting
      console.error('Logger initialization failed:', loggerError.message);
      if (loggerError.cause) {
        console.error('Caused by:', loggerError.cause.message);
      }
      throw loggerError;
    }
  }

  /**
   * Get logger instance
   * @throws {LoggerError} If logger is not initialized
   */
  public getLogger(): ILogger {
    if (this.state !== LoggerState.READY || !this.logger) {
      throw new LoggerError('Logger not initialized. Call initialize() first.', LoggerErrorType.INITIALIZATION_FAILED);
    }

    return this.logger;
  }

  /**
   * Check if logger is initialized and ready for use
   */
  public isInitialized(): boolean {
    return this.state === LoggerState.READY && this.logger !== null;
  }

  /**
   * Get current logger state
   */
  public getState(): LoggerState {
    return this.state;
  }

  /**
   * Get current configuration (null if not initialized)
   */
  public getConfig(): LoggerConfig | null {
    return this.config;
  }

  /**
   * Shutdown logger and cleanup resources
   * Should be called during application shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.state === LoggerState.SHUTDOWN) {
      return; // Already shutdown, no-op
    }

    try {
      this.state = LoggerState.SHUTDOWN;

      // Call shutdown on logger if it supports it
      if (this.logger && 'shutdown' in this.logger) {
        await (this.logger as any).shutdown();
      }

      this.logger = null;
      this.config = null;

      console.info('Logger shutdown completed');
    } catch (error) {
      const loggerError = new LoggerError('Failed to shutdown logger', LoggerErrorType.SHUTDOWN_FAILED, error instanceof Error ? error : new Error(String(error)));

      console.error('Logger shutdown failed:', loggerError.message);
      throw loggerError;
    }
  }

  /**
   * Reset factory state (for testing purposes)
   * @internal Only use in tests
   */
  public static reset(): void {
    LoggerFactory.instance = null;
  }
}
```

### Task 2.5: Create Module Index

**Estimated Time**: 10 minutes

Create the main export file for the logging module:

```typescript
// apps/task-manager/src/common/utils/logging/index.ts

// Re-export all public interfaces and types
export { ILogger, LoggerConfig, LogRecord } from './interfaces';
export { LogLevel, Environment, LoggerState, LoggerError, LoggerErrorType } from './types';
export { LoggerFactory } from './logger-factory';
export { createLoggerConfig, validateLoggerConfig } from './config';

// Note: OTELLogger will be exported after Job 3 is complete
```

### Task 2.6: Update TypeScript Configuration

**Estimated Time**: 5 minutes

Ensure TypeScript can properly resolve the new modules:

```json
// Verify in tsconfig.json that these settings are present:
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "node",
    "strict": true
  }
}
```

## Validation Criteria

### ✅ Technical Validation

1. **TypeScript Compilation**: All new files compile without errors
2. **Interface Design**: ILogger interface matches current usage patterns
3. **Singleton Pattern**: LoggerFactory properly implements singleton
4. **Configuration Parsing**: Environment variables parsed correctly
5. **Error Handling**: Custom errors provide meaningful messages

### ✅ Functional Validation

1. **Factory Creation**: `LoggerFactory.getInstance()` returns same instance
2. **Configuration**: `createLoggerConfig()` handles missing env vars gracefully
3. **Validation**: `validateLoggerConfig()` catches invalid configurations
4. **State Management**: Factory tracks initialization state correctly

## Testing Instructions

### Manual Testing

```typescript
// Test in Node.js REPL or temporary test file:
import { LoggerFactory, createLoggerConfig } from './src/common/utils/logging';

// Test configuration
const config = createLoggerConfig();
console.log('Config:', config);

// Test factory singleton
const factory1 = LoggerFactory.getInstance();
const factory2 = LoggerFactory.getInstance();
console.log('Singleton test:', factory1 === factory2); // Should be true

// Test state tracking
console.log('Initial state:', factory1.getState()); // Should be 'uninitialized'
```

### Build Verification

```bash
cd apps/task-manager
npm run build
# Should compile without errors
```

## Expected Output

### Configuration Example

```javascript
{
  serviceName: 'task-manager',
  logLevel: 'info',
  enableConsole: true,
  enableOTEL: true,
  otelEndpoint: 'http://localhost:4318',
  environment: 'development'
}
```

### File Structure After Completion

```
src/common/utils/logging/
├── interfaces.ts        # ILogger, LoggerConfig, LogRecord
├── types.ts            # LogLevel, Environment, enums, errors
├── config.ts           # Configuration utilities
├── logger-factory.ts   # Singleton factory implementation
├── index.ts            # Module exports
└── __tests__/          # Ready for test files
```

## Deliverables

- [ ] **Core Interfaces**: ILogger, LoggerConfig, LogRecord defined
- [ ] **Type System**: Comprehensive types, enums, and error classes
- [ ] **Configuration**: Environment-based config with validation
- [ ] **Factory Pattern**: Singleton LoggerFactory with lifecycle management
- [ ] **Module Structure**: Clean exports and TypeScript compatibility
- [ ] **Documentation**: JSDoc comments on all public interfaces

## Dependencies for Next Jobs

**Enables**:

- Job 3: OTEL Logger Implementation (can implement ILogger interface)
- Provides foundation for all subsequent jobs

**Blocks**: Jobs 3, 4, 5, 6 all depend on these interfaces

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**

   - Solution: Ensure all imports use correct relative paths
   - Check tsconfig.json has proper module resolution

2. **Circular Dependency Warnings**

   - Solution: Use dynamic imports in factory for logger implementation
   - Keep interfaces separate from implementations

3. **Singleton Not Working**
   - Solution: Ensure constructor is private
   - Verify getInstance() creates only one instance

## Notes

- 🏗️ **Architecture**: This job creates the foundation for everything else
- 🔒 **Type Safety**: Strong typing prevents runtime errors
- 🏭 **Factory Pattern**: Ensures proper initialization and lifecycle
- ⚙️ **Configuration**: Flexible config supports different environments
- 🧪 **Testable**: Clean interfaces make testing straightforward

## Ready for Next Job

Upon completion, Job 3 (OTEL Logger Implementation) can begin with a solid foundation.
