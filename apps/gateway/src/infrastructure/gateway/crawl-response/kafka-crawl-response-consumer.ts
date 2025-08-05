import { logger } from '../../../common/utils/logger';
import { kafkaTopics, crawlMessageTypes } from '../../../config/kafka';
import { KafkaConsumerBase } from '../../messaging/kafka/kafka-consumer.base';
import { kafkaClientService } from '../../messaging/kafka/kafka-client.service';

export class KafkaCrawlResponseConsumer extends KafkaConsumerBase {
  constructor() {
    super(
      kafkaClientService,
      kafkaTopics.CRAWL_RESPONSES,
      'gateway-crawl-response-consumer'
    );
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
      });

      // Process the crawl response
      // Add your business logic here
    } catch (error) {
      logger.error('Error handling crawl response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message,
      });
    }
  }
}
