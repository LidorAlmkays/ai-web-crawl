import { CrawlRequest } from '../../../core/domain/crawl-request.entity';
import { ICrawlRequestPublisherPort } from '../../../core/ports/gateway/crawl-request.publisher.port';
import { logger } from '../../../common/utils/logger';
import { kafkaTopics, crawlMessageTypes } from '../../../config/kafka';
import { CrawlRequestDto } from '../dtos/crawl-request.dto';
import { KafkaPublisherBase } from '../../messaging/kafka/kafka-publisher.base';
import { kafkaClientService } from '../../messaging/kafka/kafka-client.service';

export class KafkaCrawlRequestPublisher
  extends KafkaPublisherBase
  implements ICrawlRequestPublisherPort
{
  constructor() {
    super(
      kafkaClientService,
      kafkaTopics.CRAWL_REQUESTS,
      'gateway',
      process.env.INSTANCE_ID || 'gateway-1'
    );
  }

  public async publishCrawlRequest(crawlRequest: CrawlRequest): Promise<void> {
    const message: CrawlRequestDto = {
      url: crawlRequest.getUrl(),
      query: crawlRequest.getQuery(),
      hash: crawlRequest.getHash(),
      username: crawlRequest.getUsername(),
      timestamp: new Date().toISOString(),
    };

    // Use new best practices with proper headers and metadata
    await this.publishMessage(
      message,
      crawlRequest.getHash(),
      crawlMessageTypes.CRAWL_REQUEST,
      {
        userId: crawlRequest.getUsername(),
        requestId: crawlRequest.getHash(),
        customHeaders: {
          'crawl-priority': 'normal',
          'crawl-depth': '1',
          'crawl-timeout': '30000',
        },
      }
    );

    logger.info('Crawl request published to Kafka', {
      topic: kafkaTopics.CRAWL_REQUESTS,
      hash: crawlRequest.getHash(),
      url: crawlRequest.getUrl(),
      messageType: crawlMessageTypes.CRAWL_REQUEST,
      username: crawlRequest.getUsername(),
    });
  }

  public async publishCrawlRequestWithConnection(
    crawlRequest: CrawlRequest,
    connectionId: string
  ): Promise<void> {
    const message: CrawlRequestDto = {
      url: crawlRequest.getUrl(),
      query: crawlRequest.getQuery(),
      hash: crawlRequest.getHash(),
      username: crawlRequest.getUsername(),
      timestamp: new Date().toISOString(),
    };

    // Publish with connection ID for WebSocket tracking
    await this.publishMessage(
      message,
      crawlRequest.getHash(),
      crawlMessageTypes.CRAWL_REQUEST,
      {
        userId: crawlRequest.getUsername(),
        requestId: crawlRequest.getHash(),
        connectionId,
        customHeaders: {
          'crawl-priority': 'normal',
          'crawl-depth': '1',
          'crawl-timeout': '30000',
        },
      }
    );

    logger.info('Crawl request published to Kafka with connection tracking', {
      topic: kafkaTopics.CRAWL_REQUESTS,
      hash: crawlRequest.getHash(),
      url: crawlRequest.getUrl(),
      messageType: crawlMessageTypes.CRAWL_REQUEST,
      username: crawlRequest.getUsername(),
      connectionId,
    });
  }
}
