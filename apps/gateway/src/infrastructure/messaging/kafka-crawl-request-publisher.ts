import { CrawlRequest } from '../../core/domain/crawl-request.entity';
import { ICrawlRequestPublisherPort } from '../../core/ports/gateway/crawl-request.publisher.port';
import { logger } from '../../common/utils/logger';
import { Kafka } from 'kafkajs';
import config from '../../config/index';

export class KafkaCrawlRequestPublisher implements ICrawlRequestPublisherPort {
  private kafka: Kafka;
  private producer: any;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });
    this.producer = this.kafka.producer();
  }

  public async publishCrawlRequest(crawlRequest: CrawlRequest): Promise<void> {
    try {
      await this.producer.connect();

      const message = {
        url: crawlRequest.getUrl(),
        query: crawlRequest.getQuery(),
        hash: crawlRequest.getHash(),
      };

      await this.producer.send({
        topic: config.kafka.topic,
        messages: [
          {
            key: crawlRequest.getHash(),
            value: JSON.stringify(message),
          },
        ],
      });

      logger.info('Crawl request published to Kafka', {
        topic: config.kafka.topic,
        hash: crawlRequest.getHash(),
        url: crawlRequest.getUrl(),
      });

      await this.producer.disconnect();
    } catch (error) {
      logger.error('Error publishing crawl request to Kafka', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hash: crawlRequest.getHash(),
      });
      throw error;
    }
  }
}
