# Job 3: OTEL Logger Implementation

## Overview

**Status**: ✅ **COMPLETED**  
**Dependency Level**: 2 (Depends on Job 2)  
**Duration**: 3-4 hours  
**Description**: Implement the core OTEL logger with console output and OTEL collector integration. This is the heart of the logging system that actually handles log processing and transmission.

## Prerequisites

- ✅ Job 2 completed (interfaces and factory available)
- ✅ Understanding of OpenTelemetry concepts
- ✅ Knowledge of async/await patterns

## Dependencies

**Requires**: Job 2 (Core Interface and Factory Design)  
**Blocks**: Jobs 4, 5, 6

## Objectives

1. Implement console formatter matching user's preferred format
2. Create robust error handler for OTEL failures with fallback behavior
3. Build OTEL logger that implements ILogger interface
4. Integrate with OTEL SDK for log transmission to collector
5. Ensure async processing doesn't block application flow

## Detailed Tasks

### Task 3.1: Create Console Formatter

**Estimated Time**: 30 minutes

Implement formatters for console output matching the user's preferred format:

```typescript
// apps/task-manager/src/common/utils/logging/formatters.ts

import { LogRecord } from './interfaces';

/**
 * Format log record for console output
 * User preferred format: [level:severity,service:servicename,timestamp:datetime]:message
 */
export function formatConsoleOutput(record: LogRecord): string {
  const parts = [`level:${record.level}`, `service:${record.service}`, `timestamp:${record.timestamp}`];

  let output = `[${parts.join(',')}]:${record.message}`;

  // Add metadata if present (formatted as JSON on new line)
  if (record.metadata && Object.keys(record.metadata).length > 0) {
    output += `\n${JSON.stringify(record.metadata, null, 2)}`;
  }

  return output;
}

/**
 * Create log record from input parameters
 * Standardizes the creation of log records across the system
 */
export function createLogRecord(level: string, service: string, message: string, metadata?: Record<string, any>): LogRecord {
  return {
    timestamp: new Date().toISOString(),
    level: level as any,
    service,
    message,
    metadata,
    // TODO: Add trace/span IDs when available (future enhancement)
  };
}

/**
 * Get appropriate console method for log level
 * Ensures logs appear in correct console stream
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

/**
 * Format error objects for logging
 * Extracts useful information from Error objects
 */
export function formatError(error: any): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { error: String(error) };
}
```

### Task 3.2: Create Error Handler

**Estimated Time**: 45 minutes

Build robust error handling for OTEL failures with circuit breaker pattern:

```typescript
// apps/task-manager/src/common/utils/logging/error-handler.ts

import { LoggerError, LoggerErrorType } from './types';

/**
 * Handle OTEL-related errors with fallback behavior
 * Implements circuit breaker pattern to prevent cascading failures
 */
export class OTELErrorHandler {
  private otelAvailable = true;
  private consecutiveFailures = 0;
  private readonly maxFailures = 5;
  private lastErrorTime = 0;
  private readonly errorCooldownMs = 30000; // 30 seconds cooldown

  /**
   * Handle OTEL error and determine if should continue trying
   * @param error - The error that occurred
   * @returns true if should continue trying, false if should stop
   */
  public handleOTELError(error: Error): boolean {
    this.consecutiveFailures++;
    this.lastErrorTime = Date.now();

    // If too many consecutive failures, disable OTEL temporarily
    if (this.consecutiveFailures >= this.maxFailures) {
      this.otelAvailable = false;
      console.warn(`OTEL logging disabled after ${this.maxFailures} consecutive failures. ` + `Will retry after ${this.errorCooldownMs / 1000} seconds.`);
      return false;
    }

    // Log the error but continue trying
    console.warn('OTEL logging error:', error.message);
    return true;
  }

  /**
   * Mark successful OTEL operation
   * Resets failure counter and re-enables OTEL if it was disabled
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
   * Handles cooldown period and automatic retry
   */
  public isOTELAvailable(): boolean {
    // Check if we're in cooldown period and it has expired
    if (!this.otelAvailable && Date.now() - this.lastErrorTime > this.errorCooldownMs) {
      console.info('OTEL cooldown period ended, retrying...');
      this.otelAvailable = true;
      this.consecutiveFailures = 0;
    }

    return this.otelAvailable;
  }

  /**
   * Get current error statistics for monitoring
   */
  public getStats(): {
    failures: number;
    available: boolean;
    lastError: number;
    cooldownRemaining: number;
  } {
    const cooldownRemaining = this.otelAvailable ? 0 : Math.max(0, this.errorCooldownMs - (Date.now() - this.lastErrorTime));

    return {
      failures: this.consecutiveFailures,
      available: this.otelAvailable,
      lastError: this.lastErrorTime,
      cooldownRemaining,
    };
  }
}

/**
 * Safely execute async operation with error handling
 * Prevents async errors from crashing the application
 */
export async function safeAsync<T>(operation: () => Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`Safe async operation failed in ${context}:`, error);
    return fallback;
  }
}

/**
 * Safely execute sync operation with error handling
 */
export function safeSync<T>(operation: () => T, fallback: T, context: string): T {
  try {
    return operation();
  } catch (error) {
    console.warn(`Safe sync operation failed in ${context}:`, error);
    return fallback;
  }
}
```

### Task 3.3: Install Required OTEL Dependencies

**Estimated Time**: 15 minutes

Add the necessary OTEL packages to package.json:

```bash
cd apps/task-manager

# Install OTEL logging dependencies
npm install @opentelemetry/api@^1.7.0
npm install @opentelemetry/api-logs@^0.45.0
npm install @opentelemetry/sdk-logs@^0.45.0
npm install @opentelemetry/exporter-logs-otlp-http@^0.45.0
npm install @opentelemetry/resources@^1.17.0
npm install @opentelemetry/semantic-conventions@^1.17.0
```

### Task 3.4: Implement OTEL Logger Core

**Estimated Time**: 90 minutes

Create the main OTEL logger implementation:

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
import { formatConsoleOutput, createLogRecord, getConsoleMethod, formatError } from './formatters';
import { OTELErrorHandler, safeAsync } from './error-handler';

/**
 * OTEL Logger implementation with console output and OTEL collector integration
 * Implements the ILogger interface and provides both console and OTEL output
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

    // Initialize OTEL if enabled (async, don't block constructor)
    if (config.enableOTEL) {
      this.initializeOTEL().catch((error) => {
        console.warn('OTEL initialization failed, falling back to console-only logging:', error.message);
      });
    }
  }

  /**
   * Initialize OTEL LoggerProvider and exporter
   * Sets up the connection to OTEL collector
   */
  private async initializeOTEL(): Promise<void> {
    try {
      // Create resource with service identification
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      });

      // Configure OTLP log exporter
      const logExporter = new OTLPLogExporter({
        url: `${this.config.otelEndpoint}/v1/logs`,
        headers: {
          'Content-Type': 'application/json',
        },
        concurrencyLimit: 1, // Prevent overwhelming the collector
      });

      // Create logger provider with batch processing
      this.loggerProvider = new LoggerProvider({ resource });
      this.loggerProvider.addLogRecordProcessor(
        new BatchLogRecordProcessor(logExporter, {
          maxQueueSize: 1000, // Queue up to 1000 logs
          maxExportBatchSize: 100, // Send in batches of 100
          scheduledDelayMillis: 1000, // Send every second
        })
      );

      // Get the OTEL logger instance
      this.otelLogger = logs.getLogger(this.config.serviceName);

      console.info(`OTEL logger initialized for service: ${this.config.serviceName}`);
    } catch (error) {
      throw new LoggerError('Failed to initialize OTEL logger', LoggerErrorType.OTEL_CONNECTION_FAILED, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Send log record to OTEL collector
   * Handles errors gracefully and manages circuit breaker
   */
  private async sendToOTEL(record: LogRecord): Promise<void> {
    if (!this.config.enableOTEL || !this.otelLogger || !this.errorHandler.isOTELAvailable()) {
      return; // Skip if OTEL disabled or unavailable
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
   * Handles both console and OTEL output
   */
  private async log(level: LogLevel, message: string, metadata?: Record<string, any>): Promise<void> {
    if (this.isShutdown || !this.shouldLog(level)) {
      return;
    }

    // Process metadata to handle Error objects
    const processedMetadata = metadata ? this.processMetadata(metadata) : undefined;

    const record = createLogRecord(level, this.config.serviceName, message, processedMetadata);

    // Always log to console (if enabled) - synchronous
    this.logToConsole(record);

    // Send to OTEL asynchronously (don't wait to avoid blocking)
    safeAsync(() => this.sendToOTEL(record), undefined, 'OTEL log transmission');
  }

  /**
   * Process metadata to handle special objects like Errors
   */
  private processMetadata(metadata: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value instanceof Error) {
        processed[key] = formatError(value);
      } else {
        processed[key] = value;
      }
    }

    return processed;
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
   * Should be called during application shutdown
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

  /**
   * Get error handler statistics for monitoring
   */
  public getStats() {
    return this.errorHandler.getStats();
  }
}
```

### Task 3.5: Update Module Exports

**Estimated Time**: 10 minutes

Update the logging module to export the new OTEL logger:

```typescript
// apps/task-manager/src/common/utils/logging/index.ts

// Re-export all public interfaces and types
export { ILogger, LoggerConfig, LogRecord } from './interfaces';
export { LogLevel, Environment, LoggerState, LoggerError, LoggerErrorType } from './types';
export { LoggerFactory } from './logger-factory';
export { OTELLogger } from './otel-logger'; // Now available
export { createLoggerConfig, validateLoggerConfig } from './config';
export { formatConsoleOutput, createLogRecord } from './formatters';

// Default export for convenience
export { LoggerFactory as default } from './logger-factory';
```

### Task 3.6: Verify OTEL Integration

**Estimated Time**: 15 minutes

Test that OTEL logger can be created and basic functionality works:

```typescript
// Create test file: apps/task-manager/src/common/utils/logging/test-otel.ts
// (Remove after testing)

import { OTELLogger } from './otel-logger';
import { createLoggerConfig } from './config';

async function testOTELLogger() {
  const config = createLoggerConfig();

  console.log('Creating OTEL logger with config:', config);

  const logger = new OTELLogger(config);

  // Test basic logging
  logger.info('Test info message', { test: true });
  logger.warn('Test warning message');
  logger.error('Test error message', { error: 'test error' });
  logger.debug('Test debug message');

  // Wait a bit for async processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('Error handler stats:', logger.getStats());

  await logger.shutdown();
  console.log('Test completed');
}

// Run test
testOTELLogger().catch(console.error);
```

## Validation Criteria

### ✅ Technical Validation

1. **Console Output Format**: Logs appear as `[level:X,service:Y,timestamp:Z]:message`
2. **OTEL Integration**: Logger creates without errors, attempts OTEL connection
3. **Error Handling**: OTEL failures don't crash application
4. **Performance**: Logging doesn't block main thread
5. **Memory Management**: No memory leaks during continuous logging

### ✅ Functional Validation

1. **Interface Compliance**: OTELLogger implements ILogger correctly
2. **Log Levels**: Only logs at or above configured level
3. **Metadata Support**: Structured metadata appears in output
4. **Fallback Behavior**: Works even when OTEL collector unavailable
5. **Async Processing**: OTEL transmission doesn't block console output

## Testing Instructions

### Manual Testing

```bash
cd apps/task-manager

# Test compilation
npm run build

# Test basic functionality (create temporary test)
node -e "
const { OTELLogger } = require('./dist/common/utils/logging/otel-logger');
const { createLoggerConfig } = require('./dist/common/utils/logging/config');
const logger = new OTELLogger(createLoggerConfig());
logger.info('Test message', { test: true });
"
```

### Expected Console Output

```
[level:info,service:task-manager,timestamp:2024-01-01T12:00:00.000Z]:Test message
{
  "test": true
}
```

## Deliverables

- [ ] **Console Formatter**: Matches user's preferred format exactly
- [ ] **Error Handler**: Circuit breaker pattern with cooldown
- [ ] **OTEL Logger**: Full implementation of ILogger interface
- [ ] **OTEL Integration**: Working connection to collector
- [ ] **Async Processing**: Non-blocking log transmission
- [ ] **Package Dependencies**: All required OTEL packages installed

## Dependencies for Next Jobs

**Enables**:

- Job 4: Integration and Global Export (can use OTELLogger)
- Provides working logger implementation

**Blocks**: Jobs 4, 5, 6 need this implementation

## Troubleshooting

### Common Issues

1. **OTEL Connection Fails**

   - Solution: Check OTEL collector is running on correct port
   - Verify endpoint URL in environment variables
   - Error handler provides graceful fallback

2. **Console Format Wrong**

   - Solution: Check formatConsoleOutput function
   - Verify timestamp format is ISO string
   - Test with various metadata types

3. **Performance Issues**

   - Solution: Ensure async processing for OTEL
   - Check batch processing configuration
   - Monitor memory usage during high volume

4. **TypeScript Errors**
   - Solution: Ensure all OTEL packages have correct versions
   - Check import statements use correct paths
   - Verify interface implementation is complete

## Notes

- 🚀 **Performance**: Async OTEL processing prevents blocking
- 🔄 **Resilience**: Circuit breaker handles OTEL failures gracefully
- 📊 **Format**: Console output exactly matches user preferences
- 🔌 **Integration**: Works with existing OTEL collector setup
- 🧪 **Testable**: Error handler stats provide monitoring visibility

## Ready for Next Job

Upon completion, Job 4 (Integration and Global Export) can integrate this logger into the application lifecycle.
