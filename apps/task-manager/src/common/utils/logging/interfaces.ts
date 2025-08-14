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

  /**
   * Log success level message (maps to info level for compatibility)
   * @param message - The log message
   * @param metadata - Optional metadata object for structured logging
   */
  success(message: string, metadata?: Record<string, any>): void;

  /**
   * Create a child logger with additional context
   * @param additionalContext - Additional context to add to all log messages
   * @returns A new logger instance with the additional context
   */
  child(additionalContext: Record<string, any>): ILogger;
}

/**
 * Circuit breaker configuration interface
 * Used to configure circuit breaker for OTEL operations
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close circuit */
  resetTimeout: number;
  /** Number of successful calls needed to close circuit from half-open */
  successThreshold: number;
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

  /** Circuit breaker configuration for OTEL resilience */
  circuitBreaker?: CircuitBreakerConfig;
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
