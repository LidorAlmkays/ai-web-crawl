import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for test Kafka message structure
 *
 * Defines the structure of test Kafka messages used in testing.
 * This interface matches the Kafka message format used by kafkajs.
 *
 * @property topic - Kafka topic name
 * @property partition - Kafka partition number
 * @property offset - Message offset
 * @property key - Message key as Buffer
 * @property value - Message value as Buffer
 * @property headers - Message headers as Record<string, Buffer>
 * @property timestamp - Message timestamp
 */
export interface TestKafkaMessage {
  topic: string;
  partition: number;
  offset: string;
  key: Buffer;
  value: Buffer;
  headers: Record<string, Buffer>;
  timestamp: number;
}

/**
 * Interface for test message data
 *
 * Defines the data structure used to customize test messages.
 * This interface allows for flexible message generation with
 * optional overrides for testing different scenarios.
 *
 * @property taskId - Optional task identifier
 * @property status - Optional task status
 * @property url - Optional URL for the task
 * @property userEmail - Optional user email address
 * @property userQuery - Optional user query string
 * @property metadata - Optional metadata object
 */
export interface TestMessageData {
  taskId?: string;
  status?: string;
  url?: string;
  userEmail?: string;
  userQuery?: string;
  metadata?: Record<string, any>;
}

/**
 * Kafka Message Generator
 *
 * Provides utilities for generating test Kafka messages in the Task Manager application.
 * This class encapsulates common message generation patterns for testing different
 * scenarios including valid messages, invalid messages, and edge cases.
 *
 * The generator supports:
 * - Valid message generation with proper structure
 * - Invalid message generation for error testing
 * - Batch message generation for load testing
 * - Custom message data injection
 * - Various error scenarios (malformed JSON, missing fields, etc.)
 *
 * This class is designed to be used in test suites to provide a clean
 * and consistent way to create test messages for Kafka consumers.
 */
export class KafkaMessageGenerator {
  /**
   * Generates a valid Kafka message with proper headers and body
   *
   * Creates message body that matches NewTaskStatusMessageDto structure
   * with all required fields and proper formatting.
   *
   * @param data - Optional data to customize the message
   * @returns TestKafkaMessage with valid structure and data
   *
   * @example
   * ```typescript
   * const message = KafkaMessageGenerator.generateValidMessage({
   *   taskId: 'test-123',
   *   status: 'new',
   *   userEmail: 'user@example.com'
   * });
   * ```
   */
  static generateValidMessage(data: TestMessageData = {}): TestKafkaMessage {
    const taskId = data.taskId || uuidv4();
    const messageBody = {
      user_email: data.userEmail || 'test@example.com',
      user_query: data.userQuery || 'Test query for web crawling',
      base_url: data.url || 'https://example.com',
    };

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from(taskId),
      value: Buffer.from(JSON.stringify(messageBody)),
      headers: {
        id: Buffer.from(taskId),
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from(data.status !== undefined ? data.status : 'new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generates a message with invalid UUID in header
   *
   * Creates a message with malformed UUID in the id header to test
   * UUID validation error handling.
   *
   * @returns TestKafkaMessage with invalid UUID in headers
   *
   * @example
   * ```typescript
   * const invalidMessage = KafkaMessageGenerator.generateInvalidUuidMessage();
   * // Use this to test UUID validation error handling
   * ```
   */
  static generateInvalidUuidMessage(): TestKafkaMessage {
    const messageBody = {
      user_email: 'test@example.com',
      user_query: 'Test query for web crawling',
      base_url: 'https://example.com',
    };

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from('invalid-uuid'),
      value: Buffer.from(JSON.stringify(messageBody)),
      headers: {
        id: Buffer.from('invalid-uuid-format'),
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from('new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generates a message with missing required fields
   *
   * Creates a message with missing required fields in the message body
   * to test validation error handling.
   *
   * @returns TestKafkaMessage with missing required fields
   *
   * @example
   * ```typescript
   * const incompleteMessage = KafkaMessageGenerator.generateMissingFieldsMessage();
   * // Use this to test validation error handling
   * ```
   */
  static generateMissingFieldsMessage(): TestKafkaMessage {
    const taskId = uuidv4();
    const messageBody = {
      // Missing user_email field
      user_query: 'Test query for web crawling',
      base_url: 'https://example.com',
    };

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from(taskId),
      value: Buffer.from(JSON.stringify(messageBody)),
      headers: {
        id: Buffer.from(taskId),
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from('new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generates a message with invalid enum values
   *
   * Creates a message with invalid data types or formats to test
   * enum validation error handling.
   *
   * @returns TestKafkaMessage with invalid enum values
   *
   * @example
   * ```typescript
   * const invalidEnumMessage = KafkaMessageGenerator.generateInvalidEnumMessage();
   * // Use this to test enum validation error handling
   * ```
   */
  static generateInvalidEnumMessage(): TestKafkaMessage {
    const taskId = uuidv4();
    const messageBody = {
      user_email: 'invalid-email', // Invalid email format
      user_query: 'Test query for web crawling',
      base_url: 'https://example.com',
    };

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from(taskId),
      value: Buffer.from(JSON.stringify(messageBody)),
      headers: {
        id: Buffer.from(taskId),
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from('new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generates a message with malformed JSON body
   *
   * Creates a message with invalid JSON in the message body to test
   * JSON parsing error handling.
   *
   * @returns TestKafkaMessage with malformed JSON
   *
   * @example
   * ```typescript
   * const malformedMessage = KafkaMessageGenerator.generateMalformedJsonMessage();
   * // Use this to test JSON parsing error handling
   * ```
   */
  static generateMalformedJsonMessage(): TestKafkaMessage {
    const taskId = uuidv4();

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from(taskId),
      value: Buffer.from('{ invalid json }'), // Malformed JSON
      headers: {
        id: Buffer.from(taskId),
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from('new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generates a message with missing headers
   *
   * Creates a message with missing required headers to test
   * header validation error handling.
   *
   * @returns TestKafkaMessage with missing headers
   *
   * @example
   * ```typescript
   * const missingHeadersMessage = KafkaMessageGenerator.generateMissingHeadersMessage();
   * // Use this to test header validation error handling
   * ```
   */
  static generateMissingHeadersMessage(): TestKafkaMessage {
    const taskId = uuidv4();
    const messageBody = {
      user_email: 'test@example.com',
      user_query: 'Test query for web crawling',
      base_url: 'https://example.com',
    };

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from(taskId),
      value: Buffer.from(JSON.stringify(messageBody)),
      headers: {
        // Missing id field
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from('new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generates multiple test messages for batch testing
   *
   * Creates a specified number of valid test messages for batch
   * processing and load testing scenarios.
   *
   * @param count - Number of messages to generate (default: 5)
   * @returns Array of TestKafkaMessage objects
   *
   * @example
   * ```typescript
   * const batchMessages = KafkaMessageGenerator.generateBatchMessages(10);
   * // Use this for batch processing tests
   * ```
   */
  static generateBatchMessages(count = 5): TestKafkaMessage[] {
    const messages: TestKafkaMessage[] = [];

    for (let i = 0; i < count; i++) {
      messages.push(
        this.generateValidMessage({
          taskId: uuidv4(),
          status: 'new',
          url: `https://example${i}.com`,
          metadata: { batchIndex: i },
        })
      );
    }

    return messages;
  }

  /**
   * Generates a message with specific status for testing
   *
   * Creates a message with a specific status value to test
   * status-specific processing logic.
   *
   * @param status - The status to include in the message
   * @returns TestKafkaMessage with the specified status
   *
   * @example
   * ```typescript
   * const completedMessage = KafkaMessageGenerator.generateMessageWithStatus('completed');
   * // Use this to test completed status processing
   * ```
   */
  static generateMessageWithStatus(status: string): TestKafkaMessage {
    return this.generateValidMessage({
      taskId: uuidv4(),
      status,
      url: 'https://example.com',
      metadata: { testStatus: status },
    });
  }

  /**
   * Generates a message with specific URL for testing
   *
   * Creates a message with a specific URL to test URL-specific
   * processing logic.
   *
   * @param url - The URL to include in the message
   * @returns TestKafkaMessage with the specified URL
   *
   * @example
   * ```typescript
   * const customUrlMessage = KafkaMessageGenerator.generateMessageWithUrl('https://custom.com');
   * // Use this to test URL-specific processing
   * ```
   */
  static generateMessageWithUrl(url: string): TestKafkaMessage {
    return this.generateValidMessage({
      taskId: uuidv4(),
      status: 'new',
      url,
      metadata: { testUrl: url },
    });
  }

  /**
   * Generates a message with user's exact data structure
   *
   * Creates a message that matches the exact data structure used
   * by the user in real-world scenarios for realistic testing.
   *
   * @returns TestKafkaMessage with realistic user data
   *
   * @example
   * ```typescript
   * const userDataMessage = KafkaMessageGenerator.generateUserDataMessage();
   * // Use this for realistic user scenario testing
   * ```
   */
  static generateUserDataMessage(): TestKafkaMessage {
    const taskId = uuidv4();
    const messageBody = {
      user_email: 'lidorTestRun1@gmail.com',
      user_query: 'im testing this project',
      base_url: 'http://localhost:4912/test.com',
    };

    return {
      topic: 'task-status',
      partition: 0,
      offset: '0',
      key: Buffer.from(taskId),
      value: Buffer.from(JSON.stringify(messageBody)),
      headers: {
        id: Buffer.from(taskId),
        task_type: Buffer.from('web-crawl'),
        status: Buffer.from('new'),
        timestamp: Buffer.from(new Date().toISOString()),
      },
      timestamp: Date.now(),
    };
  }
}
