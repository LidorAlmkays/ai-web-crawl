import { ICrawlRequestPublisherPort } from '../../ports/crawl-request-publisher.port';
import { KafkaClientService } from '../../../common/clients/kafka-client';
import { logger } from '../../../common/utils/logger';
import config from '../../../config';
import { CrawlRequest } from '../../../domain/entities/crawl-request.entity';

export class KafkaCrawlRequestPublisherAdapter
  implements ICrawlRequestPublisherPort
{
  private readonly topic: string = config.kafka.topics.crawlRequestTopic;

  constructor(private readonly kafkaClient: KafkaClientService) {}

  async publish(data: ReturnType<CrawlRequest['toJSON']>): Promise<void> {
    try {
      const producer = this.kafkaClient.getProducer();

      const messageValue = {
        url: data.url,
      };

      const messageHeaders = {
        id: data.id,
        email: data.email,
        createdAt: data.createdAt,
      };

      await producer.send({
        topic: this.topic,
        messages: [
          {
            key: data.id,
            value: JSON.stringify(messageValue),
            headers: messageHeaders,
          },
        ],
      });
      logger.info('Successfully published crawl request to Kafka', {
        topic: this.topic,
        id: data.id,
      });
    } catch (error) {
      logger.error('Failed to publish crawl request to Kafka', {
        topic: this.topic,
        id: data.id,
        error: error instanceof Error ? error.message : 'Unknown Kafka error',
      });
      throw error;
    }
  }
}
