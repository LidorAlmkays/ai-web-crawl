import { logger } from '../../../common/utils/logger';
import { kafkaTopics, crawlMessageTypes } from '../../../config/kafka';
import { KafkaConsumerBase } from '../../messaging/kafka/kafka-consumer.base';
import { kafkaClientService } from '../../messaging/kafka/kafka-client.service';
import { WebSocketServerManager } from '../websocket/websocket-server';

export class CrawlResponseConsumer extends KafkaConsumerBase {
  private wsManager: WebSocketServerManager;

  constructor(wsManager: WebSocketServerManager) {
    super(
      kafkaClientService,
      kafkaTopics.CRAWL_RESPONSES,
      'gateway-crawl-response-consumer'
    );
    this.wsManager = wsManager;
  }

  public async start(): Promise<void> {
    await this.startConsumer(async (message) => {
      await this.handleCrawlResponse(message);
    });
  }

  public async stop(): Promise<void> {
    await this.stopConsumer();
  }

  private async handleCrawlResponse(message: any): Promise<void> {
    try {
      logger.info('Received crawl response', {
        url: message.url,
        status: message.status,
        timestamp: message.timestamp,
        connectionId: message.headers?.['connection-id'],
      });

      // Extract connection ID from Kafka headers
      const connectionId = message.headers?.['connection-id'];
      const userId = message.headers?.['user-id'];
      const requestId = message.headers?.['request-id'];

      if (!connectionId) {
        logger.warn('Crawl response missing connection ID', { message });
        return;
      }

      // Determine response status
      let status: 'completed' | 'failed' = 'completed';
      let error: string | undefined;

      if (message.error || message.status === 'failed') {
        status = 'failed';
        error = message.error || 'Crawl processing failed';
      }

      // Send status update to WebSocket user
      const statusMessage = {
        type: 'crawl_status' as const,
        requestId: requestId || 'unknown',
        status,
        progress: 100,
        result: status === 'completed' ? message.result : undefined,
        error: status === 'failed' ? error : undefined,
        timestamp: new Date().toISOString(),
      };

      // Send to specific connection if available, otherwise to user
      if (connectionId) {
        this.wsManager.sendMessage(connectionId, statusMessage);
        logger.info('Crawl status sent to specific connection', {
          connectionId,
          requestId,
          status,
        });
      } else if (userId) {
        this.wsManager.sendToUser(userId, statusMessage);
        logger.info('Crawl status sent to user', {
          userId,
          requestId,
          status,
        });
      } else {
        logger.warn('No connection ID or user ID found for crawl response', {
          message,
        });
      }
    } catch (error) {
      logger.error('Error handling crawl response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message,
      });
    }
  }
}
