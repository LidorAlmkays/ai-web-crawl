import { IWebCrawlPort } from '../ports/web-crawl.port';

import { IMetricsPort } from '../../infrastructure/ports/metrics.port';
import { WebCrawlService } from './web-crawl-request.service';
import { KafkaWebCrawlTaskPublisher } from '../../infrastructure/messaging/kafka/web-crawl-task.publisher';
import { logger } from '../../common/utils/logger';
import { Producer } from 'kafkajs';

/**
 * Application factory for creating and wiring application services
 * Implements dependency injection for the application layer
 */
export class ApplicationFactory {
  private static instance: ApplicationFactory;
  private webCrawlService: IWebCrawlPort | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ApplicationFactory {
    if (!ApplicationFactory.instance) {
      ApplicationFactory.instance = new ApplicationFactory();
    }
    return ApplicationFactory.instance;
  }

  /**
   * Create the web crawl service with dependencies
   */
  public createWebCrawlService(
    producer: Producer,
    metrics: IMetricsPort
  ): IWebCrawlPort {
    if (!this.webCrawlService) {
      logger.info('Creating WebCrawlService with dependencies');
      const taskPublisher = new KafkaWebCrawlTaskPublisher(producer);
      this.webCrawlService = new WebCrawlService(taskPublisher, metrics);
    }
    return this.webCrawlService;
  }

  /**
   * Get the existing web crawl service
   */
  public getWebCrawlService(): IWebCrawlPort | null {
    return this.webCrawlService;
  }

  /**
   * Reset the factory (useful for testing)
   */
  public reset(): void {
    this.webCrawlService = null;
    logger.info('Application factory reset');
  }
}
