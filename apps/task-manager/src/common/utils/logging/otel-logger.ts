import { ILogger, LoggerConfig, LogRecord } from './interfaces';
import { LogLevel } from './types';
import { ConsoleFormatter } from './formatters';
import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker';
import { trace } from '@opentelemetry/api';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

/**
 * OTEL Logger implementation that handles both console output and OTEL collector integration
 * Features:
 * - Console output with structured format
 * - OTEL collector integration with circuit breaker
 * - Trace context correlation
 * - Performance optimized (<1ms per log call)
 * - Graceful error handling with fallback to console-only
 */
export class OTELLogger implements ILogger {
  private circuitBreaker: CircuitBreaker;
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;

    // Configure circuit breaker for OTEL resilience
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5, // Open circuit after 5 failures
      resetTimeout: 30000, // Try to close circuit after 30 seconds
      successThreshold: 3, // Need 3 successes to close circuit
    };
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
  }

  /**
   * Log info level message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log warning level message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log error level message
   */
  error(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  /**
   * Log debug level message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log success level message (maps to info level for compatibility)
   */
  success(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.SUCCESS, message, { ...metadata, logType: 'success' });
  }

  /**
   * Core logging method that handles both console and OTEL output
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): void {
    try {
      // Quick performance check - reject if level is below configured threshold
      if (!this.shouldLog(level)) {
        return;
      }

      // Create log record with trace context
      const logRecord = this.createLogRecord(level, message, metadata);

      // Always output to console (this is fast and reliable)
      this.logToConsole(logRecord);

      // Send to OTEL collector if enabled and circuit allows
      if (this.config.enableOTEL && this.circuitBreaker.isCallAllowed()) {
        this.logToOTEL(logRecord).catch(() => {
          // Silent fallback - don't spam console with OTEL errors
          // The circuit breaker will handle the failure tracking
        });
      }
    } catch (error) {
      // Ultimate fallback - ensure logging never crashes the application
      console.error('Logger internal error:', error);
      console.log(
        `[level:${level},service:${
          this.config.serviceName
        },timestamp:${new Date().toISOString()}]:${message}`
      );
    }
  }

  /**
   * Check if we should log based on configured log level
   *
   * Log Level Hierarchy (from lowest to highest priority):
   * DEBUG < INFO < WARN < ERROR < SUCCESS
   *
   * The configured level acts as a MINIMUM threshold:
   * - If LOG_LEVEL=info: Shows INFO, WARN, ERROR, SUCCESS (hides DEBUG)
   * - If LOG_LEVEL=debug: Shows all levels (DEBUG, INFO, WARN, ERROR, SUCCESS)
   * - If LOG_LEVEL=error: Shows only ERROR and SUCCESS (hides DEBUG, INFO, WARN)
   *
   * @param level - The log level to check
   * @returns true if the level should be logged, false otherwise
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = [
      LogLevel.DEBUG, // index 0 - Most verbose
      LogLevel.INFO, // index 1 - Default level
      LogLevel.WARN, // index 2 - Warnings and above
      LogLevel.ERROR, // index 3 - Errors and above
      LogLevel.SUCCESS, // index 4 - Success messages and above
    ];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Create structured log record with enhanced trace context
   */
  private createLogRecord(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): LogRecord {
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    // Extract trace context with fallbacks
    const traceContext = {
      traceId: spanContext?.traceId || '00000000000000000000000000000000',
      spanId: spanContext?.spanId || '0000000000000000',
      parentSpanId: undefined as string | undefined,
      traceState: spanContext?.traceState?.serialize?.() as string | undefined,
    };

    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.serviceName,
      message,
      metadata,
      trace: traceContext,
    };
  }

  /**
   * Output log to console with enhanced dual output strategy
   * Provides both nx serve visibility and OTEL collector integration
   */
  private logToConsole(record: LogRecord): void {
    if (!this.config.enableConsole) {
      return; // Skip console output if disabled
    }

    const formatted = ConsoleFormatter.format(record);
    const consoleMethod = ConsoleFormatter.getConsoleMethod(record.level);

    // Execute the enhanced dual output method
    consoleMethod(formatted);
  }

  /**
   * Send log to OTEL collector with circuit breaker protection
   * Implements real OTLP HTTP protocol for direct log transmission
   */
  private async logToOTEL(record: LogRecord): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      // Create OTLP log payload according to spec
      const otlpPayload = {
        resourceLogs: [
          {
            resource: {
              attributes: [
                {
                  key: 'service.name',
                  value: { stringValue: record.service },
                },
                {
                  key: 'service.version',
                  value: { stringValue: '1.0.0' },
                },
              ],
            },
            scopeLogs: [
              {
                scope: {
                  name: 'task-manager-logger',
                  version: '1.0.0',
                },
                logRecords: [
                  {
                    timeUnixNano: (
                      Date.parse(record.timestamp) * 1000000
                    ).toString(),
                    severityNumber: this.getSeverityNumber(record.level),
                    severityText: record.level.toUpperCase(),
                    body: { stringValue: record.message },
                    attributes: this.buildOTELAttributes(record.metadata),
                    traceId: record.trace.traceId,
                    spanId: record.trace.spanId,
                  },
                ],
              },
            ],
          },
        ],
      };

      // Send to OTEL collector via HTTP
      return new Promise<void>((resolve, reject) => {
        const url = new URL(`${this.config.otelEndpoint}/v1/logs`);
        const data = JSON.stringify(otlpPayload);

        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
          timeout: 5000,
        };

        const client = url.protocol === 'https:' ? https : http;

        const req = client.request(options, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(); // Success - just resolve with void
          } else {
            reject(
              new Error(
                `OTEL collector HTTP ${res.statusCode}: ${res.statusMessage}`
              )
            );
          }
        });

        req.on('error', (err) => {
          reject(new Error(`OTEL collector connection error: ${err.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('OTEL collector request timeout'));
        });

        req.write(data);
        req.end();
      });
    });
  }

  /**
   * Get OTEL severity number for log level
   */
  private getSeverityNumber(level: LogLevel): number {
    const severityMap = {
      [LogLevel.DEBUG]: 5, // DEBUG
      [LogLevel.INFO]: 9, // INFO
      [LogLevel.WARN]: 13, // WARN
      [LogLevel.ERROR]: 17, // ERROR
      [LogLevel.SUCCESS]: 9, // SUCCESS maps to INFO
    };
    return severityMap[level] || 9;
  }

  /**
   * Build OTEL attributes from metadata
   */
  private buildOTELAttributes(metadata?: Record<string, any>): any[] {
    if (!metadata) return [];

    return Object.entries(metadata).map(([key, value]) => {
      // Handle different value types for OTEL format
      let otelValue;
      if (typeof value === 'string') {
        otelValue = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          otelValue = { intValue: value };
        } else {
          otelValue = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        otelValue = { boolValue: value };
      } else {
        // Serialize complex objects as JSON strings
        otelValue = { stringValue: JSON.stringify(value) };
      }

      return { key, value: otelValue };
    });
  }

  /**
   * Get current circuit breaker state (for monitoring/debugging)
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Shutdown logger and cleanup resources
   * Called during application shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Reset circuit breaker
      this.circuitBreaker.reset();

      // Log shutdown message
      console.log(
        `[level:info,service:${
          this.config.serviceName
        },timestamp:${new Date().toISOString()}]:Logger shutdown completed`
      );
    } catch (error) {
      console.error('Logger shutdown error:', error);
    }
  }

  /**
   * Create a child logger with additional context
   * Useful for request-scoped logging
   */
  child(additionalContext: Record<string, any>): ILogger {
    return new ChildLogger(this, additionalContext);
  }
}

/**
 * Child logger that inherits from parent but adds additional context
 * Used for request-scoped or component-scoped logging
 */
class ChildLogger implements ILogger {
  constructor(
    private parent: OTELLogger,
    private additionalContext: Record<string, any>
  ) {}

  info(message: string, metadata?: Record<string, any>): void {
    this.parent.info(message, { ...this.additionalContext, ...metadata });
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.parent.warn(message, { ...this.additionalContext, ...metadata });
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.parent.error(message, { ...this.additionalContext, ...metadata });
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.parent.debug(message, { ...this.additionalContext, ...metadata });
  }

  success(message: string, metadata?: Record<string, any>): void {
    this.parent.success(message, { ...this.additionalContext, ...metadata });
  }

  child(additionalContext: Record<string, any>): ILogger {
    const combinedContext = { ...this.additionalContext, ...additionalContext };
    return new ChildLogger(this.parent, combinedContext);
  }
}
