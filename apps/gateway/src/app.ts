import { KafkaCrawlRequestPublisher } from './infrastructure/gateway/crawl-request/kafka-crawl-request-publisher';
import { SubmitCrawlRequestUseCase } from './core/application/submit-crawl-request.usecase';
import { CrawlController } from './infrastructure/api/rest/controllers/crawl.controller';
import { createRestApi } from './infrastructure/api/rest/index';
import { WebSocketServerManager } from './infrastructure/api/websocket/websocket-server';
import { WebSocketCrawlHandler } from './infrastructure/api/websocket/websocket-crawl-handler';
import { CrawlResponseConsumer } from './infrastructure/api/kafka/crawl-response-consumer';
import { logger } from './common/utils/logger';
import { kafkaClientService } from './infrastructure/messaging/kafka/kafka-client.service';
import config from './config/index';

export class Application {
  private expressApp: any;
  private server: any;
  private wsManager!: WebSocketServerManager;
  private wsCrawlHandler!: WebSocketCrawlHandler;
  private crawlResponseConsumer!: CrawlResponseConsumer;

  constructor() {
    this.initializeApplication();
  }

  private initializeApplication(): void {
    try {
      logger.info('Initializing application', {
        environment: config.server.environment,
      });

      // Initialize infrastructure components
      const crawlRequestPublisher = new KafkaCrawlRequestPublisher();

      // Initialize WebSocket server
      this.wsManager = new WebSocketServerManager(8081);

      // Initialize WebSocket crawl handler
      this.wsCrawlHandler = new WebSocketCrawlHandler(
        this.wsManager,
        crawlRequestPublisher
      );

      // Initialize Kafka response consumer
      this.crawlResponseConsumer = new CrawlResponseConsumer(this.wsManager);

      // Initialize use cases
      const submitCrawlRequestUseCase = new SubmitCrawlRequestUseCase(
        crawlRequestPublisher
      );

      // Initialize controllers
      const crawlController = new CrawlController();
      crawlController.setSubmitCrawlRequestPort(submitCrawlRequestUseCase);

      // Initialize REST API
      this.expressApp = createRestApi(crawlController);

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getExpressApp(): any {
    return this.expressApp;
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting application', {
        port: config.server.port,
        host: config.server.host,
      });

      // Connect Kafka client before starting server
      await kafkaClientService.connect();
      logger.info('Kafka client connected during app startup');

      // Start Kafka response consumer
      await this.crawlResponseConsumer.start();
      logger.info('Kafka response consumer started');

      // Start HTTP server
      this.server = this.expressApp.listen(
        config.server.port,
        config.server.host,
        () => {
          logger.info('Application started successfully', {
            port: config.server.port,
            host: config.server.host,
            environment: config.server.environment,
            wsPort: 8081,
          });
        }
      );

      // Graceful shutdown handling
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      logger.info('Stopping application');

      if (this.server) {
        this.server.close(() => {
          logger.info('Application stopped successfully');
        });
      }

      // Stop Kafka response consumer
      await this.crawlResponseConsumer.stop();
      logger.info('Kafka response consumer stopped');

      // Close WebSocket server
      this.wsManager.close();
      logger.info('WebSocket server closed');

      // Disconnect Kafka client before stopping server
      await kafkaClientService.disconnect();
      logger.info('Kafka client disconnected during app shutdown');

      // Additional cleanup can be added here
      // e.g., close database connections, stop background jobs, etc.
    } catch (error) {
      logger.error('Error stopping application', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}
