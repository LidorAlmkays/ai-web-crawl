# Job 06: Kafka Publisher Implementation

## Status

**COMPLETED**

## Overview

Create a Kafka publisher for web crawl requests that uses the singleton Kafka client to ensure only one instance is managed and maintains trace context throughout the publishing process.

## Objectives

- Create web crawl request publisher using singleton Kafka client
- Ensure trace context propagation in published messages
- Handle publishing errors with proper logging
- Maintain type safety and validation

## Files to Create/Modify

### New Files

- `src/infrastructure/messaging/kafka/publishers/web-crawl-request.publisher.ts` - Web crawl request publisher
- `src/infrastructure/messaging/kafka/publishers/__tests__/web-crawl-request.publisher.spec.ts` - Unit tests

### Files to Modify

- `src/infrastructure/messaging/kafka/publishers/index.ts` - Export new publisher
- `src/common/clients/kafka-client.ts` - Ensure singleton pattern

## Detailed Implementation

### 1. Create Web Crawl Request Publisher

**File**: `src/infrastructure/messaging/kafka/publishers/web-crawl-request.publisher.ts`

```typescript
import { KafkaClient } from '../../common/clients/kafka-client';
import { getKafkaTopicName } from '../../config/kafka-topics';
import { WebCrawlRequestMessageDto, WebCrawlRequestMessageDtoType } from '../dtos/web-crawl-request.dto';
import { ILogger } from '../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../common/utils/trace-logging';

export interface PublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
  topic?: string;
  partition?: number;
  offset?: number;
}

export interface PublishOptions {
  timeout?: number;
  retries?: number;
  acks?: number;
  traceContext?: {
    traceparent?: string;
    tracestate?: string;
    correlationId?: string;
  };
}

/**
 * Publisher for web crawl request messages
 * Uses singleton Kafka client to ensure single instance management
 */
export class WebCrawlRequestPublisher {
  private readonly kafkaClient: KafkaClient;
  private readonly logger: ILogger;
  private readonly topicName: string;

  constructor(logger: ILogger) {
    this.kafkaClient = KafkaClient.getInstance();
    this.logger = logger;
    this.topicName = getKafkaTopicName('webCrawlRequest');
  }

  /**
   * Publish web crawl request message
   */
  async publish(message: WebCrawlRequestMessageDtoType, options: PublishOptions = {}): Promise<PublishResult> {
    const startTime = Date.now();
    const traceContext = this.extractTraceContext(message, options.traceContext);
    const traceLogger = traceContext ? TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext) : this.logger;

    try {
      // Validate message before publishing
      const validation = WebCrawlRequestMessageDto.validate(message);
      if (!validation.isValid) {
        const error = `Message validation failed: ${validation.errors.join(', ')}`;
        traceLogger.error('Failed to publish web crawl request - validation error', {
          errors: validation.errors,
          taskId: message.headers.task_id,
        });
        return {
          success: false,
          error,
          topic: this.topicName,
        };
      }

      // Prepare Kafka message with trace context
      const kafkaMessage = this.prepareKafkaMessage(message, traceContext);

      // Publish to Kafka
      const result = await this.kafkaClient.produce({
        topic: this.topicName,
        messages: [kafkaMessage],
        timeout: options.timeout || 30000, // 30 seconds default
        acks: options.acks || 1, // Wait for leader acknowledgment
      });

      const duration = Date.now() - startTime;

      traceLogger.info('Web crawl request published successfully', {
        taskId: message.headers.task_id,
        topic: this.topicName,
        partition: result[0]?.partition,
        offset: result[0]?.offset,
        messageId: result[0]?.baseOffset?.toString(),
        duration,
        userEmail: message.body.user_email,
        baseUrl: message.body.base_url,
      });

      return {
        success: true,
        messageId: result[0]?.baseOffset?.toString(),
        topic: this.topicName,
        partition: result[0]?.partition,
        offset: result[0]?.offset,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      traceLogger.error('Failed to publish web crawl request', {
        error: errorMessage,
        taskId: message.headers.task_id,
        topic: this.topicName,
        duration,
        userEmail: message.body.user_email,
        baseUrl: message.body.base_url,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: errorMessage,
        topic: this.topicName,
      };
    }
  }

  /**
   * Publish web crawl request from task data
   */
  async publishFromTaskData(taskId: string, userEmail: string, userQuery: string, baseUrl: string, options: PublishOptions = {}): Promise<PublishResult> {
    try {
      const message = WebCrawlRequestMessageDto.createFromTaskData(taskId, userEmail, userQuery, baseUrl, options.traceContext);

      return await this.publish(message, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to create web crawl request message', {
        error: errorMessage,
        taskId,
        userEmail,
        baseUrl,
      });

      return {
        success: false,
        error: `Failed to create message: ${errorMessage}`,
        topic: this.topicName,
      };
    }
  }

  /**
   * Prepare Kafka message with proper headers and trace context
   */
  private prepareKafkaMessage(message: WebCrawlRequestMessageDtoType, traceContext?: any) {
    const headers: Record<string, Buffer> = {};

    // Add task_id header
    headers['task_id'] = Buffer.from(message.headers.task_id);

    // Add trace context headers if available
    if (traceContext?.traceparent) {
      headers['traceparent'] = Buffer.from(traceContext.traceparent);
    }

    if (traceContext?.tracestate) {
      headers['tracestate'] = Buffer.from(traceContext.tracestate);
    }

    if (traceContext?.correlationId) {
      headers['correlation_id'] = Buffer.from(traceContext.correlationId);
    }

    // Add source and version headers
    headers['source'] = Buffer.from(message.headers.source || 'task-manager');
    headers['version'] = Buffer.from(message.headers.version || '1.0.0');

    // Add timestamp
    headers['timestamp'] = Buffer.from(Date.now().toString());

    return {
      key: message.headers.task_id, // Use task_id as message key for partitioning
      value: Buffer.from(JSON.stringify(message.body)),
      headers,
    };
  }

  /**
   * Extract trace context from message and options
   */
  private extractTraceContext(message: WebCrawlRequestMessageDtoType, optionsTraceContext?: any): any {
    // Priority: options > message headers
    const traceparent = optionsTraceContext?.traceparent || message.headers.traceparent;
    const tracestate = optionsTraceContext?.tracestate || message.headers.tracestate;
    const correlationId = optionsTraceContext?.correlationId || message.headers.correlation_id;

    if (traceparent || tracestate || correlationId) {
      return {
        traceparent,
        tracestate,
        correlationId,
      };
    }

    return null;
  }

  /**
   * Get publisher status and configuration
   */
  getStatus(): {
    topicName: string;
    kafkaClientConnected: boolean;
    kafkaClientConfig: any;
  } {
    return {
      topicName: this.topicName,
      kafkaClientConnected: this.kafkaClient.isConnected(),
      kafkaClientConfig: this.kafkaClient.getConfig(),
    };
  }

  /**
   * Validate publisher configuration
   */
  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if Kafka client is connected
      if (!this.kafkaClient.isConnected()) {
        errors.push('Kafka client is not connected');
      }

      // Check if topic exists (optional check)
      try {
        const metadata = await this.kafkaClient.getMetadata([this.topicName]);
        const topicMetadata = metadata.topics.find((t) => t.name === this.topicName);

        if (!topicMetadata) {
          warnings.push(`Topic ${this.topicName} does not exist and will be auto-created`);
        }
      } catch (error) {
        warnings.push(`Could not verify topic existence: ${error.message}`);
      }

      // Validate topic name format
      if (!this.topicName || this.topicName.trim() === '') {
        errors.push('Topic name is empty');
      }

      if (this.topicName.length > 249) {
        errors.push('Topic name is too long (max 249 characters)');
      }
    } catch (error) {
      errors.push(`Configuration validation failed: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Factory function to create web crawl request publisher
 */
export function createWebCrawlRequestPublisher(logger: ILogger): WebCrawlRequestPublisher {
  return new WebCrawlRequestPublisher(logger);
}
```

### 2. Update Publishers Index

**File**: `src/infrastructure/messaging/kafka/publishers/index.ts`

```typescript
// ... existing exports ...

// Web Crawl Request Publisher
export { WebCrawlRequestPublisher, createWebCrawlRequestPublisher, type PublishResult, type PublishOptions } from './web-crawl-request.publisher';
```

### 3. Create Unit Tests

**File**: `src/infrastructure/messaging/kafka/publishers/__tests__/web-crawl-request.publisher.spec.ts`

```typescript
import { WebCrawlRequestPublisher, PublishOptions } from '../web-crawl-request.publisher';
import { KafkaClient } from '../../../common/clients/kafka-client';
import { WebCrawlRequestMessageDto } from '../../dtos/web-crawl-request.dto';
import { ILogger } from '../../../common/utils/logging/interfaces';

// Mock Kafka client
jest.mock('../../../common/clients/kafka-client');
jest.mock('../../../config/kafka-topics', () => ({
  getKafkaTopicName: jest.fn().mockReturnValue('test-web-crawl-topic'),
}));

describe('WebCrawlRequestPublisher', () => {
  let publisher: WebCrawlRequestPublisher;
  let mockLogger: jest.Mocked<ILogger>;
  let mockKafkaClient: jest.Mocked<KafkaClient>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };

    mockKafkaClient = {
      getInstance: jest.fn().mockReturnThis(),
      isConnected: jest.fn().mockReturnValue(true),
      getConfig: jest.fn().mockReturnValue({}),
      produce: jest.fn(),
      getMetadata: jest.fn(),
    } as any;

    (KafkaClient.getInstance as jest.Mock).mockReturnValue(mockKafkaClient);

    publisher = new WebCrawlRequestPublisher(mockLogger);
  });

  describe('publish', () => {
    const validMessage = {
      headers: {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'task-manager',
        version: '1.0.0',
      },
      body: {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      },
    };

    it('should publish valid message successfully', async () => {
      const mockResult = [
        {
          partition: 0,
          offset: '123',
          baseOffset: 123,
        },
      ];

      mockKafkaClient.produce.mockResolvedValue(mockResult);

      const result = await publisher.publish(validMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('123');
      expect(result.partition).toBe(0);
      expect(result.offset).toBe('123');
      expect(result.topic).toBe('test-web-crawl-topic');

      expect(mockKafkaClient.produce).toHaveBeenCalledWith({
        topic: 'test-web-crawl-topic',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: validMessage.headers.task_id,
            value: expect.any(Buffer),
            headers: expect.objectContaining({
              task_id: expect.any(Buffer),
              traceparent: expect.any(Buffer),
              tracestate: expect.any(Buffer),
              correlation_id: expect.any(Buffer),
            }),
          }),
        ]),
        timeout: 30000,
        acks: 1,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Web crawl request published successfully',
        expect.objectContaining({
          taskId: validMessage.headers.task_id,
          topic: 'test-web-crawl-topic',
          partition: 0,
          offset: '123',
          messageId: '123',
        })
      );
    });

    it('should handle invalid message validation', async () => {
      const invalidMessage = {
        headers: {
          task_id: 'invalid-uuid',
        },
        body: {
          user_email: 'invalid-email',
          user_query: '',
          base_url: 'invalid-url',
        },
      };

      const result = await publisher.publish(invalidMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message validation failed');
      expect(result.topic).toBe('test-web-crawl-topic');

      expect(mockKafkaClient.produce).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish web crawl request - validation error',
        expect.objectContaining({
          errors: expect.any(Array),
          taskId: 'invalid-uuid',
        })
      );
    });

    it('should handle Kafka publishing errors', async () => {
      const kafkaError = new Error('Kafka connection failed');
      mockKafkaClient.produce.mockRejectedValue(kafkaError);

      const result = await publisher.publish(validMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Kafka connection failed');
      expect(result.topic).toBe('test-web-crawl-topic');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish web crawl request',
        expect.objectContaining({
          error: 'Kafka connection failed',
          taskId: validMessage.headers.task_id,
          topic: 'test-web-crawl-topic',
        })
      );
    });

    it('should use custom publish options', async () => {
      const mockResult = [{ partition: 0, offset: '123', baseOffset: 123 }];
      mockKafkaClient.produce.mockResolvedValue(mockResult);

      const options: PublishOptions = {
        timeout: 60000,
        acks: 2,
        retries: 3,
        traceContext: {
          traceparent: '00-custom-trace-123-01',
          tracestate: 'custom=value',
          correlationId: 'custom-corr-123',
        },
      };

      await publisher.publish(validMessage, options);

      expect(mockKafkaClient.produce).toHaveBeenCalledWith({
        topic: 'test-web-crawl-topic',
        messages: expect.arrayContaining([
          expect.objectContaining({
            headers: expect.objectContaining({
              traceparent: expect.any(Buffer),
              tracestate: expect.any(Buffer),
              correlation_id: expect.any(Buffer),
            }),
          }),
        ]),
        timeout: 60000,
        acks: 2,
      });
    });
  });

  describe('publishFromTaskData', () => {
    it('should create and publish message from task data', async () => {
      const mockResult = [{ partition: 0, offset: '123', baseOffset: 123 }];
      mockKafkaClient.produce.mockResolvedValue(mockResult);

      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const userEmail = 'test@example.com';
      const userQuery = 'Find product information';
      const baseUrl = 'https://example.com';

      const result = await publisher.publishFromTaskData(taskId, userEmail, userQuery, baseUrl);

      expect(result.success).toBe(true);
      expect(mockKafkaClient.produce).toHaveBeenCalledWith({
        topic: 'test-web-crawl-topic',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: taskId,
            value: expect.any(Buffer),
            headers: expect.objectContaining({
              task_id: expect.any(Buffer),
              source: expect.any(Buffer),
              version: expect.any(Buffer),
            }),
          }),
        ]),
        timeout: 30000,
        acks: 1,
      });
    });

    it('should handle message creation errors', async () => {
      const result = await publisher.publishFromTaskData(
        '', // Invalid task ID
        'invalid-email',
        '', // Empty query
        'invalid-url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create message');
    });
  });

  describe('getStatus', () => {
    it('should return publisher status', () => {
      const status = publisher.getStatus();

      expect(status).toEqual({
        topicName: 'test-web-crawl-topic',
        kafkaClientConnected: true,
        kafkaClientConfig: {},
      });
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration successfully', async () => {
      mockKafkaClient.getMetadata.mockResolvedValue({
        topics: [
          {
            name: 'test-web-crawl-topic',
            partitions: [],
          },
        ],
      });

      const validation = await publisher.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect disconnected Kafka client', async () => {
      mockKafkaClient.isConnected.mockReturnValue(false);

      const validation = await publisher.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Kafka client is not connected');
    });

    it('should warn about non-existent topic', async () => {
      mockKafkaClient.getMetadata.mockResolvedValue({
        topics: [],
      });

      const validation = await publisher.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Topic test-web-crawl-topic does not exist and will be auto-created');
    });

    it('should handle metadata retrieval errors', async () => {
      mockKafkaClient.getMetadata.mockRejectedValue(new Error('Metadata retrieval failed'));

      const validation = await publisher.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Failed to retrieve topic metadata: Metadata retrieval failed');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Kafka client disconnection during publish', async () => {
      mockKafkaClient.produce.mockRejectedValue(new Error('Connection lost'));

      const result = await publisher.publishMessage(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to publish message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish web crawl request message',
        expect.objectContaining({
          error: 'Connection lost',
          taskId: mockMessage.headers.task_id,
        })
      );
    });

    it('should handle message serialization errors', async () => {
      // Mock a message that would cause JSON serialization issues
      const problematicMessage = {
        ...mockMessage,
        body: {
          ...mockMessage.body,
          user_query: 'a'.repeat(1000000), // Very long string
        },
      };

      const result = await publisher.publishMessage(problematicMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to serialize message');
    });

    it('should handle invalid message structure', async () => {
      const invalidMessage = {
        headers: null,
        body: null,
      };

      const result = await publisher.publishMessage(invalidMessage as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid message structure');
    });

    it('should handle missing trace context gracefully', async () => {
      const messageWithoutTrace = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          // No trace context
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publishMessage(messageWithoutTrace);

      expect(result.success).toBe(true);
      expect(mockKafkaClient.produce).toHaveBeenCalled();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent publishing', async () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        partition: 0,
        offset: (100 + i).toString(),
        baseOffset: 100 + i,
      }));

      mockKafkaClient.produce.mockResolvedValue(mockResults);

      const publishPromises = Array.from({ length: 10 }, (_, i) => publisher.publishFromTaskData(`123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`, `user${i}@example.com`, `Query ${i}`, 'https://example.com'));

      const results = await Promise.all(publishPromises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(mockKafkaClient.produce).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid publishing', async () => {
      const startTime = Date.now();

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      for (let i = 0; i < 100; i++) {
        await publisher.publishFromTaskData(`123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`, `user${i}@example.com`, `Query ${i}`, 'https://example.com');
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });

  describe('Message Content Validation', () => {
    it('should validate message content before publishing', async () => {
      const invalidMessage = {
        headers: {
          task_id: 'invalid-uuid',
          timestamp: new Date().toISOString(),
        },
        body: {
          user_email: 'invalid-email',
          user_query: '',
          base_url: 'not-a-url',
        },
      };

      const result = await publisher.publishMessage(invalidMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message validation failed');
    });

    it('should handle very large messages', async () => {
      const largeMessage = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'a'.repeat(50000), // 50KB query
          base_url: 'https://example.com',
        },
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publishMessage(largeMessage);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in message content', async () => {
      const specialCharMessage = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find products with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
          base_url: 'https://example.com/path?param=value&other=123#fragment',
        },
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publishMessage(specialCharMessage);

      expect(result.success).toBe(true);
    });
  });

  describe('Trace Context Propagation', () => {
    it('should extract and propagate trace context correctly', async () => {
      const messageWithTrace = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlation_id: 'corr-123',
          source: 'task-manager',
          version: '1.0.0',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publishMessage(messageWithTrace);

      expect(result.success).toBe(true);
      expect(mockKafkaClient.produce).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              headers: expect.objectContaining({
                traceparent: expect.any(Buffer),
                tracestate: expect.any(Buffer),
                correlation_id: expect.any(Buffer),
              }),
            }),
          ]),
        })
      );
    });

    it('should log with trace context when available', async () => {
      const messageWithTrace = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      await publisher.publishMessage(messageWithTrace);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Web crawl request message published successfully',
        expect.objectContaining({
          taskId: messageWithTrace.headers.task_id,
          partition: 0,
          offset: '123',
        })
      );
    });
  });

  describe('Configuration and Environment', () => {
    it('should use correct topic name from configuration', async () => {
      const originalTopic = process.env.WEB_CRAWL_REQUEST_TOPIC;
      process.env.WEB_CRAWL_REQUEST_TOPIC = 'custom-topic-name';

      const customPublisher = new WebCrawlRequestPublisher(mockKafkaClient, mockLogger);
      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      await customPublisher.publishMessage(mockMessage);

      expect(mockKafkaClient.produce).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'custom-topic-name',
        })
      );

      // Clean up
      if (originalTopic) {
        process.env.WEB_CRAWL_REQUEST_TOPIC = originalTopic;
      } else {
        delete process.env.WEB_CRAWL_REQUEST_TOPIC;
      }
    });

    it('should handle missing environment variables gracefully', async () => {
      const originalTopic = process.env.WEB_CRAWL_REQUEST_TOPIC;
      delete process.env.WEB_CRAWL_REQUEST_TOPIC;

      const defaultPublisher = new WebCrawlRequestPublisher(mockKafkaClient, mockLogger);
      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      await defaultPublisher.publishMessage(mockMessage);

      expect(mockKafkaClient.produce).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'requests-web-crawl', // Default topic name
        })
      );

      // Clean up
      if (originalTopic) {
        process.env.WEB_CRAWL_REQUEST_TOPIC = originalTopic;
      }
    });
  });
});
```

## Potential Issues and Mitigations

### 1. Singleton Client Management

**Issue**: Multiple publisher instances might create multiple Kafka clients
**Mitigation**: Use singleton pattern and ensure proper client management

### 2. Message Serialization Errors

**Issue**: JSON serialization might fail for complex objects
**Mitigation**: Proper error handling and validation before serialization

### 3. Trace Context Loss

**Issue**: Trace context might be lost during message preparation
**Mitigation**: Comprehensive trace context extraction and propagation

### 4. Kafka Connection Failures

**Issue**: Kafka client might be disconnected during publishing
**Mitigation**: Connection status checking and retry mechanisms

### 5. Message Validation Performance

**Issue**: Validation might impact publishing performance
**Mitigation**: Efficient validation and optional validation levels

## Success Criteria

- [ ] Publisher uses singleton Kafka client correctly
- [ ] Messages are published with proper trace context
- [ ] Validation errors are handled gracefully
- [ ] Publishing errors are logged with trace context
- [ ] Configuration validation works correctly
- [ ] All unit tests pass
- [ ] Performance impact is minimal
- [ ] Type safety is maintained

## Dependencies

- Jobs 01, 03, 04, 05: Foundation jobs
- Singleton Kafka client implementation
- Web crawl request DTOs
- Kafka topic configuration
- Trace logging utilities

## Estimated Effort

- **Development**: 1.5 days
- **Testing**: 1 day
- **Total**: 2.5 days

## Notes

- This job is critical for web crawl request publishing
- Must use singleton Kafka client as requested
- Trace context propagation is essential for observability
- Error handling should be comprehensive and logged properly
