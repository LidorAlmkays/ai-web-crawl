import express from 'express';
import { configuration } from './config';
import { initializeOpenTelemetry } from './common/utils/otel-init';
import { logger } from './common/utils/logger';
import { ApplicationFactory } from './application/services/application.factory';
import { KafkaFactory } from './common/clients/kafka.factory';

import { LocalMetricsAdapter } from './infrastructure/metrics/local-metrics.adapter';
import { WebCrawlHandler } from './api/rest/handlers/web-crawl.handler';
import { RestRouter } from './api/rest/rest.router';
import { 
  corsMiddleware, 
  traceContextMiddleware, 
  requestLoggerMiddleware, 
  performanceMonitorMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware 
} from './common/middleware';

/**
 * Main application class for the gateway service
 * Orchestrates all components and manages the application lifecycle
 */
export class Application {
  private app: express.Application;
  private server: any;
  private kafkaFactory: KafkaFactory;
  private metrics: LocalMetricsAdapter;
  private webCrawlHandler!: WebCrawlHandler;
  private restRouter!: RestRouter;

  constructor() {
    this.app = express();
    this.kafkaFactory = KafkaFactory.getInstance();
    this.metrics = new LocalMetricsAdapter();
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    await this.setupApplication();
  }

  /**
   * Setup the application with all middleware and routes
   */
  private async setupApplication(): Promise<void> {
    // Initialize OpenTelemetry
    initializeOpenTelemetry();

    // Setup middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Setup CORS middleware
    this.app.use(corsMiddleware);
    
    // Setup trace context middleware
    this.app.use(traceContextMiddleware);
    
    // Setup request logging middleware
    this.app.use(requestLoggerMiddleware);
    
    // Setup performance monitoring middleware
    this.app.use(performanceMonitorMiddleware(1000)); // 1 second threshold

    // Setup application services
    await this.setupServices();

    // Setup routes
    this.setupRoutes();

    // Setup error handling middleware (must be last)
    this.app.use(notFoundMiddleware);
    this.app.use(errorHandlerMiddleware);

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Setup application services with dependency injection
   */
  private async setupServices(): Promise<void> {
    const appFactory = ApplicationFactory.getInstance();

    // Get Kafka producer from factory
    const producer = await this.kafkaFactory.getProducer();

    // Create web crawl service (application service)
    const webCrawlService = appFactory.createWebCrawlService(producer, this.metrics);

    // Create web crawl handler
    this.webCrawlHandler = new WebCrawlHandler(webCrawlService, this.metrics);

    // Create REST router
    this.restRouter = new RestRouter(this.webCrawlHandler, this.metrics);

    logger.info('Application services setup completed');
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Mount REST API routes
    this.app.use('/', this.restRouter.getRouter());

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(this.metrics.getMetricsData());
    });

    logger.info('Application routes setup completed');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        await this.stop();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      this.stop().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      this.stop().then(() => process.exit(1));
    });
  }

  /**
   * Start the application
   */
  public async start(): Promise<void> {
    try {
      const config = configuration.getConfig();

      // Start HTTP server
      this.server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info('Gateway service started successfully', {
          port: config.server.port,
          host: config.server.host,
          environment: config.environment,
        });
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        logger.error('Server error', { error });
        throw error;
      });

    } catch (error) {
      logger.error('Failed to start gateway service', { error });
      throw error;
    }
  }

  /**
   * Stop the application gracefully
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping gateway service...');

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Disconnect Kafka
      await this.kafkaFactory.disconnect();

      logger.info('Gateway service stopped successfully');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Get the Express application instance (for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }
}
