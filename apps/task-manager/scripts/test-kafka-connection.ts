#!/usr/bin/env tsx

/**
 * Kafka Connection Test Script
 *
 * Simple script to test Kafka connectivity and configuration
 * before running the main task pusher script.
 */

// Import reflect-metadata first for decorators to work
import 'reflect-metadata';

import { Kafka } from 'kafkajs';
import { kafkaConfig } from '../src/config/kafka';

async function testKafkaConnection(): Promise<void> {
  console.log('[INFO] Testing Kafka connection...');
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
  const producer = kafka.producer();

  try {
    // Test admin connection
    console.log('[INFO] Connecting to Kafka admin...');
    await admin.connect();
    console.log('[SUCCESS] Admin connection successful');

    // Test producer connection
    console.log('[INFO] Connecting to Kafka producer...');
    await producer.connect();
    console.log('[SUCCESS] Producer connection successful');

    // List topics
    console.log('[INFO] Listing topics...');
    const topics = await admin.listTopics();
    console.log('[INFO] Available topics:', topics);

    // Check if our topic exists
    const taskStatusTopic = kafkaConfig.topics.taskStatus;
    if (topics.includes(taskStatusTopic)) {
      console.log(`[SUCCESS] Topic '${taskStatusTopic}' exists`);
    } else {
      console.log(`[WARN] Topic '${taskStatusTopic}' does not exist`);
      console.log('[INFO] Creating topic...');
      await admin.createTopics({
        topics: [
          {
            topic: taskStatusTopic,
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
      });
      console.log(`[SUCCESS] Topic '${taskStatusTopic}' created`);
    }

    console.log('[SUCCESS] Kafka connection test completed successfully!');
  } catch (error) {
    console.error('[ERROR] Kafka connection test failed:', error);
    throw error;
  } finally {
    // Clean up connections
    try {
      await admin.disconnect();
      await producer.disconnect();
      console.log('[INFO] Connections closed');
    } catch (error) {
      console.error('[ERROR] Failed to close connections:', error);
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  testKafkaConnection().catch((error) => {
    console.error('[ERROR] Test failed:', error);
    process.exit(1);
  });
}

export { testKafkaConnection };
