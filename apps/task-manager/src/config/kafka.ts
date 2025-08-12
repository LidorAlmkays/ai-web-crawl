import { z } from 'zod';

/**
 * Kafka Configuration Schema
 *
 * Validates environment variables for Kafka connection with comprehensive
 * configuration options for both development and production environments.
 *
 * This schema defines all Kafka connection parameters with appropriate
 * defaults and validation rules. It supports both basic and advanced
 * Kafka configurations including SSL, SASL authentication, and custom
 * timeouts.
 *
 * The schema includes configuration for:
 * - Connection parameters (brokers, client ID, group ID)
 * - Topic configuration (task status topic)
 * - Security settings (SSL, SASL authentication)
 * - Connection timeouts and intervals
 * - Retry configuration
 */
const kafkaConfigSchema = z.object({
  // Required environment variables with docker-compose defaults
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('task-manager'),
  KAFKA_GROUP_ID: z.string().default('task-manager-group'),
  // Topic environment variables (env-driven topics dictionary)
  TASK_STATUS_TOPIC: z.string().default('task-status'),

  // Optional environment variables with defaults
  KAFKA_SSL_ENABLED: z.coerce.boolean().default(false),
  KAFKA_SASL_ENABLED: z.coerce.boolean().default(false),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  KAFKA_SASL_MECHANISM: z
    .enum(['plain', 'scram-sha-256', 'scram-sha-512'])
    .default('plain'),
  KAFKA_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(3000),
  KAFKA_REQUEST_TIMEOUT: z.coerce.number().int().positive().default(30000),
  KAFKA_SESSION_TIMEOUT: z.coerce.number().int().positive().default(30000),
  KAFKA_HEARTBEAT_INTERVAL: z.coerce.number().int().positive().default(3000),
  KAFKA_RETRY_BACKOFF: z.coerce.number().int().positive().default(100),
  KAFKA_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
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
const config = kafkaConfigSchema.parse(process.env);

/**
 * Kafka Configuration Object
 *
 * Contains all Kafka connection parameters with parsed broker list
 * and comprehensive client configuration options.
 *
 * This object provides a structured way to access Kafka configuration
 * values with pre-configured objects for kafkajs client and consumer
 * configurations. It includes computed values like parsed broker lists
 * and conditional SASL configuration.
 *
 * The configuration is organized into logical groups:
 * - Connection parameters (brokers, client ID, group ID)
 * - Topic configuration
 * - Security settings (SSL, SASL)
 * - Connection timeouts and intervals
 * - Retry configuration
 * - Pre-configured client and consumer objects
 */
export const kafkaConfig = {
  // Connection parameters
  brokers: config.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
  clientId: config.KAFKA_CLIENT_ID,
  groupId: config.KAFKA_GROUP_ID,

  // Topic configuration - single topic for all messages
  topics: {
    taskStatus: config.TASK_STATUS_TOPIC,
  },

  // SSL configuration
  ssl: config.KAFKA_SSL_ENABLED,

  // SASL configuration
  sasl: config.KAFKA_SASL_ENABLED
    ? {
        mechanism: config.KAFKA_SASL_MECHANISM,
        username: config.KAFKA_SASL_USERNAME,
        password: config.KAFKA_SASL_PASSWORD,
      }
    : false,

  // Connection timeouts
  connectionTimeout: config.KAFKA_CONNECTION_TIMEOUT,
  requestTimeout: config.KAFKA_REQUEST_TIMEOUT,
  sessionTimeout: config.KAFKA_SESSION_TIMEOUT,
  heartbeatInterval: config.KAFKA_HEARTBEAT_INTERVAL,

  // Retry configuration
  retryBackoff: config.KAFKA_RETRY_BACKOFF,
  maxRetryAttempts: config.KAFKA_MAX_RETRY_ATTEMPTS,

  // Client configuration object for kafkajs
  clientConfig: {
    clientId: config.KAFKA_CLIENT_ID,
    brokers: config.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
    ssl: config.KAFKA_SSL_ENABLED,
    sasl: config.KAFKA_SASL_ENABLED
      ? {
          mechanism: config.KAFKA_SASL_MECHANISM,
          username: config.KAFKA_SASL_USERNAME,
          password: config.KAFKA_SASL_PASSWORD,
        }
      : undefined,
    connectionTimeout: config.KAFKA_CONNECTION_TIMEOUT,
    requestTimeout: config.KAFKA_REQUEST_TIMEOUT,
    retry: {
      initialRetryTime: config.KAFKA_RETRY_BACKOFF,
      retries: config.KAFKA_MAX_RETRY_ATTEMPTS,
    },
  },

  // Consumer configuration object for kafkajs
  consumerConfig: {
    groupId: config.KAFKA_GROUP_ID,
    sessionTimeout: config.KAFKA_SESSION_TIMEOUT,
    heartbeatInterval: config.KAFKA_HEARTBEAT_INTERVAL,
    retry: {
      initialRetryTime: config.KAFKA_RETRY_BACKOFF,
      retries: config.KAFKA_MAX_RETRY_ATTEMPTS,
    },
  },
};

/**
 * Type definition for Kafka configuration
 *
 * This type provides TypeScript type safety for the Kafka
 * configuration object, enabling autocomplete and compile-time
 * type checking throughout the application.
 *
 * @example
 * ```typescript
 * function configureKafka(config: KafkaConfigType) {
 *   console.log(`Connecting to brokers: ${config.brokers.join(', ')}`);
 * }
 * ```
 */
export type KafkaConfigType = typeof kafkaConfig;
