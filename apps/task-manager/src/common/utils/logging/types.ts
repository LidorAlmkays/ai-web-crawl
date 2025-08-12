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
  public readonly type: LoggerErrorType;
  public override readonly cause?: Error;

  constructor(message: string, type: LoggerErrorType, cause?: Error) {
    super(message);
    this.name = 'LoggerError';
    this.type = type;
    this.cause = cause;
  }
}
