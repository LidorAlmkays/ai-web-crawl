import { logger } from '../../common/utils/logger';
import { IConsumer } from './consumers/consumer.interface';
import { IHandler } from './handlers/base-handler.interface';
import { TaskStatusConsumer } from './consumers/task-status.consumer';
import { TaskStatusRouterHandler } from './handlers/task-status/task-status-router.handler';
import { IWebCrawlTaskManagerPort } from '../../application/ports/web-crawl-task-manager.port';
import { kafkaConfig } from '../../config/kafka';

export interface ConsumerRegistration {
	consumer: IConsumer;
	handler: IHandler;
}

export function registerConsumers(deps: {
	webCrawlTaskManager: IWebCrawlTaskManagerPort;
}): ConsumerRegistration[] {
	logger.info('Registering Kafka consumers...');

	const registrations: ConsumerRegistration[] = [];

	const taskStatusRouterHandler = new TaskStatusRouterHandler(
		deps.webCrawlTaskManager
	);
	const taskStatusTopic = kafkaConfig.topics.taskStatus;
	const taskStatusConsumer = new TaskStatusConsumer(taskStatusTopic);

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
