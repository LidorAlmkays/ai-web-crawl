import 'reflect-metadata';
import { logger } from './common/utils/logger';
import { kafkaClientService } from './common/clients/kafka-client';
import { webSocketServerManager } from './common/clients/websocket-server';
import Redis from 'ioredis';
import { redisConfig } from './config/redis';

// --- Ports ---
import { IWebscrapePort } from './application/ports/webscrape.port';
import { IProcessCrawlResponsePort } from './application/ports/process-crawl-response.port';
import { ICrawlRequestPublisherPort } from './infrastructure/ports/crawl-request-publisher.port';
import { IUserNotificationPort } from './infrastructure/ports/user-notification.port';
import { ICrawlRequestRepositoryPort } from './application/ports/crawl-request-repository.port';
import { IConnectionManagerPort } from './application/ports/connection-manager.port';

// --- Services ---
import { WebscrapeService } from './application/services/webscrape.service';
import { ProcessCrawlResponseService } from './application/services/process-crawl-response.service';
import { ConnectionManagerService } from './application/services/connection-manager.service';

// --- Adapters ---
import { KafkaCrawlRequestPublisherAdapter } from './infrastructure/messaging/kafka/crawl-request.publisher.adapter';
import { WebSocketUserNotificationAdapter } from './infrastructure/notification/websocket/user-notification.adapter';
import { CrawlRequestRepositoryAdapter } from './infrastructure/persistence/redis/crawl-request.repository.adapter';

// --- API ---
import { setupWebSocketRoutes } from './api/websocket/websocket.router';
import { AuthHandler } from './api/websocket/handlers/auth.handler';
import { WebscrapeHandler } from './api/websocket/handlers/webscrape.handler';
import {
  initializeKafkaConsumers,
  startAllConsumers,
  stopAllConsumers,
} from './api/kafka/kafka.router';

export class Application {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(redisConfig);
    this.setupDependencies();
    this.setupGracefulShutdown();
  }

  private setupDependencies(): void {
    logger.info('Setting up application dependencies...');

    // --- Infrastructure Adapters ---
    const crawlRequestPublisher: ICrawlRequestPublisherPort =
      new KafkaCrawlRequestPublisherAdapter(kafkaClientService);
    const userNotification: IUserNotificationPort =
      new WebSocketUserNotificationAdapter();
    const crawlRequestRepository: ICrawlRequestRepositoryPort =
      new CrawlRequestRepositoryAdapter(this.redisClient);

    // --- Application Services ---
    const connectionManager: IConnectionManagerPort =
      new ConnectionManagerService();
    const webscrapeService: IWebscrapePort = new WebscrapeService(
      crawlRequestRepository,
      crawlRequestPublisher
    );
    const processCrawlResponseService: IProcessCrawlResponsePort =
      new ProcessCrawlResponseService(
        crawlRequestRepository,
        connectionManager,
        userNotification
      );

    // --- API Handlers ---
    const authHandler = new AuthHandler(
      connectionManager,
      crawlRequestRepository,
      userNotification
    );
    const webscrapeHandler = new WebscrapeHandler(webscrapeService);

    // --- Initialize API Routes and Consumers ---
    setupWebSocketRoutes(
      webSocketServerManager.getWss(),
      connectionManager,
      authHandler,
      webscrapeHandler
    );
    initializeKafkaConsumers(kafkaClientService, processCrawlResponseService);

    logger.info('Dependencies set up successfully.');
  }

  public async start(): Promise<void> {
    await kafkaClientService.connect();
    await startAllConsumers();
    logger.info('Application started successfully.');
  }

  public async stop(): Promise<void> {
    await stopAllConsumers();
    await kafkaClientService.disconnect();
    this.redisClient.disconnect();
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
