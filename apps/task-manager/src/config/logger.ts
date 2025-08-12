import { z } from 'zod';

/**
 * Logger Configuration Schema
 *
 * Validates environment variables for logger configuration
 * with comprehensive options for OTEL integration and circuit breaker settings.
 */
const loggerConfigSchema = z.object({
  // Service identification
  SERVICE_NAME: z.string().default('task-manager'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  NODE_ENV: z.string().default('development'),

  // Console logging
  LOG_ENABLE_CONSOLE: z.coerce.boolean().default(true),

  // OTEL configuration
  LOG_ENABLE_OTEL: z.coerce.boolean().default(true),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),

  // Circuit breaker configuration for OTEL resilience
  LOG_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().default(5),
  LOG_CIRCUIT_BREAKER_RESET_TIMEOUT: z.coerce.number().default(60000),
  LOG_CIRCUIT_BREAKER_SUCCESS_THRESHOLD: z.coerce.number().default(3),
});

/**
 * Parse and validate environment variables
 */
const config = loggerConfigSchema.parse(process.env);

/**
 * Logger Configuration Object
 *
 * Contains all logger-specific configuration parameters
 * with computed values for easy use throughout the application.
 */
export const loggerConfig = {
  // Service identification
  serviceName: config.SERVICE_NAME,
  logLevel: config.LOG_LEVEL,
  environment: config.NODE_ENV as 'development' | 'production' | 'test',

  // Console output configuration
  enableConsole: config.LOG_ENABLE_CONSOLE,

  // OTEL integration configuration
  enableOTEL: config.LOG_ENABLE_OTEL && config.NODE_ENV !== 'test', // Disable OTEL in test environment
  otelEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,

  // Circuit breaker configuration for OTEL resilience
  circuitBreaker: {
    failureThreshold: config.LOG_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    resetTimeout: config.LOG_CIRCUIT_BREAKER_RESET_TIMEOUT,
    successThreshold: config.LOG_CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
  },
};

/**
 * Type definition for logger configuration
 */
export type LoggerConfigType = typeof loggerConfig;

/**
 * Validation function for logger configuration
 * Throws errors for invalid configuration that would prevent logger operation
 */
export function validateLoggerConfig(): boolean {
  if (!loggerConfig.serviceName || loggerConfig.serviceName.trim() === '') {
    throw new Error('Service name cannot be empty');
  }

  if (
    loggerConfig.enableOTEL &&
    (!loggerConfig.otelEndpoint || loggerConfig.otelEndpoint.trim() === '')
  ) {
    throw new Error('OTEL endpoint cannot be empty when OTEL is enabled');
  }

  if (loggerConfig.circuitBreaker.failureThreshold < 1) {
    throw new Error('Circuit breaker failure threshold must be at least 1');
  }

  if (loggerConfig.circuitBreaker.resetTimeout < 1000) {
    throw new Error('Circuit breaker reset timeout must be at least 1000ms');
  }

  if (loggerConfig.circuitBreaker.successThreshold < 1) {
    throw new Error('Circuit breaker success threshold must be at least 1');
  }

  return true;
}
