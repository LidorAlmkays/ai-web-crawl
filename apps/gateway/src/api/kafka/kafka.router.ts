import { logger } from '../../common/utils/logger';
import { CrawlResponseConsumer } from './crawl-response.consumer';
import { IKafkaClientService } from '../../common/interfaces/kafka-client.interface';
import { IProcessCrawlResponsePort } from '../../application/ports/process-crawl-response.port';

let consumers: CrawlResponseConsumer[] = [];

/**
 * Initializes and registers all Kafka consumers for the application.
 * This is the central point for managing consumer lifecycle.
 *
 * @param {IKafkaClientService} kafkaClient - The shared Kafka client service.
 * @param {IProcessCrawlResponsePort} processCrawlResponseService - The application service for processing responses.
 */
export function initializeKafkaConsumers(
  kafkaClient: IKafkaClientService,
  processCrawlResponseService: IProcessCrawlResponsePort
): void {
  const crawlResponseConsumer = new CrawlResponseConsumer(
    kafkaClient,
    processCrawlResponseService
  );

  consumers.push(crawlResponseConsumer);
  logger.info('Initialized Kafka consumers');
}

/**
 * Starts all registered Kafka consumers.
 */
export async function startAllConsumers(): Promise<void> {
  logger.info(`Starting ${consumers.length} Kafka consumer(s)...`);
  for (const consumer of consumers) {
    try {
      await consumer.start();
    } catch (error) {
      logger.error('Failed to start a Kafka consumer', {
        consumer: consumer.constructor.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Decide if we should throw or continue starting others
    }
  }
}

/**
 * Stops all registered Kafka consumers gracefully.
 */
export async function stopAllConsumers(): Promise<void> {
  logger.info('Stopping all Kafka consumers...');
  for (const consumer of consumers) {
    await consumer.stop();
  }
  consumers = []; // Clear the list after stopping
}
