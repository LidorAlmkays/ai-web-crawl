import { z } from 'zod';

/**
 * Application Configuration Schema
 *
 * Validates environment variables for application-level configuration
 * with comprehensive options for both development and production environments.
 *
 * This schema defines all application-level configuration parameters
 * with appropriate defaults and validation rules. It uses Zod for
 * runtime validation and type safety.
 *
 * The schema includes configuration for:
 * - Environment settings (NODE_ENV)
 * - Logging configuration (level, format, colorization)
 * - Health check settings (enabled, port, path)
 * - Application metadata (name, version, port)
 * - Performance settings (timeouts, graceful shutdown)
 * - Security settings (CORS configuration)
 * - Monitoring settings (metrics configuration)
 */
const appConfigSchema = z.object({
  // Environment configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Logging configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['simple', 'otel']).default('otel'),
  LOG_COLORIZE: z.coerce.boolean().default(false),

  // Health check configuration
  HEALTH_CHECK_ENABLED: z.coerce.boolean().default(true),
  HEALTH_CHECK_PORT: z.coerce.number().int().positive().default(3001),
  HEALTH_CHECK_PATH: z.string().default('/health'),

  // Application configuration
  APP_NAME: z.string().default('task-manager'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_PORT: z.coerce.number().int().positive().default(3000),

  // Performance configuration
  GRACEFUL_SHUTDOWN_TIMEOUT: z.coerce.number().int().positive().default(30000),
  REQUEST_TIMEOUT: z.coerce.number().int().positive().default(30000),

  // Security configuration
  CORS_ENABLED: z.coerce.boolean().default(true),
  CORS_ORIGIN: z.string().default('*'),

  // Monitoring configuration
  METRICS_ENABLED: z.coerce.boolean().default(false),
  METRICS_PORT: z.coerce.number().int().positive().default(9090),
});

/**
 * Parse and validate environment variables
 *
 * This function parses the current process environment variables
 * against the defined schema, providing runtime validation and
 * default values for missing configuration.
 *
 * @throws Error - When environment variables fail validation
 */
const config = appConfigSchema.parse(process.env);

/**
 * Application Configuration Object
 *
 * Contains all application-level configuration parameters
 * with computed values for easy use throughout the application.
 *
 * This object provides a structured way to access configuration
 * values with computed properties for common use cases like
 * environment checks and nested configuration objects.
 *
 * The configuration is organized into logical groups:
 * - Environment settings and computed flags
 * - Logging configuration
 * - Health check settings
 * - Application metadata
 * - Performance settings
 * - Security configuration
 * - Monitoring settings
 */
export const appConfig = {
  // Environment
  env: config.NODE_ENV,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',

  // Logging
  logging: {
    level: config.LOG_LEVEL,
    format: config.LOG_FORMAT,
    colorize: config.LOG_COLORIZE,
  },

  // Health check
  healthCheck: {
    enabled: config.HEALTH_CHECK_ENABLED,
    port: config.HEALTH_CHECK_PORT,
    path: config.HEALTH_CHECK_PATH,
  },

  // Application
  app: {
    name: config.APP_NAME,
    version: config.APP_VERSION,
    port: config.APP_PORT,
  },

  // Performance
  performance: {
    gracefulShutdownTimeout: config.GRACEFUL_SHUTDOWN_TIMEOUT,
    requestTimeout: config.REQUEST_TIMEOUT,
  },

  // Security
  security: {
    cors: {
      enabled: config.CORS_ENABLED,
      origin: config.CORS_ORIGIN,
    },
  },

  // Monitoring
  monitoring: {
    metrics: {
      enabled: config.METRICS_ENABLED,
      port: config.METRICS_PORT,
    },
  },
};

/**
 * Type definition for application configuration
 *
 * This type provides TypeScript type safety for the application
 * configuration object, enabling autocomplete and compile-time
 * type checking throughout the application.
 *
 * @example
 * ```typescript
 * function configureApp(config: AppConfigType) {
 *   console.log(`Starting ${config.app.name} v${config.app.version}`);
 * }
 * ```
 */
export type AppConfigType = typeof appConfig;
