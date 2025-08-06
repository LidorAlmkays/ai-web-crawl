import { logger } from './common/utils/logger';
import { kafkaClientService } from './common/clients/kafka-client';
import { webSocketServerManager } from './common/clients/websocket-server';

// --- Ports ---
import { IWebscrapePort } from './application/ports/webscrape.port';
import { IHashPort } from './application/ports/hash.port';
import { IProcessCrawlResponsePort } from './application/ports/process-crawl-response.port';
import { ICrawlRequestPublisherPort } from './infrastructure/ports/crawl-request-publisher.port';
import { IUserNotificationPort } from './infrastructure/ports/user-notification.port';
import { ICrawlStateRepositoryPort } from './infrastructure/ports/crawl-state-repository.port';

// --- Services ---
import { WebscrapeService } from './application/services/webscrape.service';
import { Sha256HashService } from './application/services/sha256-hash.service';
import { ProcessCrawlResponseService } from './application/services/process-crawl-response.service';

// --- Adapters ---
import { KafkaCrawlRequestPublisherAdapter } from './infrastructure/messaging/kafka/crawl-request.publisher.adapter';
import { RedisCrawlStateRepositoryAdapter } from './infrastructure/persistence/redis/crawl-state.repository.adapter';
import { WebSocketUserNotificationAdapter } from './infrastructure/notification/websocket/user-notification.adapter';

// --- API ---
import { setupWebSocketRoutes } from './api/websocket/routes';
import {
  initializeKafkaConsumers,
  startAllConsumers,
  stopAllConsumers,
} from './api/kafka/kafka.router';

export class Application {
  private crawlStateRepository!: ICrawlStateRepositoryPort;

  constructor() {
    this.setupDependencies();
    this.setupGracefulShutdown();
  }

  private setupDependencies(): void {
    logger.info('Setting up application dependencies...');

    // --- Infrastructure Adapters ---
    const crawlRequestPublisher: ICrawlRequestPublisherPort =
      new KafkaCrawlRequestPublisherAdapter(kafkaClientService);
    this.crawlStateRepository = new RedisCrawlStateRepositoryAdapter();
    const userNotification: IUserNotificationPort =
      new WebSocketUserNotificationAdapter(webSocketServerManager);

    // --- Application Services ---
    const hashService: IHashPort = new Sha256HashService();
    const webscrapeService: IWebscrapePort = new WebscrapeService(
      hashService,
      this.crawlStateRepository,
      crawlRequestPublisher
    );
    const processCrawlResponseService: IProcessCrawlResponsePort =
      new ProcessCrawlResponseService(
        this.crawlStateRepository,
        userNotification
      );

    // --- Initialize API Routes and Consumers ---
    setupWebSocketRoutes(webscrapeService);
    initializeKafkaConsumers(kafkaClientService, processCrawlResponseService);

    logger.info('Dependencies set up successfully.');
  }

  public async start(): Promise<void> {
    await kafkaClientService.connect();

    if (
      'connect' in this.crawlStateRepository &&
      typeof this.crawlStateRepository.connect === 'function'
    ) {
      await this.crawlStateRepository.connect();
    }

    await startAllConsumers();
    logger.info('Application started successfully.');
  }

  public async stop(): Promise<void> {
    await stopAllConsumers();

    if (
      'disconnect' in this.crawlStateRepository &&
      typeof this.crawlStateRepository.disconnect === 'function'
    ) {
      await this.crawlStateRepository.disconnect();
    }

    await kafkaClientService.disconnect();
    webSocketServerManager.close();
    logger.info('Application stopped successfully.');
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully.`);
        await this.stop();
        process.exit(0);
      });
    });
  }
}
