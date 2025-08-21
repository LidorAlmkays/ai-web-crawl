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
 * - Application metadata (name, version, port)
 * - Performance settings (timeouts, graceful shutdown)
 */
const appConfigSchema = z.object({
  // Environment configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Application configuration
  APP_NAME: z.string().default('task-manager'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_PORT: z.coerce.number().int().positive().default(3000),

  // Performance configuration
  GRACEFUL_SHUTDOWN_TIMEOUT: z.coerce.number().int().positive().default(30000),
  REQUEST_TIMEOUT: z.coerce.number().int().positive().default(30000),
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
 * - Application metadata
 * - Performance settings
 */
export const appConfig = {
  // Environment
  env: config.NODE_ENV,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',

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
