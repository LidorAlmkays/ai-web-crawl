import { z } from 'zod';

/**
 * PostgreSQL Configuration Schema
 *
 * Validates environment variables for PostgreSQL connection with comprehensive
 * configuration options for both development and production environments.
 *
 * This schema defines all PostgreSQL connection parameters with appropriate
 * defaults and validation rules. It supports both basic and advanced
 * PostgreSQL configurations including SSL, connection pooling, and custom
 * timeouts.
 *
 * The schema includes configuration for:
 * - Connection parameters (host, port, user, password, database)
 * - SSL configuration
 * - Connection pooling settings
 * - Timeout configurations
 */
const postgresConfigSchema = z.object({
  // Required environment variables with docker-compose defaults
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('password'),
  POSTGRES_DB: z.string().default('tasks_manager'),

  // Optional environment variables with defaults
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_SSL: z.coerce.boolean().default(false),
  POSTGRES_MAX_CONNECTIONS: z.coerce.number().int().positive().default(10),
  POSTGRES_IDLE_TIMEOUT: z.coerce.number().int().positive().default(30000),
  POSTGRES_CONNECTION_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .default(10000),
  POSTGRES_QUERY_TIMEOUT: z.coerce.number().int().positive().default(30000),
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
const config = postgresConfigSchema.parse(process.env);

/**
 * PostgreSQL Configuration Object
 *
 * Contains all PostgreSQL connection parameters with computed values
 * for easy connection string generation and pool configuration.
 *
 * This object provides a structured way to access PostgreSQL configuration
 * values with pre-configured objects for different database clients.
 * It includes computed values like connection URIs and pre-configured
 * connection and pool options.
 *
 * The configuration is organized into logical groups:
 * - Connection parameters (host, port, user, password, database)
 * - SSL configuration
 * - Pool configuration (max connections, timeouts)
 * - Computed connection URI
 * - Pre-configured connection and pool options
 */
export const postgresConfig = {
  // Connection parameters
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
  host: config.POSTGRES_HOST,
  port: config.POSTGRES_PORT,

  // SSL configuration
  ssl: config.POSTGRES_SSL,

  // Pool configuration
  maxConnections: config.POSTGRES_MAX_CONNECTIONS,
  idleTimeout: config.POSTGRES_IDLE_TIMEOUT,
  connectionTimeout: config.POSTGRES_CONNECTION_TIMEOUT,
  queryTimeout: config.POSTGRES_QUERY_TIMEOUT,

  // Computed connection URI
  uri: `postgres://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`,

  // Connection options for slonik
  connectionOptions: {
    host: config.POSTGRES_HOST,
    port: config.POSTGRES_PORT,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    database: config.POSTGRES_DB,
    ssl: config.POSTGRES_SSL ? { rejectUnauthorized: false } : false,
  },

  // Pool options for slonik
  poolOptions: {
    maximumPoolSize: config.POSTGRES_MAX_CONNECTIONS,
    idleTimeout: config.POSTGRES_IDLE_TIMEOUT,
    connectionTimeout: config.POSTGRES_CONNECTION_TIMEOUT,
    queryTimeout: config.POSTGRES_QUERY_TIMEOUT,
  },
};

/**
 * Type definition for PostgreSQL configuration
 *
 * This type provides TypeScript type safety for the PostgreSQL
 * configuration object, enabling autocomplete and compile-time
 * type checking throughout the application.
 *
 * @example
 * ```typescript
 * function configurePostgres(config: PostgresConfigType) {
 *   console.log(`Connecting to ${config.database} on ${config.host}:${config.port}`);
 * }
 * ```
 */
export type PostgresConfigType = typeof postgresConfig;
