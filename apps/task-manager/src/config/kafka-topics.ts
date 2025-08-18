/*****************************************************
 * Simple Kafka Topic Configuration
 *
 * Exports a plain dictionary of topic names sourced from
 * environment variables with sensible defaults.
 *
 * Usage:
 *   import { kafkaTopicConfig } from './kafka-topics';
 *   const topic = kafkaTopicConfig.taskStatus;
 *****************************************************/

const DEFAULT_TOPICS = {
	webCrawlRequest: 'requests-web-crawl',
	taskStatus: 'task-status',
} as const;

export const kafkaTopicConfig = {
	webCrawlRequest: process.env.WEB_CRAWL_REQUEST_TOPIC || DEFAULT_TOPICS.webCrawlRequest,
	taskStatus: process.env.TASK_STATUS_TOPIC || DEFAULT_TOPICS.taskStatus,
} as const;
