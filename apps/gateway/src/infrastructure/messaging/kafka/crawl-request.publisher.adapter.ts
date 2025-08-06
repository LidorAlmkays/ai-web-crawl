import { ICrawlRequestPublisherPort } from '../../ports/crawl-request-publisher.port';
import { KafkaClientService } from '../../../common/clients/kafka-client';
import { logger } from '../../../common/utils/logger';
import config from '../../../config';

export class KafkaCrawlRequestPublisherAdapter
  implements ICrawlRequestPublisherPort
{
  private readonly topic: string = config.kafka.topics.crawlRequestTopic;

  constructor(private readonly kafkaClient: KafkaClientService) {}

  async publish(data: {
    hash: string;
    query: string;
    url: string;
  }): Promise<void> {
    try {
      const producer = this.kafkaClient.getProducer();

      const message = {
        url: data.url,
        query: data.query,
      };

      await producer.send({
        topic: this.topic,
        messages: [
          {
            key: data.hash,
            value: JSON.stringify(message),
            headers: {
              userHash: data.hash,
            },
          },
        ],
      });
      logger.info('Successfully published crawl request to Kafka', {
        topic: this.topic,
        hash: data.hash,
      });
    } catch (error) {
      logger.error('Failed to publish crawl request to Kafka', {
        topic: this.topic,
        hash: data.hash,
        error: error instanceof Error ? error.message : 'Unknown Kafka error',
      });
      throw error;
    }
  }
}
