/**
 * Logger level enumeration
 *
 * Defines the available logging levels for the application.
 * This replaces the string union type for better type safety and maintainability.
 */
export enum LoggerLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
  SUCCESS = 'success',
}

/**
 * Type alias for backward compatibility
 */
export type LoggerLevelType = LoggerLevel;
