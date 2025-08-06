import { EachMessagePayload } from 'kafkajs';
import { logger } from '../../common/utils/logger';
import config from '../../config';
import { IProcessCrawlResponsePort } from '../../application/ports/process-crawl-response.port';
import { IKafkaClientService } from '../../common/interfaces/kafka-client.interface';
import { Consumer } from 'kafkajs';
import { validateDto } from '../../common/utils/validation';
import { CrawlResponseMessageDto } from './dtos/crawl-response-message.dto';

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
      if (!message.value) {
        logger.warn('Received Kafka message with no value');
        return;
      }

      const userHash = message.headers?.userHash?.toString();
      if (!userHash) {
        logger.error('Missing userHash in message headers');
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
          userHash,
          error: errorMessage,
        });
        return;
      }

      await this.processCrawlResponseService.execute({
        userHash,
        originalUrl: validatedData.originalUrl,
        scrapedData: validatedData.scrapedData, // Now a string
        success: validatedData.success,
        errorMessage: validatedData.errorMessage,
      });
    } catch (error) {
      logger.error('Error processing crawl response message', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
