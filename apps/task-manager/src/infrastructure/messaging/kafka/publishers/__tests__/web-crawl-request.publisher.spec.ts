import 'reflect-metadata';
import { WebCrawlRequestPublisher, PublishOptions } from '../web-crawl-request.publisher';
import { KafkaClient } from '../../../../../common/clients/kafka-client';
import { WebCrawlRequestMessageDto } from '../../dtos/web-crawl-request.dto';

// Mock Kafka client
jest.mock('../../../../../common/clients/kafka-client');
jest.mock('../../../../../config', () => ({
  kafkaTopicConfig: {
    webCrawlRequest: 'test-web-crawl-topic',
  },
}));

describe('WebCrawlRequestPublisher', () => {
  let publisher: WebCrawlRequestPublisher;
  let mockKafkaClient: jest.Mocked<KafkaClient>;

  beforeEach(() => {
    mockKafkaClient = {
      getInstance: jest.fn().mockReturnThis(),
      isConnected: jest.fn().mockReturnValue(true),
      isConnectedToKafka: jest.fn().mockReturnValue(true),
      getConfig: jest.fn().mockReturnValue({}),
      produce: jest.fn(),
      getMetadata: jest.fn(),
    } as any;

    (KafkaClient.getInstance as jest.Mock).mockReturnValue(mockKafkaClient);

    publisher = new WebCrawlRequestPublisher();
  });

  describe('publish', () => {
    let validMessage: WebCrawlRequestMessageDto;

    beforeEach(() => {
      validMessage = new WebCrawlRequestMessageDto();
      validMessage.headers = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'task-manager',
        version: '1.0.0',
      };
      validMessage.body = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };
    });

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
      expect(result.offset).toBe(0);
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
    });

    it('should handle invalid message validation', async () => {
      const invalidMessage = new WebCrawlRequestMessageDto();
      invalidMessage.headers = {
        task_id: 'invalid-uuid',
      } as any;
      invalidMessage.body = {
        user_email: 'invalid-email',
        user_query: '',
        base_url: 'invalid-url',
      } as any;

      const result = await publisher.publish(invalidMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message validation failed');
      expect(result.topic).toBe('test-web-crawl-topic');

      expect(mockKafkaClient.produce).not.toHaveBeenCalled();
    });

    it('should handle Kafka publishing errors', async () => {
      const kafkaError = new Error('Kafka connection failed');
      mockKafkaClient.produce.mockRejectedValue(kafkaError);

      const result = await publisher.publish(validMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Kafka connection failed');
      expect(result.topic).toBe('test-web-crawl-topic');
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
      expect(result.error).toContain('Message validation failed');
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
      mockKafkaClient.isConnectedToKafka.mockReturnValue(false);

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

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Could not verify topic existence: Metadata retrieval failed');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Kafka client disconnection during publish', async () => {
      const testMessage = new WebCrawlRequestMessageDto();
      testMessage.headers = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        source: 'task-manager',
        version: '1.0.0',
      };
      testMessage.body = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      mockKafkaClient.produce.mockRejectedValue(new Error('Connection lost'));

      const result = await publisher.publish(testMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection lost');
    });

    it('should handle missing trace context gracefully', async () => {
      const messageWithoutTrace = new WebCrawlRequestMessageDto();
      messageWithoutTrace.headers = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        source: 'task-manager',
        version: '1.0.0',
        // No trace context
      };
      messageWithoutTrace.body = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publish(messageWithoutTrace);

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

      const publishPromises = Array.from({ length: 10 }, (_, i) => 
        publisher.publishFromTaskData(
          `123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`, 
          `user${i}@example.com`, 
          `Query ${i}`, 
          'https://example.com'
        )
      );

      const results = await Promise.all(publishPromises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(mockKafkaClient.produce).toHaveBeenCalledTimes(10);
    });
  });

  describe('Message Content Validation', () => {
    it('should handle very large messages', async () => {
      const largeMessage = new WebCrawlRequestMessageDto();
      largeMessage.headers = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        source: 'task-manager',
        version: '1.0.0',
      };
      largeMessage.body = {
        user_email: 'test@example.com',
        user_query: 'a'.repeat(500), // 500 character query (within limits)
        base_url: 'https://example.com',
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publish(largeMessage);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in message content', async () => {
      const specialCharMessage = new WebCrawlRequestMessageDto();
      specialCharMessage.headers = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        source: 'task-manager',
        version: '1.0.0',
      };
      specialCharMessage.body = {
        user_email: 'test@example.com',
        user_query: 'Find products with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        base_url: 'https://example.com/path?param=value&other=123#fragment',
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publish(specialCharMessage);

      expect(result.success).toBe(true);
    });
  });

  describe('Trace Context Propagation', () => {
    it('should extract and propagate trace context correctly', async () => {
      const messageWithTrace = new WebCrawlRequestMessageDto();
      messageWithTrace.headers = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'task-manager',
        version: '1.0.0',
      };
      messageWithTrace.body = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      mockKafkaClient.produce.mockResolvedValue([{ partition: 0, offset: '123', baseOffset: 123 }]);

      const result = await publisher.publish(messageWithTrace);

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
  });
});
