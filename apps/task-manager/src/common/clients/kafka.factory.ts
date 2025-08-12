import { KafkaClient } from './kafka-client';
import { logger } from '../utils/logger';
import { KafkaConfigType } from '../../config/kafka';

/**
 * Kafka Factory
 *
 * Provides factory functions to create Kafka-specific clients and consumers.
 * Handles Kafka connection initialization and returns properly configured components.
 * Initializes itself in the constructor with the provided configuration.
 *
 * This factory class manages the Kafka client lifecycle and provides
 * a centralized way to create and configure Kafka clients. It follows
 * the Factory pattern and ensures proper resource management.
 *
 * The factory automatically initializes the Kafka client on construction
 * and provides methods for health checking and graceful shutdown.
 */
export class KafkaFactory {
  private kafkaClient: KafkaClient | null = null;
  private readonly config: KafkaConfigType;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Creates a new Kafka factory instance
   *
   * The constructor automatically starts the initialization process
   * and logs the configuration details for debugging purposes.
   *
   * @param config - Kafka configuration object containing connection details
   *
   * @example
   * ```typescript
   * const factory = new KafkaFactory(kafkaConfig);
   * await factory.waitForInitialization();
   * ```
   */
  constructor(config: KafkaConfigType) {
    this.config = config;
    logger.info('Creating Kafka factory with configuration', {
      clientId: config.clientId,
      groupId: config.groupId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl ? 'enabled' : 'disabled',
    });

    // Initialize the factory immediately
    this.initializationPromise = this.initialize();
  }

  /**
   * Initializes the Kafka client with the provided configuration
   *
   * This private method creates and connects the Kafka client
   * with the configured settings. It handles connection errors
   * and provides comprehensive logging.
   *
   * @returns Promise<void> - Resolves when initialization is complete
   * @throws Error - When Kafka client creation or connection fails
   *
   * @example
   * ```typescript
   * // Called automatically in constructor
   * await this.initialize();
   * ```
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Kafka client...', {
        clientId: this.config.clientId,
        brokers: this.config.brokers,
      });

      this.kafkaClient = new KafkaClient();
      await this.kafkaClient.connect();

      this.isInitialized = true;
      logger.info('Kafka client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka client', {
        error: error instanceof Error ? error.message : String(error),
        clientId: this.config.clientId,
        brokers: this.config.brokers,
      });
      throw error;
    }
  }

  /**
   * Gets the Kafka client instance
   *
   * This method returns the initialized Kafka client. It throws an error
   * if the client is not yet initialized to prevent usage of uninitialized resources.
   *
   * @returns KafkaClient - The initialized Kafka client
   * @throws Error - If client is not initialized
   *
   * @example
   * ```typescript
   * const client = factory.getClient();
   * await client.subscribe('my-topic', handler);
   * ```
   */
  public getClient(): KafkaClient {
    if (!this.kafkaClient || !this.isInitialized) {
      throw new Error(
        'Kafka client not initialized. Check initialization logs for errors.'
      );
    }
    return this.kafkaClient;
  }

  /**
   * Gets the Kafka configuration
   *
   * @returns KafkaConfigType - The configuration object used by this factory
   *
   * @example
   * ```typescript
   * const config = factory.getConfig();
   * console.log(`Connected to brokers: ${config.brokers.join(', ')}`);
   * ```
   */
  public getConfig(): KafkaConfigType {
    return this.config;
  }

  /**
   * Closes the Kafka client
   *
   * This method gracefully shuts down the Kafka client, ensuring
   * all connections are properly closed and resources are released.
   *
   * @returns Promise<void> - Resolves when client is closed
   * @throws Error - When client closure fails
   *
   * @example
   * ```typescript
   * await factory.close();
   * // Client is now closed and resources are released
   * ```
   */
  public async close(): Promise<void> {
    if (this.kafkaClient && this.isInitialized) {
      try {
        logger.info('Closing Kafka client...');
        await this.kafkaClient.disconnect();
        this.kafkaClient = null;
        this.isInitialized = false;
        logger.info('Kafka client closed successfully');
      } catch (error) {
        logger.error('Failed to close Kafka client', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }

  /**
   * Checks if the Kafka connection is healthy
   *
   * This method verifies that the Kafka client is initialized and
   * has an active connection to the Kafka brokers.
   *
   * @returns boolean - true if connection is healthy, false otherwise
   *
   * @example
   * ```typescript
   * if (factory.healthCheck()) {
   *   console.log('Kafka connection is healthy');
   * }
   * ```
   */
  public healthCheck(): boolean {
    if (!this.kafkaClient || !this.isInitialized) {
      return false;
    }
    return this.kafkaClient.isConnectedToKafka();
  }

  /**
   * Checks if the factory is initialized and ready for use
   *
   * @returns boolean - true if factory is ready, false otherwise
   *
   * @example
   * ```typescript
   * if (factory.isReady()) {
   *   const client = factory.getClient();
   * }
   * ```
   */
  public isReady(): boolean {
    return this.isInitialized && this.kafkaClient !== null;
  }

  /**
   * Waits for the factory to be initialized
   *
   * This method blocks until the initialization process is complete,
   * ensuring the factory is ready for use before proceeding.
   *
   * @returns Promise<void> - Resolves when initialization is complete
   *
   * @example
   * ```typescript
   * await factory.waitForInitialization();
   * // Factory is now ready to use
   * ```
   */
  public async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }
}
