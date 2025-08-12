import { KafkaClient } from '../../../common/clients/kafka-client';
import { IHandler } from '../handlers/base-handler.interface';

/**
 * IConsumer defines the standard lifecycle for Kafka consumers.
 *
 * Each consumer owns exactly one topic and manages its own subscription.
 * This interface provides a contract for all Kafka consumer implementations,
 * ensuring consistent behavior across different consumer types.
 *
 * The interface follows the Clean Architecture pattern and abstracts
 * Kafka-specific details from the application layer.
 */
export interface IConsumer {
  /**
   * Kafka topic this consumer subscribes to
   *
   * This readonly property identifies the specific Kafka topic
   * that this consumer will subscribe to for message processing.
   */
  readonly topic: string;

  /**
   * Starts consuming from the configured topic
   *
   * This method subscribes the consumer to its configured topic
   * with the provided handler. It does NOT call startConsuming()
   * as that's handled by the KafkaApiManager.
   *
   * @param kafkaClient - The Kafka client for subscription operations
   * @param handler - The message handler for processing messages
   * @returns Promise that resolves when subscription is complete
   *
   * @example
   * ```typescript
   * await consumer.start(kafkaClient, messageHandler);
   * ```
   */
  start(kafkaClient: KafkaClient, handler: IHandler): Promise<void>;

  /**
   * Pauses consuming from the configured topic
   *
   * This method temporarily stops message consumption from the topic
   * while maintaining the subscription. Messages will not be processed
   * until resume() is called.
   *
   * @param kafkaClient - The Kafka client for pause operations
   * @returns Promise that resolves when pause is complete
   *
   * @example
   * ```typescript
   * await consumer.pause(kafkaClient);
   * ```
   */
  pause(kafkaClient: KafkaClient): Promise<void>;

  /**
   * Resumes consuming from the configured topic
   *
   * This method restarts message consumption from the topic after
   * a previous pause operation. Messages will begin processing again.
   *
   * @param kafkaClient - The Kafka client for resume operations
   * @returns Promise that resolves when resume is complete
   *
   * @example
   * ```typescript
   * await consumer.resume(kafkaClient);
   * ```
   */
  resume(kafkaClient: KafkaClient): Promise<void>;

  /**
   * Stops consuming and performs cleanup if supported
   *
   * This method stops message consumption and performs any necessary
   * cleanup operations. The actual behavior may vary depending on
   * the underlying Kafka client implementation.
   *
   * @param kafkaClient - The Kafka client for stop operations
   * @returns Promise that resolves when stop is complete
   *
   * @example
   * ```typescript
   * await consumer.stop(kafkaClient);
   * ```
   */
  stop(kafkaClient: KafkaClient): Promise<void>;

  /**
   * Indicates whether the consumer is currently consuming messages
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
  isConsuming(): boolean;
}
