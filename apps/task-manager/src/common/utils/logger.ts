import { LoggerFactory } from './logging';
import { loggerConfig } from '../../config/logger';

/**
 * Global logger instance for the task-manager application
 *
 * This logger is initialized asynchronously by the application startup.
 * Before initialization, it will fall back to a basic console logger.
 *
 * Usage:
 *   import { logger } from './common/utils/logger';
 *   logger.info('Message', { metadata: 'value' });
 */

// Create a basic fallback logger for use before initialization
class FallbackLogger {
  info(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.log(
      `[level:info,service:task-manager,timestamp:${timestamp}]:${message}`
    );
    if (metadata) console.log(JSON.stringify(metadata, null, 2));
  }

  warn(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(
      `[level:warn,service:task-manager,timestamp:${timestamp}]:${message}`
    );
    if (metadata) console.warn(JSON.stringify(metadata, null, 2));
  }

  error(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.error(
      `[level:error,service:task-manager,timestamp:${timestamp}]:${message}`
    );
    if (metadata) console.error(JSON.stringify(metadata, null, 2));
  }

  debug(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.debug(
      `[level:debug,service:task-manager,timestamp:${timestamp}]:${message}`
    );
    if (metadata) console.debug(JSON.stringify(metadata, null, 2));
  }

  success(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.log(
      `[level:info,service:task-manager,timestamp:${timestamp}]:${message}`
    );
    if (metadata) console.log(JSON.stringify(metadata, null, 2));
  }
}

// Start with fallback logger
let currentLogger: any = new FallbackLogger();

/**
 * Initialize the logger system
 * This should be called during application startup, after OTEL initialization
 */
export async function initializeLogger(): Promise<void> {
  try {
    const factory = LoggerFactory.getInstance();
    const config = {
      serviceName: loggerConfig.serviceName,
      logLevel: loggerConfig.logLevel,
      enableConsole: loggerConfig.enableConsole,
      enableOTEL: loggerConfig.enableOTEL,
      otelEndpoint: loggerConfig.otelEndpoint,
      environment: loggerConfig.environment,
      circuitBreaker: loggerConfig.circuitBreaker,
    };

    await factory.initialize(config);
    currentLogger = factory.getLogger();

    // Log successful initialization with minimal details [[memory:5744101]]
    currentLogger.info('Logger initialized', {
      service: config.serviceName,
      otelEnabled: config.enableOTEL,
    });
  } catch (error) {
    console.error('Failed to initialize logger, using fallback:', error);
    // Keep using fallback logger
  }
}

/**
 * Global logger proxy that delegates to the current logger implementation
 */
export const logger = {
  info: (message: string, metadata?: any) =>
    currentLogger.info(message, metadata),
  warn: (message: string, metadata?: any) =>
    currentLogger.warn(message, metadata),
  error: (message: string, metadata?: any) =>
    currentLogger.error(message, metadata),
  debug: (message: string, metadata?: any) =>
    currentLogger.debug(message, metadata),
  success: (message: string, metadata?: any) =>
    currentLogger.success(message, metadata),
};
