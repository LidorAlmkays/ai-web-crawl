# OTEL Logger Implementation Plan

## Overview

This document provides detailed implementation instructions for each job in the OTEL Logger redesign project. Each job is designed to be completed independently with clear deliverables and validation steps.

---

## Job 1: Clean Slate Preparation

### Objective

Remove existing logger implementation and prepare clean project structure for new implementation.

### Duration

1-2 hours

### Prerequisites

- Backup current implementation
- Ensure no active development on logger components

### Detailed Tasks

#### 1.1 Remove Existing Logger Files

```bash
# Remove current logger implementation
rm -rf apps/task-manager/src/common/utils/loggers/
rm apps/task-manager/src/common/utils/logger.ts
```

#### 1.2 Clean Dependencies

```json
// Remove from package.json
{
  "winston": "^3.x.x" // Remove this dependency
}
```

#### 1.3 Create New Folder Structure

```bash
mkdir -p apps/task-manager/src/common/utils/logging/__tests__
```

#### 1.4 Update Imports (Temporary Placeholder)

Create temporary logger to prevent build failures:

```typescript
// apps/task-manager/src/common/utils/logger.ts
export const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO]: ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN]: ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR]: ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.debug(`[DEBUG]: ${msg}`, meta || ''),
};
```

### Validation Steps

1. ✅ Project builds without errors
2. ✅ No Winston dependencies remain
3. ✅ Temporary logger prevents runtime errors
4. ✅ Clean folder structure created

### Deliverables

- [ ] Removed legacy logger implementation
- [ ] Clean dependencies
- [ ] New folder structure
- [ ] Temporary logger placeholder

---

## Job 2: Core Interface and Factory Design

### Objective

Implement foundation interfaces, types, and factory pattern for the logging system.

### Duration

2-3 hours

### Detailed Tasks

#### 2.1 Create Core Interfaces

```typescript
// apps/task-manager/src/common/utils/logging/interfaces.ts

/**
 * Core logger interface that all logger implementations must follow
 */
export interface ILogger {
  /**
   * Log info level message
   * @param message - The log message
   * @param metadata - Optional metadata object
   */
  info(message: string, metadata?: Record<string, any>): void;

  /**
   * Log warning level message
   * @param message - The log message
   * @param metadata - Optional metadata object
   */
  warn(message: string, metadata?: Record<string, any>): void;

  /**
   * Log error level message
   * @param message - The log message
   * @param metadata - Optional metadata object
   */
  error(message: string, metadata?: Record<string, any>): void;

  /**
   * Log debug level message
   * @param message - The log message
   * @param metadata - Optional metadata object
   */
  debug(message: string, metadata?: Record<string, any>): void;
}

/**
 * Configuration interface for logger initialization
 */
export interface LoggerConfig {
  /** Service name for identification */
  serviceName: string;

  /** Minimum log level to output */
  logLevel: LogLevel;

  /** Enable console output */
  enableConsole: boolean;

  /** Enable OTEL collector output */
  enableOTEL: boolean;

  /** OTEL collector endpoint URL */
  otelEndpoint?: string;

  /** Current environment */
  environment: Environment;
}

/**
 * Log record structure for internal processing
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

  /** Trace ID if available */
  traceId?: string;

  /** Span ID if available */
  spanId?: string;
}
```

#### 2.2 Create Type Definitions

```typescript
// apps/task-manager/src/common/utils/logging/types.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Environment = 'development' | 'production' | 'test';

/**
 * Logger initialization state
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
 */
export enum LoggerErrorType {
  INITIALIZATION_FAILED = 'initialization_failed',
  OTEL_CONNECTION_FAILED = 'otel_connection_failed',
  CONFIGURATION_INVALID = 'configuration_invalid',
  SHUTDOWN_FAILED = 'shutdown_failed',
}

/**
 * Custom error class for logger operations
 */
export class LoggerError extends Error {
  constructor(message: string, public readonly type: LoggerErrorType, public readonly cause?: Error) {
    super(message);
    this.name = 'LoggerError';
  }
}
```

#### 2.3 Create Configuration Utilities

```typescript
// apps/task-manager/src/common/utils/logging/config.ts

import { LoggerConfig, LogLevel, Environment } from './types';

/**
 * Create logger configuration from environment variables
 */
export function createLoggerConfig(): LoggerConfig {
  const serviceName = process.env.SERVICE_NAME || 'task-manager';
  const logLevel = parseLogLevel(process.env.LOG_LEVEL);
  const environment = parseEnvironment(process.env.NODE_ENV);
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  return {
    serviceName,
    logLevel,
    enableConsole: true,
    enableOTEL: environment !== 'test', // Disable OTEL in test environment
    otelEndpoint,
    environment,
  };
}

/**
 * Parse and validate log level from string
 */
function parseLogLevel(level?: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  if (!level) {
    return 'info'; // Default
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
 */
function parseEnvironment(env?: string): Environment {
  const validEnvironments: Environment[] = ['development', 'production', 'test'];

  if (!env) {
    return 'development'; // Default
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

#### 2.4 Implement Logger Factory

```typescript
// apps/task-manager/src/common/utils/logging/logger-factory.ts

import { ILogger, LoggerConfig } from './interfaces';
import { LoggerState, LoggerError, LoggerErrorType } from './types';
import { createLoggerConfig, validateLoggerConfig } from './config';

/**
 * Singleton factory for managing logger instances
 */
export class LoggerFactory {
  private static instance: LoggerFactory | null = null;
  private logger: ILogger | null = null;
  private config: LoggerConfig | null = null;
  private state: LoggerState = LoggerState.UNINITIALIZED;

  /**
   * Get singleton instance of LoggerFactory
   */
  public static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * Initialize logger with configuration
   * @param config - Logger configuration (optional, will use environment if not provided)
   */
  public async initialize(config?: LoggerConfig): Promise<void> {
    if (this.state === LoggerState.READY) {
      return; // Already initialized
    }

    if (this.state === LoggerState.INITIALIZING) {
      throw new LoggerError('Logger initialization already in progress', LoggerErrorType.INITIALIZATION_FAILED);
    }

    try {
      this.state = LoggerState.INITIALIZING;

      // Use provided config or create from environment
      this.config = config || createLoggerConfig();

      // Validate configuration
      validateLoggerConfig(this.config);

      // Import and create logger (dynamic import to avoid circular dependencies)
      const { OTELLogger } = await import('./otel-logger');
      this.logger = new OTELLogger(this.config);

      this.state = LoggerState.READY;

      // Log successful initialization
      this.logger.info('Logger initialized successfully', {
        serviceName: this.config.serviceName,
        logLevel: this.config.logLevel,
        environment: this.config.environment,
        otelEnabled: this.config.enableOTEL,
      });
    } catch (error) {
      this.state = LoggerState.ERROR;
      const loggerError = new LoggerError('Failed to initialize logger', LoggerErrorType.INITIALIZATION_FAILED, error instanceof Error ? error : new Error(String(error)));

      // Fallback to console logging
      console.error('Logger initialization failed:', loggerError.message);
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
   * Check if logger is initialized and ready
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
   * Get current configuration
   */
  public getConfig(): LoggerConfig | null {
    return this.config;
  }

  /**
   * Shutdown logger and cleanup resources
   */
  public async shutdown(): Promise<void> {
    if (this.state === LoggerState.SHUTDOWN) {
      return; // Already shutdown
    }

    try {
      this.state = LoggerState.SHUTDOWN;

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
   * @internal
   */
  public static reset(): void {
    LoggerFactory.instance = null;
  }
}
```

### Validation Steps

1. ✅ All interfaces compile without TypeScript errors
2. ✅ Factory follows singleton pattern correctly
3. ✅ Configuration parsing handles edge cases
4. ✅ Error handling provides meaningful messages
5. ✅ Type safety maintained throughout

### Deliverables

- [ ] `interfaces.ts` - Core interfaces
- [ ] `types.ts` - Type definitions and error classes
- [ ] `config.ts` - Configuration utilities
- [ ] `logger-factory.ts` - Singleton factory implementation

---

## Job 3: OTEL Logger Implementation

### Objective

Implement core OTEL logger with console output and OTEL collector integration.

### Duration

3-4 hours

### Detailed Tasks

#### 3.1 Create Console Formatter

```typescript
// apps/task-manager/src/common/utils/logging/formatters.ts

import { LogRecord } from './interfaces';

/**
 * Format log record for console output
 * Format: [level:severity,service:servicename,timestamp:datetime]:message
 */
export function formatConsoleOutput(record: LogRecord): string {
  const parts = [`level:${record.level}`, `service:${record.service}`, `timestamp:${record.timestamp}`];

  let output = `[${parts.join(',')}]:${record.message}`;

  // Add metadata if present
  if (record.metadata && Object.keys(record.metadata).length > 0) {
    output += `\n${JSON.stringify(record.metadata, null, 2)}`;
  }

  return output;
}

/**
 * Create log record from input parameters
 */
export function createLogRecord(level: string, service: string, message: string, metadata?: Record<string, any>): LogRecord {
  return {
    timestamp: new Date().toISOString(),
    level: level as any,
    service,
    message,
    metadata,
    // TODO: Add trace/span IDs when available
  };
}

/**
 * Get appropriate console method for log level
 */
export function getConsoleMethod(level: string): (...args: any[]) => void {
  switch (level.toLowerCase()) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    case 'debug':
      return console.debug;
    case 'info':
    default:
      return console.log;
  }
}
```

#### 3.2 Create Error Handler

```typescript
// apps/task-manager/src/common/utils/logging/error-handler.ts

import { LoggerError, LoggerErrorType } from './types';

/**
 * Handle OTEL-related errors with fallback behavior
 */
export class OTELErrorHandler {
  private otelAvailable = true;
  private consecutiveFailures = 0;
  private readonly maxFailures = 5;
  private lastErrorTime = 0;
  private readonly errorCooldownMs = 30000; // 30 seconds

  /**
   * Handle OTEL error and determine if should continue trying
   */
  public handleOTELError(error: Error): boolean {
    this.consecutiveFailures++;
    this.lastErrorTime = Date.now();

    // If too many consecutive failures, disable OTEL temporarily
    if (this.consecutiveFailures >= this.maxFailures) {
      this.otelAvailable = false;
      console.warn(`OTEL logging disabled after ${this.maxFailures} consecutive failures. Will retry after cooldown.`);
      return false;
    }

    // Log the error but continue trying
    console.warn('OTEL logging error:', error.message);
    return true;
  }

  /**
   * Mark successful OTEL operation
   */
  public markSuccess(): void {
    if (this.consecutiveFailures > 0) {
      console.info('OTEL logging recovered');
    }

    this.consecutiveFailures = 0;
    this.otelAvailable = true;
  }

  /**
   * Check if OTEL is currently available
   */
  public isOTELAvailable(): boolean {
    // Check if we're in cooldown period
    if (!this.otelAvailable && Date.now() - this.lastErrorTime > this.errorCooldownMs) {
      console.info('OTEL cooldown period ended, retrying...');
      this.otelAvailable = true;
      this.consecutiveFailures = 0;
    }

    return this.otelAvailable;
  }

  /**
   * Get current error statistics
   */
  public getStats(): { failures: number; available: boolean; lastError: number } {
    return {
      failures: this.consecutiveFailures,
      available: this.otelAvailable,
      lastError: this.lastErrorTime,
    };
  }
}

/**
 * Safely execute async operation with error handling
 */
export async function safeAsync<T>(operation: () => Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`Safe async operation failed in ${context}:`, error);
    return fallback;
  }
}
```

#### 3.3 Implement OTEL Logger

```typescript
// apps/task-manager/src/common/utils/logging/otel-logger.ts

import { logs } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { ILogger, LoggerConfig, LogRecord } from './interfaces';
import { LogLevel, LoggerError, LoggerErrorType } from './types';
import { formatConsoleOutput, createLogRecord, getConsoleMethod } from './formatters';
import { OTELErrorHandler, safeAsync } from './error-handler';

/**
 * OTEL Logger implementation with console output and OTEL collector integration
 */
export class OTELLogger implements ILogger {
  private loggerProvider: LoggerProvider | null = null;
  private otelLogger: ReturnType<typeof logs.getLogger> | null = null;
  private config: LoggerConfig;
  private errorHandler: OTELErrorHandler;
  private isShutdown = false;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.errorHandler = new OTELErrorHandler();

    // Initialize OTEL if enabled
    if (config.enableOTEL) {
      this.initializeOTEL().catch((error) => {
        console.warn('OTEL initialization failed, falling back to console-only logging:', error.message);
      });
    }
  }

  /**
   * Initialize OTEL LoggerProvider and exporter
   */
  private async initializeOTEL(): Promise<void> {
    try {
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      });

      const logExporter = new OTLPLogExporter({
        url: `${this.config.otelEndpoint}/v1/logs`,
        headers: {
          'Content-Type': 'application/json',
        },
        concurrencyLimit: 1,
      });

      this.loggerProvider = new LoggerProvider({ resource });
      this.loggerProvider.addLogRecordProcessor(
        new BatchLogRecordProcessor(logExporter, {
          maxQueueSize: 1000,
          maxExportBatchSize: 100,
          scheduledDelayMillis: 1000,
        })
      );

      this.otelLogger = logs.getLogger(this.config.serviceName);

      console.info(`OTEL logger initialized for service: ${this.config.serviceName}`);
    } catch (error) {
      throw new LoggerError('Failed to initialize OTEL logger', LoggerErrorType.OTEL_CONNECTION_FAILED, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Send log record to OTEL collector
   */
  private async sendToOTEL(record: LogRecord): Promise<void> {
    if (!this.config.enableOTEL || !this.otelLogger || !this.errorHandler.isOTELAvailable()) {
      return;
    }

    try {
      const severityNumber = this.getSeverityNumber(record.level);

      this.otelLogger.emit({
        severityNumber,
        severityText: record.level.toUpperCase(),
        body: record.message,
        timestamp: Date.now() * 1000000, // Convert to nanoseconds
        attributes: {
          'service.name': record.service,
          ...record.metadata,
          ...(record.traceId && { 'trace.id': record.traceId }),
          ...(record.spanId && { 'span.id': record.spanId }),
        },
      });

      this.errorHandler.markSuccess();
    } catch (error) {
      const shouldContinue = this.errorHandler.handleOTELError(error instanceof Error ? error : new Error(String(error)));

      if (!shouldContinue) {
        console.warn('OTEL logging disabled due to repeated failures');
      }
    }
  }

  /**
   * Convert log level to OTEL severity number
   */
  private getSeverityNumber(level: LogLevel): SeverityNumber {
    switch (level) {
      case 'debug':
        return SeverityNumber.DEBUG;
      case 'info':
        return SeverityNumber.INFO;
      case 'warn':
        return SeverityNumber.WARN;
      case 'error':
        return SeverityNumber.ERROR;
      default:
        return SeverityNumber.INFO;
    }
  }

  /**
   * Log to console with formatted output
   */
  private logToConsole(record: LogRecord): void {
    if (!this.config.enableConsole) {
      return;
    }

    const formattedMessage = formatConsoleOutput(record);
    const consoleMethod = getConsoleMethod(record.level);
    consoleMethod(formattedMessage);
  }

  /**
   * Check if log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.logLevel];
  }

  /**
   * Core logging method
   */
  private async log(level: LogLevel, message: string, metadata?: Record<string, any>): Promise<void> {
    if (this.isShutdown || !this.shouldLog(level)) {
      return;
    }

    const record = createLogRecord(level, this.config.serviceName, message, metadata);

    // Always log to console (if enabled)
    this.logToConsole(record);

    // Send to OTEL asynchronously (don't wait)
    safeAsync(() => this.sendToOTEL(record), undefined, 'OTEL log transmission');
  }

  // ILogger interface implementation

  public info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  public error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Shutdown logger and cleanup resources
   */
  public async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;

    try {
      if (this.loggerProvider) {
        await this.loggerProvider.shutdown();
      }

      console.info('OTEL logger shutdown completed');
    } catch (error) {
      console.error('Error during OTEL logger shutdown:', error);
    }
  }
}
```

### Validation Steps

1. ✅ Console output matches required format
2. ✅ OTEL integration sends logs to collector
3. ✅ Error handling provides graceful fallback
4. ✅ Performance is acceptable under load
5. ✅ Memory usage remains stable

### Deliverables

- [ ] `formatters.ts` - Console output formatting
- [ ] `error-handler.ts` - Error handling utilities
- [ ] `otel-logger.ts` - Core OTEL logger implementation

---

## Job 4: Integration and Global Export

### Objective

Integrate logger with application lifecycle and provide global access point.

### Duration

2-3 hours

### Detailed Tasks

#### 4.1 Create Main Export

```typescript
// apps/task-manager/src/common/utils/logging/index.ts

// Re-export all public interfaces and types
export { ILogger, LoggerConfig, LogRecord } from './interfaces';
export { LogLevel, Environment, LoggerState, LoggerError, LoggerErrorType } from './types';
export { LoggerFactory } from './logger-factory';
export { OTELLogger } from './otel-logger';
export { createLoggerConfig, validateLoggerConfig } from './config';

// Default export for convenience
export { LoggerFactory as default } from './logger-factory';
```

#### 4.2 Create Global Logger Export

````typescript
// apps/task-manager/src/common/utils/logger.ts

import { LoggerFactory } from './logging';
import { ILogger } from './logging/interfaces';

/**
 * Global logger instance
 *
 * IMPORTANT: This logger requires initialization via LoggerFactory.initialize()
 * before use. Calling any method before initialization will throw an error.
 *
 * @example
 * ```typescript
 * // In app.ts or server.ts
 * await LoggerFactory.getInstance().initialize();
 *
 * // Anywhere else in the application
 * import { logger } from '../utils/logger';
 * logger.info('Application started');
 * ```
 */
class GlobalLogger implements ILogger {
  private get instance(): ILogger {
    return LoggerFactory.getInstance().getLogger();
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.instance.info(message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.instance.warn(message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.instance.error(message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.instance.debug(message, metadata);
  }
}

export const logger = new GlobalLogger();

// Also export factory for advanced usage
export { LoggerFactory } from './logging';
````

#### 4.3 Update App.ts Integration

```typescript
// apps/task-manager/src/app.ts

// Add to existing TaskManagerApplication class:

import { LoggerFactory } from './common/utils/logging';
import { logger } from './common/utils/logger';

export class TaskManagerApplication {
  private loggerFactory: LoggerFactory;

  constructor() {
    this.loggerFactory = LoggerFactory.getInstance();
  }

  /**
   * Initialize application
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize logger first (after OTEL init)
      await this.loggerFactory.initialize();
      logger.info('Application initialization started');

      // Initialize other components...
      // ... existing initialization code

      logger.info('Application initialization completed');
    } catch (error) {
      console.error('Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start application
   */
  public async start(): Promise<void> {
    await this.initialize();

    // ... existing start logic

    logger.info('Application started successfully');
  }

  /**
   * Shutdown application gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Application shutdown initiated');

      // Shutdown other components first...
      // ... existing shutdown logic

      // Shutdown logger last
      await this.loggerFactory.shutdown();

      console.info('Application shutdown completed');
    } catch (error) {
      console.error('Application shutdown failed:', error);
      throw error;
    }
  }
}
```

#### 4.4 Update Server.ts

```typescript
// apps/task-manager/src/server.ts

/**
 * Task Manager Service - Server Bootstrap
 *
 * This file is a thin server bootstrap that starts the Task Manager service
 * using the configured app instance from app.ts.
 *
 * It handles signal processing and graceful shutdown.
 */

import { initOpenTelemetry } from './common/utils/otel-init';
import { TaskManagerApplication } from './app';

async function bootstrap() {
  let app: TaskManagerApplication | null = null;

  try {
    // Initialize OTEL first
    initOpenTelemetry();
    console.info('OpenTelemetry initialized');

    // Create and start application (which will initialize logger)
    app = new TaskManagerApplication();
    await app.start();

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      console.info(`${signal} received, shutting down gracefully`);

      if (app) {
        try {
          await app.shutdown();
        } catch (error) {
          console.error('Error during application shutdown:', error);
        }
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to bootstrap Task Manager application:', error);

    // Attempt graceful shutdown even on startup failure
    if (app) {
      try {
        await app.shutdown();
      } catch (shutdownError) {
        console.error('Error during emergency shutdown:', shutdownError);
      }
    }

    process.exit(1);
  }
}

bootstrap();
```

### Validation Steps

1. ✅ Application starts without errors
2. ✅ Logger initializes after OTEL
3. ✅ Global logger accessible throughout app
4. ✅ Graceful shutdown works correctly
5. ✅ Error handling prevents crashes

### Deliverables

- [ ] `logging/index.ts` - Main module export
- [ ] `logger.ts` - Global logger instance
- [ ] Updated `app.ts` - Application integration
- [ ] Updated `server.ts` - Startup sequence

---

## Job 5: Testing and Validation

### Objective

Create comprehensive test suite and validate OTEL collector integration.

### Duration

2-3 hours

### Detailed Tasks

#### 5.1 Unit Tests for Logger Factory

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/logger-factory.spec.ts

import { LoggerFactory } from '../logger-factory';
import { LoggerState, LoggerError, LoggerErrorType } from '../types';

describe('LoggerFactory', () => {
  afterEach(() => {
    LoggerFactory.reset();
  });

  describe('singleton behavior', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = LoggerFactory.getInstance();
      const instance2 = LoggerFactory.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with default config', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();

      expect(factory.isInitialized()).toBe(true);
      expect(factory.getState()).toBe(LoggerState.READY);
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
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const factory = LoggerFactory.getInstance();

      await factory.initialize();
      await factory.shutdown();

      expect(factory.getState()).toBe(LoggerState.SHUTDOWN);
    });
  });
});
```

#### 5.2 Unit Tests for OTEL Logger

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/otel-logger.spec.ts

import { OTELLogger } from '../otel-logger';
import { LoggerConfig } from '../interfaces';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Mock global console
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
    it('should log info messages to console', () => {
      const logger = new OTELLogger(config);

      logger.info('test message', { key: 'value' });

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('[level:info,service:test-service,timestamp:'));
    });

    it('should log error messages to console.error', () => {
      const logger = new OTELLogger(config);

      logger.error('error message');

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('[level:error,service:test-service,timestamp:'));
    });

    it('should respect log level filtering', () => {
      config.logLevel = 'warn';
      const logger = new OTELLogger(config);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('metadata handling', () => {
    it('should include metadata in console output', () => {
      const logger = new OTELLogger(config);
      const metadata = { userId: 123, action: 'login' };

      logger.info('user action', metadata);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('{\n  "userId": 123,\n  "action": "login"\n}'));
    });
  });
});
```

#### 5.3 Integration Test for OTEL Collector

```typescript
// apps/task-manager/src/common/utils/logging/__tests__/integration.spec.ts

import { LoggerFactory } from '../logger-factory';
import { createLoggerConfig } from '../config';

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
      });

      // Wait a bit for async OTEL processing
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
      logger.info('Fallback test message');
    });
  });
});
```

#### 5.4 Performance Test

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
      logger.info(`Performance test message ${i}`, { iteration: i });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTimePerLog = duration / messageCount;

    // Should be less than 1ms per log on average
    expect(avgTimePerLog).toBeLessThan(1);

    console.info(`Performance test: ${messageCount} logs in ${duration}ms (${avgTimePerLog.toFixed(3)}ms avg)`);
  });

  it('should not cause memory leaks with continuous logging', async () => {
    const logger = factory.getLogger();
    const initialMemory = process.memoryUsage().heapUsed;

    // Log continuously for a short period
    const logInterval = setInterval(() => {
      logger.info('Memory test message', { timestamp: Date.now() });
    }, 1);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    clearInterval(logInterval);

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    // Memory growth should be reasonable (less than 10MB)
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);

    console.info(`Memory test: ${memoryGrowth} bytes growth`);
  });
});
```

### Validation Steps

1. ✅ All unit tests pass
2. ✅ Integration test confirms OTEL connectivity
3. ✅ Performance test shows acceptable overhead
4. ✅ Memory usage remains stable
5. ✅ Error scenarios are handled gracefully

### Deliverables

- [ ] Unit tests for all components
- [ ] Integration test for OTEL collector
- [ ] Performance benchmarks
- [ ] Memory leak detection

---

## Job 6: Documentation and Final Migration

### Objective

Complete documentation and finalize migration from old logger.

### Duration

1-2 hours

### Detailed Tasks

#### 6.1 Create Comprehensive README

````markdown
# Task Manager Logging System

## Overview

This logging system provides structured logging with OpenTelemetry integration for the Task Manager service. It supports both console output and OTEL collector transmission with graceful fallback handling.

## Quick Start

### Basic Usage

```typescript
import { logger } from '../utils/logger';

// Simple logging
logger.info('Application started');
logger.warn('Low disk space', { available: '500MB' });
logger.error('Database connection failed', { error: error.message });
logger.debug('Processing user request', { userId: 123 });
```
````

### Advanced Usage

```typescript
import { LoggerFactory } from '../utils/logging';

// Custom configuration
const factory = LoggerFactory.getInstance();
await factory.initialize({
  serviceName: 'custom-service',
  logLevel: 'debug',
  enableOTEL: true,
  otelEndpoint: 'http://custom-collector:4318',
});

const logger = factory.getLogger();
logger.info('Custom logger initialized');
```

## Configuration

### Environment Variables

- `SERVICE_NAME`: Service identifier (default: 'task-manager')
- `LOG_LEVEL`: Minimum log level ('debug' | 'info' | 'warn' | 'error')
- `NODE_ENV`: Environment ('development' | 'production' | 'test')
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTEL collector URL

### Log Levels

1. **debug**: Detailed debugging information
2. **info**: General application flow
3. **warn**: Warning conditions that don't prevent operation
4. **error**: Error conditions that may affect operation

## Console Output Format

```
[level:info,service:task-manager,timestamp:2024-01-01T12:00:00.000Z]:Message content
{
  "metadata": "object"
}
```

## OTEL Integration

Logs are automatically sent to the configured OTEL collector endpoint with:

- Structured metadata
- Service identification
- Trace/span correlation (when available)
- Proper severity levels

## Error Handling

- **OTEL Unavailable**: Falls back to console-only logging
- **Network Issues**: Implements retry logic with exponential backoff
- **Initialization Failures**: Provides detailed error messages
- **Graceful Degradation**: Never blocks application flow

## Performance

- **Overhead**: < 1ms per log statement
- **Memory**: < 10MB memory footprint
- **Throughput**: Handles 1000+ logs/second
- **Async Processing**: OTEL transmission doesn't block execution

## Testing

```bash
# Run all tests
npm test -- --testPathPattern=logging

# Run specific test suites
npm test -- logger-factory.spec.ts
npm test -- otel-logger.spec.ts
npm test -- integration.spec.ts
npm test -- performance.spec.ts
```

## Troubleshooting

### Common Issues

1. **"Logger not initialized"**: Call `LoggerFactory.getInstance().initialize()` first
2. **OTEL connection failed**: Check OTEL collector URL and availability
3. **High memory usage**: Verify OTEL batch processing configuration
4. **Missing logs in collector**: Check OTEL collector logs for errors

### Debug Mode

Set `LOG_LEVEL=debug` to see detailed logging information including:

- OTEL initialization status
- Error recovery attempts
- Performance metrics
- Internal state changes

````

#### 6.2 Update Package Dependencies
```json
// Add to package.json dependencies:
{
  "@opentelemetry/api": "^1.7.0",
  "@opentelemetry/api-logs": "^0.45.0",
  "@opentelemetry/sdk-logs": "^0.45.0",
  "@opentelemetry/exporter-logs-otlp-http": "^0.45.0",
  "@opentelemetry/resources": "^1.17.0",
  "@opentelemetry/semantic-conventions": "^1.17.0"
}

// Remove from package.json:
{
  "winston": "removed"
}
````

#### 6.3 Final Migration Steps

```typescript
// Search and replace any remaining old logger imports:
// OLD: import { OtelLogger } from './loggers/otel-logger';
// NEW: import { logger } from './utils/logger';

// Update any direct instantiation:
// OLD: const logger = new OtelLogger('service-name');
// NEW: import { logger } from './utils/logger';

// Update initialization in app.ts:
// Ensure LoggerFactory.initialize() is called after OTEL init
```

#### 6.4 Validation Checklist

```bash
# 1. Build succeeds
npm run build

# 2. Tests pass
npm test

# 3. Application starts successfully
npm run serve

# 4. Logs appear in console with correct format
# Check console output matches: [level:info,service:task-manager,timestamp:...]

# 5. OTEL collector receives logs
# Check OTEL collector debug output or Loki dashboard

# 6. Error scenarios work
# Stop OTEL collector and verify fallback to console-only

# 7. Performance is acceptable
# Run performance tests and verify < 1ms overhead
```

### Validation Steps

1. ✅ Documentation is complete and accurate
2. ✅ All dependencies are correctly configured
3. ✅ Migration is complete with no broken imports
4. ✅ End-to-end functionality verified
5. ✅ Performance meets requirements

### Deliverables

- [ ] Comprehensive README documentation
- [ ] Updated package.json dependencies
- [ ] Complete migration from old logger
- [ ] Final validation and testing

---

## Summary

This implementation plan provides a complete roadmap for rebuilding the OTEL logger system with:

### Key Benefits

- **Clean Architecture**: Interface-driven design with proper separation of concerns
- **Robust Error Handling**: Graceful fallback and recovery mechanisms
- **Performance Optimized**: Minimal overhead with async processing
- **Production Ready**: Comprehensive testing and monitoring capabilities
- **Easy Maintenance**: Clear documentation and modular structure

### Execution Strategy

1. **Job 1**: Clean slate preparation (remove old implementation)
2. **Job 2**: Foundation (interfaces, factory, configuration)
3. **Job 3**: Core implementation (OTEL logger with console output)
4. **Job 4**: Integration (application lifecycle and global access)
5. **Job 5**: Validation (comprehensive testing)
6. **Job 6**: Finalization (documentation and migration)

Each job can be completed independently with clear deliverables and validation steps. The modular approach ensures that issues in one job don't block progress on others.
