import { EventEmitter } from 'events';
import { logger } from '../../../common/utils/logger';
import { WebSocketServerManager } from './websocket-server';
import { KafkaCrawlRequestPublisher } from '../../gateway/crawl-request/kafka-crawl-request-publisher';
import { CrawlRequest } from '../../../core/domain/crawl-request.entity';

export interface WebSocketCrawlRequest {
  connectionId: string;
  userId: string;
  url: string;
  query: string;
}

export class WebSocketCrawlHandler extends EventEmitter {
  private wsManager: WebSocketServerManager;
  private crawlPublisher: KafkaCrawlRequestPublisher;

  constructor(
    wsManager: WebSocketServerManager,
    crawlPublisher: KafkaCrawlRequestPublisher
  ) {
    super();
    this.wsManager = wsManager;
    this.crawlPublisher = crawlPublisher;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for crawl requests from WebSocket
    this.wsManager.on(
      'crawl_request',
      async (request: WebSocketCrawlRequest) => {
        await this.handleCrawlRequest(request);
      }
    );
  }

  private async handleCrawlRequest(
    request: WebSocketCrawlRequest
  ): Promise<void> {
    try {
      logger.info('Processing WebSocket crawl request', {
        connectionId: request.connectionId,
        userId: request.userId,
        url: request.url,
        query: request.query,
      });

      // Create crawl request entity
      const crawlRequest = new CrawlRequest(
        request.url,
        request.query,
        request.userId
      );

      // Send initial status to user
      this.wsManager.sendMessage(request.connectionId, {
        type: 'crawl_status',
        requestId: crawlRequest.getHash(),
        status: 'pending',
        progress: 0,
        timestamp: new Date().toISOString(),
      });

      // Publish to Kafka with connection ID for tracking
      await this.crawlPublisher.publishCrawlRequestWithConnection(
        crawlRequest,
        request.connectionId
      );

      // Send processing status
      this.wsManager.sendMessage(request.connectionId, {
        type: 'crawl_status',
        requestId: crawlRequest.getHash(),
        status: 'processing',
        progress: 25,
        timestamp: new Date().toISOString(),
      });

      logger.info('Crawl request published to Kafka', {
        connectionId: request.connectionId,
        userId: request.userId,
        requestId: crawlRequest.getHash(),
        url: request.url,
      });
    } catch (error) {
      logger.error('Failed to process WebSocket crawl request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: request.connectionId,
        userId: request.userId,
        url: request.url,
      });

      // Send error status to user
      this.wsManager.sendMessage(request.connectionId, {
        type: 'crawl_status',
        requestId: 'unknown',
        status: 'failed',
        error: 'Failed to submit crawl request',
        timestamp: new Date().toISOString(),
      });
    }
  }

  public getWebSocketManager(): WebSocketServerManager {
    return this.wsManager;
  }
}
