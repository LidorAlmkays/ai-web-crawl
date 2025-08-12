import { BaseConsumer } from './base-consumer';
import { KafkaClient } from '../../../common/clients/kafka-client';
import { IHandler } from '../handlers/base-handler.interface';
import { logger } from '../../../common/utils/logger';

/**
 * Consumer for the task-status topic
 *
 * Extends BaseConsumer and accepts a single handler (TaskStatusRouterHandler).
 * This consumer is responsible for subscribing to the task-status topic
 * and routing messages to the appropriate handler for processing.
 *
 * The consumer follows the Single Responsibility Principle by focusing
 * solely on task status message consumption and routing.
 */
export class TaskStatusConsumer extends BaseConsumer {
  /**
   * Creates a new TaskStatusConsumer instance
   *
   * @param topic - The Kafka topic to subscribe to (typically task-status)
   */
  constructor(topic: string) {
    super(topic);
    logger.debug('TaskStatusConsumer initialized', { topic });
  }

  /**
   * Starts consuming messages from the task-status topic
   *
   * This method subscribes to the configured topic with the provided handler
   * and sets the consuming state to true. It does NOT call startConsuming()
   * as that's handled by the KafkaApiManager.
   *
   * @param kafkaClient - The Kafka client for subscription operations
   * @param handler - The message handler (typically TaskStatusRouterHandler)
   * @returns Promise that resolves when subscription is complete
   *
   * @example
   * ```typescript
   * const consumer = new TaskStatusConsumer('task-status');
   * await consumer.start(kafkaClient, taskStatusHandler);
   * ```
   */
  async start(kafkaClient: KafkaClient, handler: IHandler): Promise<void> {
    await kafkaClient.subscribe(this.topic, handler.process.bind(handler));
    this.consuming = true; // subscribed, not yet consuming
    logger.info('TaskStatusConsumer subscribed', { topic: this.topic });
  }
}
