import { LoggerConfig } from './interfaces';
import { loggerConfig, validateLoggerConfig } from '../../../config/logger';

/**
 * Create logger configuration from centralized config
 * Uses the centralized configuration from config/logger.ts
 */
export function createLoggerConfig(): LoggerConfig {
  // Validate the centralized configuration
  validateLoggerConfig();

  return {
    serviceName: loggerConfig.serviceName,
    logLevel: loggerConfig.logLevel,
    enableConsole: loggerConfig.enableConsole,
    enableOTEL: loggerConfig.enableOTEL,
    otelEndpoint: loggerConfig.otelEndpoint,
    environment: loggerConfig.environment,
    circuitBreaker: loggerConfig.circuitBreaker,
  };
}

// Note: All validation logic has been moved to config/logger.ts
// This file now only provides a compatibility layer for the existing logger factory
