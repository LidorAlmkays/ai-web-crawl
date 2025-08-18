import { kafkaTopicConfig } from '../kafka-topics';

describe('Kafka Topic Configuration (simple)', () => {
	it('should provide default topic names', () => {
		expect(kafkaTopicConfig.webCrawlRequest).toBe('requests-web-crawl');
		expect(kafkaTopicConfig.taskStatus).toBe('task-status');
	});

	it('should read topic names from environment variables when provided', () => {
		const originalEnv = { ...process.env };
		process.env.WEB_CRAWL_REQUEST_TOPIC = 'env-web-crawl';
		process.env.TASK_STATUS_TOPIC = 'env-task-status';

		// Re-import to pick up fresh env values
		jest.resetModules();
		const { kafkaTopicConfig: freshConfig } = require('../kafka-topics');

		expect(freshConfig.webCrawlRequest).toBe('env-web-crawl');
		expect(freshConfig.taskStatus).toBe('env-task-status');

		process.env = originalEnv;
	});
});
