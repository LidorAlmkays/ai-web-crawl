/**
 * Task Manager Service - Application Composition Root
 *
 * This file serves as the composition root for the Task Manager service.
 * It handles dependency injection, wiring up infrastructure, application services,
 * and API adapters. It also manages the application lifecycle (startup/shutdown).
 *
 * No business logic should be contained in this file.
 */

import { appConfig, kafkaConfig, postgresConfig } from './config';
import { KafkaApiManager } from './api/kafka/kafka-api.manager';
import { KafkaFactory } from './common/clients/kafka.factory';
import { PostgresFactory } from './infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlTaskRepositoryAdapter } from './infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';
import { ApplicationFactory } from './application/services/application.factory';
import { logger } from './common/utils/logger';
import { createRestRouter } from './api/rest/rest.router';
import { HealthCheckService } from './common/health/health-check.service';
import express from 'express';
import { createServer, Server } from 'http';

/**
 * Main application class that orchestrates the Task Manager service
 *
 * This class serves as the composition root, handling:
 * - Dependency injection and wiring of all components
 * - Application lifecycle management (startup/shutdown)
 * - Infrastructure initialization (PostgreSQL, Kafka)
 * - Service coordination and health monitoring
 *
 * The class follows the singleton pattern and manages graceful shutdown
 * to ensure proper cleanup of resources.
 */
export class TaskManagerApplication {
  private readonly postgresFactory: PostgresFactory;
  private readonly kafkaFactory: KafkaFactory;
  private kafkaApiManager: KafkaApiManager | null = null;
  private httpServer: Server | null = null;
  private isShuttingDown = false;

  /**
   * Creates a new TaskManagerApplication instance
   *
   * Initializes the PostgreSQL and Kafka factories with their respective configurations.
   * These factories will be used to create database connections and messaging clients.
   */
  constructor() {
    this.postgresFactory = new PostgresFactory(postgresConfig);
    this.kafkaFactory = new KafkaFactory(kafkaConfig);
  }

  /**
   * Starts the Task Manager application
   *
   * This method orchestrates the complete startup sequence:
   * 1. Initializes PostgreSQL and Kafka factories
   * 2. Creates repository adapters and application services
   * 3. Starts Kafka consumers for message processing
   * 4. Sets up health check services
   * 5. Initializes metrics collection
   * 6. Starts the HTTP server for REST API endpoints
   *
   * @throws Error - When any component fails to initialize or start
   * @throws Error - When database or Kafka connections fail
   *
   * @example
   * ```typescript
   * const app = new TaskManagerApplication();
   * await app.start();
   * ```
   */
  public async start(): Promise<void> {
    logger.info('Task Manager starting up...');
    try {
      // Wait for factories to initialize
      await this.postgresFactory.waitForInitialization();
      await this.kafkaFactory.waitForInitialization();

      const webCrawlTaskRepository = new WebCrawlTaskRepositoryAdapter(
        this.postgresFactory.getPool()
      );
      const webCrawlTaskManager = ApplicationFactory.createWebCrawlTaskManager(
        webCrawlTaskRepository
      );

      this.kafkaApiManager = new KafkaApiManager(
        this.kafkaFactory.getClient(),
        { webCrawlTaskManager }
      );
      await this.kafkaApiManager.start();
      logger.info('Kafka consumers started');

      const healthCheckService = new HealthCheckService(
        this.postgresFactory.getPool(),
        this.kafkaFactory.getClient()
      );
      const metricsAdapter =
        this.postgresFactory.createWebCrawlMetricsAdapter();
      const metricsService =
        ApplicationFactory.createWebCrawlMetricsService(metricsAdapter);
      const restRouter = createRestRouter(healthCheckService, metricsService);
      const app = express();
      app.use('/api', restRouter);

      this.httpServer = createServer(app);
      const port = appConfig.app.port;
      this.httpServer.listen(port, () => {
        logger.info(`HTTP server listening on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to start Task Manager application', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }

  /**
   * Stops the Task Manager application gracefully
   *
   * This method performs a graceful shutdown sequence:
   * 1. Prevents multiple shutdown attempts
   * 2. Closes the HTTP server
   * 3. Pauses Kafka consumers
   * 4. Closes Kafka and PostgreSQL connections
   *
   * The method ensures proper cleanup of all resources to prevent
   * memory leaks and connection pool exhaustion.
   *
   * @throws Error - When shutdown operations fail
   *
   * @example
   * ```typescript
   * await app.stop();
   * ```
   */
  public async stop(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;
    logger.info('Task Manager shutting down...');
    try {
      if (this.httpServer) {
        this.httpServer.close();
      }
      if (this.kafkaApiManager) {
        await this.kafkaApiManager.pause();
      }
      await this.kafkaFactory.close();
      await this.postgresFactory.close();
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }
}
