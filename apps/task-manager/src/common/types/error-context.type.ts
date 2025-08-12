/**
 * Error Context Types
 *
 * Defines the structure for error context information used by the stacked error handler.
 * Provides detailed error information with full context chain for better debugging.
 */

/**
 * Error Level in the Stack
 */
export type ErrorLevel =
  | 'ROOT'
  | 'HANDLER'
  | 'VALIDATION'
  | 'BUSINESS_LOGIC'
  | 'DATABASE'
  | 'EXTERNAL_SERVICE';

/**
 * Error Context Information
 */
export interface ErrorContext {
  level: ErrorLevel;
  component: string;
  operation: string;
  message: string;
  data?: any;
  expectedValue?: any;
  actualValue?: any;
  action?: string;
  timestamp: string;
}

/**
 * Stacked Error Information
 */
export interface StackedErrorInfo {
  taskId?: string;
  correlationId: string;
  errorChain: ErrorContext[];
  rootCause: string;
  actionableGuidance: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

/**
 * Validation Error Details
 */
export interface ValidationErrorDetails {
  field: string;
  value: any;
  expectedValue?: any;
  constraints?: string[];
  message: string;
  action: string;
}

/**
 * Error Category for Classification
 */
export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'KAFKA_ERROR'
  | 'BUSINESS_LOGIC_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error Response for API/Handler Responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: ErrorCategory;
    taskId?: string;
    correlationId: string;
    timestamp: string;
    details?: ValidationErrorDetails[];
    action?: string;
  };
}

/**
 * Log Level Configuration
 */
export interface LogLevelConfig {
  development: 'debug' | 'info' | 'warn' | 'error';
  production: 'info' | 'warn' | 'error';
  test: 'error';
}

/**
 * Important Events for Production Logging
 */
export type ImportantEvent =
  | 'SERVICE_STARTUP'
  | 'SERVICE_SHUTDOWN'
  | 'DATABASE_CONNECTION'
  | 'KAFKA_CONNECTION'
  | 'KAFKA_TOPIC_SUBSCRIPTION'
  | 'MESSAGE_PROCESSING'
  | 'ERROR_EVENT'
  | 'HEALTH_CHECK';

/**
 * Routine Operations for Debug Logging
 */
export type RoutineOperation =
  | 'FACTORY_INITIALIZATION'
  | 'CLIENT_CREATION'
  | 'SERVICE_INITIALIZATION'
  | 'INTERNAL_METHOD_CALL'
  | 'VALIDATION_STEP'
  | 'CONFIGURATION_LOAD'
  | 'UTILITY_FUNCTION_CALL';
