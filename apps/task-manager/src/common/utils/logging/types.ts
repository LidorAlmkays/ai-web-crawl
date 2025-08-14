/**
 * Log level enum for type-safe logging
 * Provides centralized control over log levels and their string representations
 *
 * Log Level Hierarchy (from lowest to highest priority):
 * DEBUG < INFO < WARN < ERROR < SUCCESS
 *
 * When LOG_LEVEL is configured, it acts as a MINIMUM threshold:
 * - DEBUG: Most verbose (shows all levels)
 * - INFO: Default level (hides DEBUG, shows INFO and above)
 * - WARN: Shows warnings and errors only
 * - ERROR: Shows errors and success messages only
 * - SUCCESS: Shows only success messages
 */
export enum LogLevel {
  DEBUG = 'debug', // Most verbose - shows all logs
  INFO = 'info', // Default level - hides debug logs
  WARN = 'warn', // Warnings and above only
  ERROR = 'error', // Errors and above only
  SUCCESS = 'success', // Success messages and above only
}

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
  public readonly type: LoggerErrorType;
  public override readonly cause?: Error;

  constructor(message: string, type: LoggerErrorType, cause?: Error) {
    super(message);
    this.name = 'LoggerError';
    this.type = type;
    this.cause = cause;
  }
}
