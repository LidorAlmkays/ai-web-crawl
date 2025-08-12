import { Pool } from 'pg';
import { IWebCrawlTaskRepositoryPort } from '../../ports/web-crawl-task-repository.port';
import { WebCrawlTaskRepositoryAdapter } from './adapters/web-crawl-task.repository.adapter';
import { IWebCrawlMetricsDataPort } from '../../../application/metrics/ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetricsAdapter } from './adapters/WebCrawlMetricsAdapter';
import { logger } from '../../../common/utils/logger';
import { PostgresConfigType } from '../../../config/postgres';

/**
 * PostgreSQL Factory
 *
 * Provides factory functions to create PostgreSQL-specific adapters and repositories.
 * Handles database connection initialization and returns properly configured ports.
 * Initializes itself in the constructor with the provided configuration.
 *
 * This factory class manages the PostgreSQL connection pool and provides
 * factory methods for creating repository adapters. It follows the Factory pattern
 * and ensures proper resource management and connection lifecycle.
 *
 * The factory automatically initializes the connection pool on construction
 * and provides methods for health checking and graceful shutdown.
 */
export class PostgresFactory {
  private pool: Pool | null = null;
  private readonly config: PostgresConfigType;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Creates a new PostgreSQL factory instance
   *
   * The constructor automatically starts the initialization process
   * and logs the configuration details for debugging purposes.
   *
   * @param config - PostgreSQL configuration object containing connection details
   *
   * @example
   * ```typescript
   * const factory = new PostgresFactory(postgresConfig);
   * await factory.waitForInitialization();
   * ```
   */
  constructor(config: PostgresConfigType) {
    this.config = config;

    // Log routine operation (factory creation) at DEBUG level
    logger.debug('Creating PostgreSQL factory with configuration', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl,
      maxConnections: config.maxConnections,
    });

    // Initialize the factory immediately
    this.initializationPromise = this.initialize();
  }

  /**
   * Initializes the PostgreSQL connection pool with the provided configuration
   *
   * This private method creates and configures the PostgreSQL connection pool
   * with appropriate settings for production use, including connection limits,
   * timeouts, and SSL configuration.
   *
   * @returns Promise<void> - Resolves when initialization is complete
   * @throws Error - When connection pool creation fails
   *
   * @example
   * ```typescript
   * // Called automatically in constructor
   * await this.initialize();
   * ```
   */
  private async initialize(): Promise<void> {
    try {
      // Log routine operation (pool initialization) at DEBUG level
      logger.debug('Initializing PostgreSQL connection pool...', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        maxConnections: this.config.maxConnections,
        uri: this.config.uri,
      });

      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.maxConnections,
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      });

      this.isInitialized = true;

      // Log important event (database connection) at INFO level
      logger.info('PostgreSQL connected successfully');
    } catch (error) {
      logger.error('Failed to create PostgreSQL connection pool', {
        error: error instanceof Error ? error.message : String(error),
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
      });
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Gets the PostgreSQL connection pool
   *
   * This method returns the initialized connection pool. It throws an error
   * if the pool is not yet initialized to prevent usage of uninitialized resources.
   *
   * @returns Pool - The PostgreSQL connection pool
   * @throws Error - If pool is not initialized
   *
   * @example
   * ```typescript
   * const pool = factory.getPool();
   * const result = await pool.query('SELECT 1');
   * ```
   */
  public getPool(): Pool {
    if (!this.pool || !this.isInitialized) {
      throw new Error(
        'PostgreSQL pool not initialized. Check initialization logs for errors.'
      );
    }
    return this.pool;
  }

  /**
   * Gets the PostgreSQL connection pool (async version)
   *
   * This method waits for initialization to complete before returning
   * the connection pool, ensuring the pool is ready for use.
   *
   * @returns Promise<Pool> - Promise resolving to the PostgreSQL connection pool
   * @throws Error - If pool initialization fails
   *
   * @example
   * ```typescript
   * const pool = await factory.getPoolAsync();
   * const result = await pool.query('SELECT 1');
   * ```
   */
  public async getPoolAsync(): Promise<Pool> {
    await this.waitForInitialization();
    return this.getPool();
  }

  /**
   * Gets the PostgreSQL configuration
   *
   * @returns PostgresConfigType - The configuration object used by this factory
   *
   * @example
   * ```typescript
   * const config = factory.getConfig();
   * console.log(`Connected to ${config.database} on ${config.host}`);
   * ```
   */
  public getConfig(): PostgresConfigType {
    return this.config;
  }

  /**
   * Creates a web crawl task repository adapter
   *
   * This factory method creates a WebCrawlTaskRepositoryAdapter instance
   * with the configured connection pool and returns it as a port interface.
   *
   * @returns IWebCrawlTaskRepositoryPort - Configured repository adapter
   *
   * @example
   * ```typescript
   * const repository = factory.createWebCrawlTaskRepository();
   * const task = await repository.findWebCrawlTaskById('task-123');
   * ```
   */
  public createWebCrawlTaskRepository(): IWebCrawlTaskRepositoryPort {
    const pool = this.getPool();
    logger.debug('Creating WebCrawlTaskRepositoryAdapter');
    return new WebCrawlTaskRepositoryAdapter(pool);
  }

  /**
   * Creates a web crawl metrics adapter
   *
   * This factory method creates a WebCrawlMetricsAdapter instance
   * with the configured connection pool and returns it as a port interface.
   *
   * @returns IWebCrawlMetricsDataPort - Configured metrics adapter
   *
   * @example
   * ```typescript
   * const metricsAdapter = factory.createWebCrawlMetricsAdapter();
   * const metrics = await metricsAdapter.getWebCrawlMetrics(24);
   * ```
   */
  public createWebCrawlMetricsAdapter(): IWebCrawlMetricsDataPort {
    const pool = this.getPool();
    logger.debug('Creating WebCrawlMetricsAdapter');
    return new WebCrawlMetricsAdapter(pool);
  }

  /**
   * Closes the PostgreSQL connection pool
   *
   * This method gracefully shuts down the connection pool, ensuring
   * all active connections are properly closed and resources are released.
   *
   * @returns Promise<void> - Resolves when pool is closed
   * @throws Error - When pool closure fails
   *
   * @example
   * ```typescript
   * await factory.close();
   * // Pool is now closed and resources are released
   * ```
   */
  public async close(): Promise<void> {
    if (this.pool && this.isInitialized) {
      try {
        await this.pool.end();
        this.pool = null;
        this.isInitialized = false;
        logger.info('PostgreSQL disconnected');
      } catch (error) {
        logger.error('Failed to close PostgreSQL connection pool', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }

  /**
   * Checks if the PostgreSQL connection is healthy
   *
   * This method performs a simple health check by executing a test query
   * to verify the database connection is working properly.
   *
   * @returns Promise<boolean> - true if connection is healthy, false otherwise
   *
   * @example
   * ```typescript
   * const isHealthy = await factory.healthCheck();
   * if (!isHealthy) {
   *   console.log('Database connection is unhealthy');
   * }
   * ```
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.pool || !this.isInitialized) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('PostgreSQL health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Checks if the factory is initialized and ready for use
   *
   * @returns boolean - true if factory is ready, false otherwise
   *
   * @example
   * ```typescript
   * if (factory.isReady()) {
   *   const repository = factory.createWebCrawlTaskRepository();
   * }
   * ```
   */
  public isReady(): boolean {
    return this.isInitialized && this.pool !== null;
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
