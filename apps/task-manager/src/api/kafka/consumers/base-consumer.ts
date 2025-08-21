import { KafkaClient } from '../../../common/clients/kafka-client';
import { IHandler } from '../handlers/base-handler.interface';
import { IConsumer } from './consumer.interface';
import { logger } from '../../../common/utils/logger';
// KafkaJS auto-instrumentation manages context; no explicit OTEL APIs needed here

/**
 * BaseConsumer provides common lifecycle implementation for all Kafka consumers.
 * Subclasses need only implement the abstract start method.
 *
 * This abstract class implements the IConsumer interface and provides
 * common functionality for Kafka consumer lifecycle management. It handles
 * pause, resume, stop, and state tracking operations that are shared
 * across all consumer implementations.
 *
 * The class follows the Template Method pattern, where subclasses
 * implement the specific start logic while inheriting common behavior.
 */
export abstract class BaseConsumer implements IConsumer {
  protected consuming = false;

  /**
   * Creates a new BaseConsumer instance
   *
   * @param topic - The Kafka topic this consumer will subscribe to
   */
  constructor(public readonly topic: string) {}

  /**
   * Abstract start method - subscribes to topic with handler
   *
   * This method must be implemented by subclasses to provide
   * topic-specific subscription logic. It should NOT call
   * kafkaClient.startConsuming() as that's handled by KafkaApiManager.
   *
   * @param kafkaClient - The Kafka client for subscription operations
   * @param handler - The message handler for processing messages
   * @returns Promise that resolves when subscription is complete
   *
   * @example
   * ```typescript
   * async start(kafkaClient: KafkaClient, handler: IHandler): Promise<void> {
   *   await kafkaClient.subscribe(this.topic, handler.process.bind(handler));
   *   this.consuming = true;
   * }
   * ```
   */
  abstract start(kafkaClient: KafkaClient, handler: IHandler): Promise<void>;

  /**
   * Pauses consumption for this consumer's topic
   *
   * This method pauses message consumption for the specific topic
   * and updates the internal consuming state to false.
   *
   * @param kafkaClient - The Kafka client for pause operations
   * @throws Error - When pause operation fails
   *
   * @example
   * ```typescript
   * await consumer.pause(kafkaClient);
   * ```
   */
  async pause(kafkaClient: KafkaClient): Promise<void> {
    try {
      await kafkaClient.pauseTopics([{ topic: this.topic }]);
      this.consuming = false;
      logger.info('Consumer paused', { topic: this.topic });
    } catch (error) {
      logger.error('Failed to pause consumer', { topic: this.topic, error });
      throw error;
    }
  }

  /**
   * Resumes consumption for this consumer's topic
   *
   * This method resumes message consumption for the specific topic
   * and updates the internal consuming state to true.
   *
   * @param kafkaClient - The Kafka client for resume operations
   * @throws Error - When resume operation fails
   *
   * @example
   * ```typescript
   * await consumer.resume(kafkaClient);
   * ```
   */
  async resume(kafkaClient: KafkaClient): Promise<void> {
    try {
      await kafkaClient.resumeTopics([{ topic: this.topic }]);
      this.consuming = true;
      logger.info('Consumer resumed', { topic: this.topic });
    } catch (error) {
      logger.error('Failed to resume consumer', { topic: this.topic, error });
      throw error;
    }
  }

  /**
   * Stops consumption for this consumer
   *
   * This method updates the internal state to indicate the consumer
   * is no longer consuming. Note that kafkajs doesn't provide
   * per-topic stop functionality, so this only updates internal state.
   *
   * @param _kafkaClient - The Kafka client (unused in this implementation)
   *
   * @example
   * ```typescript
   * await consumer.stop(kafkaClient);
   * ```
   */
  async stop(_kafkaClient: KafkaClient): Promise<void> {
    this.consuming = false;
    logger.info('Consumer stopped', { topic: this.topic });
  }

  /**
   * Checks if the consumer is currently consuming messages
   *
   * @returns true if the consumer is actively consuming, false otherwise
   *
   * @example
   * ```typescript
   * if (consumer.isConsuming()) {
   *   console.log('Consumer is active');
   * }
   * ```
   */
  isConsuming(): boolean {
    return this.consuming;
  }

  /**
   * Process message with automatic trace context
   *
   * @param message - Kafka message
   * @param handler - Message handler
   */
  protected async processMessageWithTrace(
    message: any,
    handler: IHandler
  ): Promise<void> {
    try {
      // Log message received with automatic trace context
      logger.info('Kafka message received', {
        topic: this.topic,
        key: message.key?.toString(),
        partition: message.partition,
        offset: message.offset,
      });

      // Process message (kafkajs instrumentation creates consumer span and propagates context)
      await handler.process(message, logger);


    } catch (error) {
      // Log error with automatic trace context
      logger.error('Kafka message processing failed', {
        topic: this.topic,
        key: message.key?.toString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
