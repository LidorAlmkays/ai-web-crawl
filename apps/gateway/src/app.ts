import { KafkaCrawlRequestPublisher } from './infrastructure/messaging/kafka-crawl-request-publisher';
import { SubmitCrawlRequestUseCase } from './core/application/submit-crawl-request.usecase';
import { CrawlController } from './infrastructure/api/rest/controllers/crawl.controller';
import { createRestApi } from './infrastructure/api/rest/index';
import { logger } from './common/utils/logger';
import config from './config/index';

export class Application {
  private expressApp: any;
  private server: any;

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

      // Start HTTP server
      this.server = this.expressApp.listen(
        config.server.port,
        config.server.host,
        () => {
          logger.info('Application started successfully', {
            port: config.server.port,
            host: config.server.host,
            environment: config.server.environment,
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
