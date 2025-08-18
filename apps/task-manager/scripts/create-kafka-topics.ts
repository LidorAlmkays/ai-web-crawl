#!/usr/bin/env tsx

/**
 * Kafka Topics Creation Script
 *
 * Creates all required Kafka topics for the task-manager application.
 * This script ensures that both task-status and web-crawl-request topics exist.
 */

// Import reflect-metadata first for decorators to work
import 'reflect-metadata';

import { Kafka } from 'kafkajs';
import { kafkaConfig } from '../src/config/kafka';
import { kafkaTopicConfig } from '../src/config/kafka-topics';

async function createKafkaTopics(): Promise<void> {
	console.log('[INFO] Creating Kafka topics...');
	console.log('[INFO] Configuration:', {
		brokers: kafkaConfig.brokers,
		clientId: kafkaConfig.clientId,
		ssl: kafkaConfig.ssl,
		sasl: kafkaConfig.sasl ? 'enabled' : 'disabled',
	});

	const kafka = new Kafka({
		clientId: kafkaConfig.clientId,
		brokers: kafkaConfig.brokers,
		ssl: kafkaConfig.ssl,
		sasl: kafkaConfig.sasl,
		connectionTimeout: kafkaConfig.connectionTimeout,
		requestTimeout: kafkaConfig.requestTimeout,
		retry: {
			initialRetryTime: kafkaConfig.retryBackoff,
			retries: kafkaConfig.maxRetryAttempts,
		},
	});

	const admin = kafka.admin();

	try {
		// Connect to Kafka admin
		console.log('[INFO] Connecting to Kafka admin...');
		await admin.connect();
		console.log('[SUCCESS] Admin connection successful');

		// List existing topics
		console.log('[INFO] Listing existing topics...');
		const existingTopics = await admin.listTopics();
		console.log('[INFO] Existing topics:', existingTopics);

		// Define required topics
		const requiredTopics = [
			{
				topic: kafkaTopicConfig.taskStatus,
				numPartitions: 1,
				replicationFactor: 1,
			},
			{
				topic: kafkaTopicConfig.webCrawlRequest,
				numPartitions: 1,
				replicationFactor: 1,
			},
		];

		// Check which topics need to be created
		const topicsToCreate = requiredTopics.filter(
			(topicConfig) => !existingTopics.includes(topicConfig.topic)
		);

		if (topicsToCreate.length === 0) {
			console.log('[SUCCESS] All required topics already exist!');
		} else {
			console.log('[INFO] Creating missing topics:', topicsToCreate.map(t => t.topic));
			await admin.createTopics({
				topics: topicsToCreate,
			});
			console.log('[SUCCESS] All required topics created successfully!');
		}

		// List final topics
		console.log('[INFO] Final topic list:');
		const finalTopics = await admin.listTopics();
		finalTopics.forEach(topic => {
			console.log(`  - ${topic}`);
		});

		console.log('[SUCCESS] Kafka topics setup completed successfully!');
	} catch (error) {
		console.error('[ERROR] Kafka topics creation failed:', error);
		throw error;
	} finally {
		// Clean up connection
		try {
			await admin.disconnect();
			console.log('[INFO] Admin connection closed');
		} catch (error) {
			console.error('[ERROR] Failed to close admin connection:', error);
		}
	}
}

// Run the script if called directly
if (require.main === module) {
	createKafkaTopics().catch((error) => {
		console.error('[ERROR] Script failed:', error);
		process.exit(1);
	});
}

export { createKafkaTopics };
