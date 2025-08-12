import { EachMessagePayload } from 'kafkajs';
import { logger } from '../../common/utils/logger';
import config from '../../config';
import { IProcessCrawlResponsePort } from '../../application/ports/process-crawl-response.port';
import { IKafkaClientService } from '../../common/interfaces/kafka-client.interface';
import { Consumer } from 'kafkajs';
import { CrawlResponseMessageDto } from './dtos/crawl-response-message.dto';
import { validateDto } from '../../common/utils/validation';

export class CrawlResponseConsumer {
  private readonly consumer: Consumer;
  private readonly topic = config.kafka.topics.crawlResponseTopic;

  constructor(
    private readonly kafkaClient: IKafkaClientService,
    private readonly processCrawlResponseService: IProcessCrawlResponsePort
  ) {
    this.consumer = this.kafkaClient.getConsumer('crawl-response-group');
  }

  public async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: this.handleMessage.bind(this),
    });
    logger.info('Crawl response consumer started', { topic: this.topic });
  }

  public async stop(): Promise<void> {
    await this.consumer.disconnect();
    logger.info('Crawl response consumer stopped', { topic: this.topic });
  }

  private async handleMessage({ message }: EachMessagePayload): Promise<void> {
    try {
      // 1. Extract and validate headers
      const id = message.headers?.id?.toString();
      const email = message.headers?.email?.toString();

      if (!id || !email) {
        logger.error('Missing id or email in crawl response message headers', {
          key: message.key?.toString(),
        });
        return;
      }

      // 2. Extract and validate body
      if (!message.value) {
        logger.warn('Received Kafka message with no value');
        return;
      }
      const rawData = JSON.parse(message.value.toString());
      const {
        isValid,
        data: validatedData,
        errorMessage,
      } = await validateDto(CrawlResponseMessageDto, rawData);

      if (!isValid || !validatedData) {
        logger.error('Invalid crawl response message payload', {
          id,
          email,
          error: errorMessage,
          rawData,
        });
        return;
      }

      // 3. Execute the service
      await this.processCrawlResponseService.execute({
        id,
        email,
        success: validatedData.success,
        result: validatedData.scrapedData,
        errorMessage: validatedData.errorMessage,
      });
    } catch (error) {
      logger.error('Error processing crawl response message', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
