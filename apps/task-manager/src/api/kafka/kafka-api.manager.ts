import { KafkaClient } from '../../common/clients/kafka-client';
import { logger } from '../../common/utils/logger';
import { IWebCrawlTaskManagerPort } from '../../application/ports/web-crawl-task-manager.port';
import { registerConsumers, ConsumerRegistration } from './kafka.router';
import { kafkaConfig } from '../../config';

/**
 * KafkaApiManager
 *
 * Manages lifecycle of Kafka consumers using a single KafkaClient instance.
 * Gets registrations from KafkaRouter and manages start/pause/resume/stop.
 *
 * This manager class orchestrates the complete Kafka consumer lifecycle,
 * including registration, subscription, and state management. It coordinates
 * between the Kafka client and individual consumers to ensure proper
 * message processing and resource management.
 *
 * The manager follows the Manager pattern and provides a centralized
 * interface for Kafka operations across the application.
 */
export class KafkaApiManager {
  private registrations: ConsumerRegistration[] = [];

  /**
   * Creates a new KafkaApiManager instance
   *
   * @param kafkaClient - The Kafka client instance for connection management
   * @param deps - Dependencies required for consumer handlers
   */
  constructor(
    private readonly kafkaClient: KafkaClient,
    private readonly deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }
  ) {
    logger.debug('KafkaApiManager initialized');
  }

  /**
   * Starts the Kafka API and begins message consumption
   *
   * This method orchestrates the complete startup sequence:
   * 1. Gets consumer/handler registrations from the router
   * 2. Subscribes all consumers with their respective handlers
   * 3. Starts consuming messages once all subscriptions are complete
   *
   * The method ensures proper initialization order and provides
   * comprehensive error handling for startup failures.
   *
   * @throws Error - When consumer registration fails
   * @throws Error - When consumer subscription fails
   * @throws Error - When message consumption fails to start
   *
   * @example
   * ```typescript
   * await kafkaApiManager.start();
   * console.log('Kafka API started successfully');
   * ```
   */
  async start(): Promise<void> {
    try {
      // Get consumer/handler registrations from router
      this.registrations = registerConsumers(this.deps);
      logger.debug('Got consumer registrations', {
        count: this.registrations.length,
        topics: this.registrations.map((r) => r.consumer.topic),
      });

      // Subscribe all consumers first (no consuming yet)
      for (const { consumer, handler } of this.registrations) {
        await consumer.start(this.kafkaClient, handler);
        logger.debug('Consumer subscribed', { topic: consumer.topic });
      }

      // Start consuming once after all subscriptions
      await this.kafkaClient.startConsuming();
      logger.info('Kafka consumption started for all topics');
    } catch (error) {
      logger.error('Failed to start Kafka API', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Pauses all Kafka consumers and stops message processing
   *
   * This method applies both client-level pause (all topics) and per-consumer
   * pause for proper state management. It ensures that no new messages
   * are processed while maintaining the ability to resume later.
   *
   * @throws Error - When pause operations fail
   *
   * @example
   * ```typescript
   * await kafkaApiManager.pause();
   * console.log('All consumers paused');
   * ```
   */
  async pause(): Promise<void> {
    try {
      // Pause all topics at client level using config dictionary
      const topics = Object.values(kafkaConfig.topics).map((topic) => ({
        topic,
      }));
      await this.kafkaClient.pauseTopics(topics);
      logger.debug('Client-level topics paused', {
        topics: topics.map((t) => t.topic),
      });

      // Also pause each consumer for internal state
      for (const { consumer } of this.registrations) {
        await consumer.pause(this.kafkaClient);
      }
    } catch (error) {
      logger.error('Failed to pause Kafka API', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resumes all Kafka consumers and restarts message processing
   *
   * This method applies both client-level resume (all topics) and per-consumer
   * resume for proper state management. It restores message processing
   * after a previous pause operation.
   *
   * @throws Error - When resume operations fail
   *
   * @example
   * ```typescript
   * await kafkaApiManager.resume();
   * console.log('All consumers resumed');
   * ```
   */
  async resume(): Promise<void> {
    try {
      // Resume all topics at client level using config dictionary
      const topics = Object.values(kafkaConfig.topics).map((topic) => ({
        topic,
      }));
      await this.kafkaClient.resumeTopics(topics);
      logger.debug('Client-level topics resumed', {
        topics: topics.map((t) => t.topic),
      });

      // Also resume each consumer for internal state
      for (const { consumer } of this.registrations) {
        await consumer.resume(this.kafkaClient);
      }
    } catch (error) {
      logger.error('Failed to resume Kafka API', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stops all Kafka consumers and updates their internal states
   *
   * This method stops all consumers and updates their internal states.
   * The actual client disconnect is handled by the KafkaFactory during
   * application shutdown.
   *
   * @throws Error - When stop operations fail
   *
   * @example
   * ```typescript
   * await kafkaApiManager.stop();
   * console.log('All consumers stopped');
   * ```
   */
  async stop(): Promise<void> {
    try {
      logger.info('Stopping Kafka API...');

      // Stop each consumer (updates internal state)
      for (const { consumer } of this.registrations) {
        await consumer.stop(this.kafkaClient);
      }

      logger.info('Kafka API stopped successfully');
    } catch (error) {
      logger.error('Failed to stop Kafka API', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Gets the current number of registered consumers
   *
   * @returns Number of registered consumers
   *
   * @example
   * ```typescript
   * const count = kafkaApiManager.getRegistrationsCount();
   * console.log(`Registered consumers: ${count}`);
   * ```
   */
  getRegistrationsCount(): number {
    return this.registrations.length;
  }

  /**
   * Gets the list of registered Kafka topics
   *
   * @returns Array of topic names that are currently registered
   *
   * @example
   * ```typescript
   * const topics = kafkaApiManager.getRegisteredTopics();
   * console.log('Registered topics:', topics);
   * ```
   */
  getRegisteredTopics(): string[] {
    return this.registrations.map((r) => r.consumer.topic);
  }

  /**
   * Checks if any consumers are currently consuming messages
   *
   * @returns true if any consumer is actively consuming, false otherwise
   *
   * @example
   * ```typescript
   * if (kafkaApiManager.isConsuming()) {
   *   console.log('Consumers are active');
   * }
   * ```
   */
  isConsuming(): boolean {
    return this.registrations.some((r) => r.consumer.isConsuming());
  }
}
