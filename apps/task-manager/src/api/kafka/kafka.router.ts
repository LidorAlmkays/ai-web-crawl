import { kafkaConfig } from '../../config';
import { logger } from '../../common/utils/logger';
import { IConsumer } from './consumers/consumer.interface';
import { IHandler } from './handlers/base-handler.interface';
import { TaskStatusConsumer } from './consumers/task-status.consumer';
import { TaskStatusRouterHandler } from './handlers/task-status/task-status-router.handler';
import { IWebCrawlTaskManagerPort } from '../../application/ports/web-crawl-task-manager.port';

/**
 * Registration interface for consumer/handler pairs
 *
 * This interface defines the structure for registering Kafka consumers
 * with their corresponding message handlers. It ensures proper pairing
 * of consumers and handlers for message processing.
 *
 * @property consumer - The Kafka consumer instance that subscribes to a topic
 * @property handler - The message handler that processes messages from the consumer
 */
export interface ConsumerRegistration {
  consumer: IConsumer;
  handler: IHandler;
}

/**
 * KafkaRouter - Registration Only
 *
 * Creates consumers and their handlers, returns registrations.
 * No side effects - no starting, pausing, or client usage.
 *
 * This router function is responsible for creating and configuring
 * all Kafka consumers and their corresponding message handlers.
 * It follows the Factory pattern and provides a centralized place
 * for consumer registration without performing any side effects.
 *
 * The router creates the necessary dependencies and returns
 * registration objects that can be used by the KafkaApiManager
 * to start and manage the consumers.
 */
export function registerConsumers(deps: {
  webCrawlTaskManager: IWebCrawlTaskManagerPort;
}): ConsumerRegistration[] {
  logger.info('Registering Kafka consumers...');

  const registrations: ConsumerRegistration[] = [];

  // Create task-status consumer and its router handler
  const taskStatusRouterHandler = new TaskStatusRouterHandler(
    deps.webCrawlTaskManager
  );
  const taskStatusConsumer = new TaskStatusConsumer(
    kafkaConfig.topics.taskStatus
  );

  registrations.push({
    consumer: taskStatusConsumer,
    handler: taskStatusRouterHandler,
  });

  logger.info('Kafka consumer registrations created', {
    count: registrations.length,
    topics: registrations.map((r) => r.consumer.topic),
  });

  return registrations;
}
