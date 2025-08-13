#!/usr/bin/env tsx

/**
 * Kafka Task Pusher Script
 *
 * This script pushes three types of Kafka messages to the task-manager:
 * 1. New Task - Creates a new web crawling task
 * 2. Completed Task - Marks a task as successfully completed with results
 * 3. Error Task - Marks a task as failed with error details
 *
 * Usage:
 * npm run push-kafka-tasks
 *
 * The script uses the existing DTOs and Kafka configuration from the task-manager project.
 */

import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Import enums
import { TaskType } from '../src/common/enums/task-type.enum';
import { TaskStatus } from '../src/common/enums/task-status.enum';

// Import Kafka configuration
import { kafkaConfig } from '../src/config/kafka';

/**
 * Kafka Task Pusher Class
 *
 * Handles the creation and sending of Kafka messages for task management.
 * Creates message structure directly without using DTOs to avoid decorator issues.
 */
class KafkaTaskPusher {
  private kafka: Kafka;
  private producer: any;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      ssl: kafkaConfig.ssl,
      sasl: kafkaConfig.sasl === false ? undefined : (kafkaConfig.sasl as any),
      connectionTimeout: kafkaConfig.connectionTimeout,
      requestTimeout: kafkaConfig.requestTimeout,
      retry: {
        initialRetryTime: kafkaConfig.retryBackoff,
        retries: kafkaConfig.maxRetryAttempts,
      },
    });

    this.producer = this.kafka.producer();
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      console.log('[INFO] Connected to Kafka successfully');
    } catch (error) {
      console.error('[ERROR] Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      console.log('[INFO] Disconnected from Kafka successfully');
    } catch (error) {
      console.error('[ERROR] Failed to disconnect from Kafka:', error);
    }
  }

  /**
   * Send a Kafka message
   */
  private async sendMessage(
    topic: string,
    key: string,
    headers: Record<string, string>,
    value: any
  ): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            headers,
            value: JSON.stringify(value),
          },
        ],
      });
      console.log(`[SUCCESS] Message sent to topic: ${topic}`);
    } catch (error) {
      console.error(`[ERROR] Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Push a new task message
   */
  async pushNewTask(
    userEmail: string,
    userQuery: string,
    baseUrl: string
  ): Promise<string> {
    const taskId = uuidv4();
    console.log(`[INFO] Creating new task with ID: ${taskId}`);

    // Validate inputs
    if (!this.validateEmail(userEmail)) {
      throw new Error('Invalid email format');
    }
    if (!this.validateUrl(baseUrl)) {
      throw new Error('Invalid URL format');
    }
    if (!userQuery || userQuery.trim().length === 0) {
      throw new Error('User query cannot be empty');
    }

    // Create message body
    const messageBody = {
      user_email: userEmail,
      user_query: userQuery,
      base_url: baseUrl,
    };

    // Send message
    await this.sendMessage(
      kafkaConfig.topics.taskStatus,
      taskId,
      {
        id: taskId,
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
      },
      messageBody
    );

    return taskId;
  }

  /**
   * Push a completed task message
   */
  async pushCompletedTask(
    taskId: string,
    userEmail: string,
    userQuery: string,
    baseUrl: string,
    crawlResult: string
  ): Promise<void> {
    console.log(`[INFO] Marking task as completed: ${taskId}`);

    // Validate inputs
    if (!this.validateEmail(userEmail)) {
      throw new Error('Invalid email format');
    }
    if (!this.validateUrl(baseUrl)) {
      throw new Error('Invalid URL format');
    }
    if (!userQuery || userQuery.trim().length === 0) {
      throw new Error('User query cannot be empty');
    }
    if (!crawlResult || crawlResult.trim().length === 0) {
      throw new Error('Crawl result cannot be empty');
    }

    // Create message body
    const messageBody = {
      user_email: userEmail,
      user_query: userQuery,
      base_url: baseUrl,
      crawl_result: crawlResult,
    };

    // Send message
    await this.sendMessage(
      kafkaConfig.topics.taskStatus,
      taskId,
      {
        id: taskId,
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.COMPLETED,
        timestamp: new Date().toISOString(),
      },
      messageBody
    );
  }

  /**
   * Push an error task message
   */
  async pushErrorTask(
    taskId: string,
    userEmail: string,
    userQuery: string,
    baseUrl: string,
    error: string
  ): Promise<void> {
    console.log(`[INFO] Marking task as error: ${taskId}`);

    // Validate inputs
    if (!this.validateEmail(userEmail)) {
      throw new Error('Invalid email format');
    }
    if (!this.validateUrl(baseUrl)) {
      throw new Error('Invalid URL format');
    }
    if (!userQuery || userQuery.trim().length === 0) {
      throw new Error('User query cannot be empty');
    }
    if (!error || error.trim().length === 0) {
      throw new Error('Error message cannot be empty');
    }

    // Create message body
    const messageBody = {
      user_email: userEmail,
      user_query: userQuery,
      base_url: baseUrl,
      error: error,
    };

    // Send message
    await this.sendMessage(
      kafkaConfig.topics.taskStatus,
      taskId,
      {
        id: taskId,
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.ERROR,
        timestamp: new Date().toISOString(),
      },
      messageBody
    );
  }

  /**
   * Run the complete task lifecycle demonstration
   */
  async runTaskLifecycleDemo(): Promise<void> {
    console.log('[INFO] Starting task lifecycle demonstration...');

    try {
      // Step 1: Create a new task
      const taskId = await this.pushNewTask(
        'user@example.com',
        'Find information about web crawling best practices',
        'https://example.com'
      );

      // Wait a moment to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Mark the task as completed
      await this.pushCompletedTask(
        taskId,
        'user@example.com',
        'Find information about web crawling best practices',
        'https://example.com',
        'Web crawling best practices include respecting robots.txt, implementing proper delays between requests, and using appropriate user agents. The site contains comprehensive information about these topics.'
      );

      console.log(
        '[SUCCESS] Task lifecycle demonstration completed successfully'
      );
    } catch (error) {
      console.error('[ERROR] Task lifecycle demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Run the error task demonstration
   */
  async runErrorTaskDemo(): Promise<void> {
    console.log('[INFO] Starting error task demonstration...');

    try {
      const taskId = await this.pushNewTask(
        'user@example.com',
        'Crawl a non-existent website',
        'https://nonexistent-website-that-will-fail.com'
      );

      // Wait a moment to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mark the task as failed
      await this.pushErrorTask(
        taskId,
        'user@example.com',
        'Crawl a non-existent website',
        'https://nonexistent-website-that-will-fail.com',
        'Failed to connect to the target website. The domain does not exist or is not accessible.'
      );

      console.log('[SUCCESS] Error task demonstration completed successfully');
    } catch (error) {
      console.error('[ERROR] Error task demonstration failed:', error);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const pusher = new KafkaTaskPusher();

  try {
    // Connect to Kafka
    await pusher.connect();

    console.log('[INFO] ========================================');
    console.log('[INFO] Kafka Task Pusher Script Started');
    console.log('[INFO] ========================================');

    // Run task lifecycle demonstration
    console.log('\n[INFO] Running task lifecycle demonstration...');
    await pusher.runTaskLifecycleDemo();

    // Run error task demonstration
    console.log('\n[INFO] Running error task demonstration...');
    await pusher.runErrorTaskDemo();

    console.log('\n[SUCCESS] All demonstrations completed successfully!');
  } catch (error) {
    console.error('[ERROR] Script execution failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from Kafka
    await pusher.disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[ERROR] Unhandled error:', error);
    process.exit(1);
  });
}

export { KafkaTaskPusher };
