import { KafkaMessageGenerator } from '../../../test-utils/kafka-message-generator';
import { NewTaskHandler } from '../handlers/task-status/new-task.handler';
import { TaskStatusHeaderDto } from '../dtos/task-status-header.dto';
import { NewTaskStatusMessageDto } from '../dtos/new-task-status-message.dto';
import { validateDto } from '../../../common/utils/validation';
import { IWebCrawlTaskManagerPort } from '../../../application/ports/web-crawl-task-manager.port';

describe('End-to-End Message Processing Flow', () => {
  let newTaskHandler: NewTaskHandler;
  let mockService: jest.Mocked<IWebCrawlTaskManagerPort>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock service
    mockService = {
      createWebCrawlTask: jest.fn(),
    } as any;

    // Create handler with mocked dependencies
    newTaskHandler = new NewTaskHandler(mockService);
  });

  describe('Complete Message Processing Flow', () => {
    it('should process a valid message end-to-end successfully', async () => {
      // Generate a valid Kafka message
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        status: 'new',
        url: 'https://example.com',
        metadata: { test: true },
      });

      // Mock successful service response
      const mockTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        originalUrl: 'https://example.com',
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: { test: true },
      };
      mockService.createWebCrawlTask.mockResolvedValue(mockTask);

      // Extract and validate headers
      const headerData = {
        id: validMessage.headers.id.toString(),
        task_type: validMessage.headers.task_type.toString(),
        status: validMessage.headers.status.toString(),
        timestamp: validMessage.headers.timestamp.toString(),
      };
      const validatedHeaders = await validateDto(
        TaskStatusHeaderDto,
        headerData
      );
      expect(validatedHeaders.isValid).toBe(true);

      // Extract and validate message body
      const bodyData = JSON.parse(validMessage.value.toString());
      const validatedBody = await validateDto(
        NewTaskStatusMessageDto,
        bodyData
      );
      expect(validatedBody.isValid).toBe(true);

      // Process the message through the handler
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was called with correct parameters
      expect(mockService.createWebCrawlTask).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        expect.any(String), // userEmail
        expect.any(String), // userQuery
        expect.any(String) // baseUrl
      );
    });

    it('should handle message with invalid headers gracefully', async () => {
      // Generate a message with invalid UUID in header
      const invalidMessage = KafkaMessageGenerator.generateInvalidUuidMessage();

      // Process the message through the handler
      await newTaskHandler.process({
        topic: invalidMessage.topic,
        partition: invalidMessage.partition,
        message: {
          key: invalidMessage.key,
          value: invalidMessage.value,
          headers: invalidMessage.headers,
          offset: invalidMessage.offset,
          timestamp: invalidMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was not called
      expect(mockService.createWebCrawlTask).not.toHaveBeenCalled();
    });

    it('should handle message with invalid body gracefully', async () => {
      // Generate a message with missing required fields
      const invalidMessage =
        KafkaMessageGenerator.generateMissingFieldsMessage();

      // Process the message through the handler
      await newTaskHandler.process({
        topic: invalidMessage.topic,
        partition: invalidMessage.partition,
        message: {
          key: invalidMessage.key,
          value: invalidMessage.value,
          headers: invalidMessage.headers,
          offset: invalidMessage.offset,
          timestamp: invalidMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was not called
      expect(mockService.createWebCrawlTask).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      // Generate a message with malformed JSON
      const malformedMessage =
        KafkaMessageGenerator.generateMalformedJsonMessage();

      // Process the message through the handler
      await newTaskHandler.process({
        topic: malformedMessage.topic,
        partition: malformedMessage.partition,
        message: {
          key: malformedMessage.key,
          value: malformedMessage.value,
          headers: malformedMessage.headers,
          offset: malformedMessage.offset,
          timestamp: malformedMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was not called
      expect(mockService.createWebCrawlTask).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database errors gracefully', async () => {
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'new',
        url: 'https://example.com',
      });

      // Mock database error
      mockService.createWebCrawlTask.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Process the message through the handler
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was called but failed
      expect(mockService.createWebCrawlTask).toHaveBeenCalled();
    });

    it('should handle duplicate UUID errors gracefully', async () => {
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'new',
        url: 'https://example.com',
      });

      // Mock duplicate UUID error
      mockService.createWebCrawlTask.mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      // Process the message through the handler
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was called but failed
      expect(mockService.createWebCrawlTask).toHaveBeenCalled();
    });
  });

  describe('Message Reprocessing', () => {
    it('should handle message reprocessing after failure', async () => {
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440004',
        status: 'new',
        url: 'https://example.com',
      });

      // First attempt fails
      mockService.createWebCrawlTask.mockRejectedValueOnce(
        new Error('Temporary database error')
      );

      // Process the message - should fail
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Second attempt succeeds
      const mockTask = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        originalUrl: 'https://example.com',
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: {},
      };
      mockService.createWebCrawlTask.mockResolvedValueOnce(mockTask);

      // Process the message again - should succeed
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was called twice
      expect(mockService.createWebCrawlTask).toHaveBeenCalledTimes(2);
    });

    it('should handle batch message processing', async () => {
      const batchMessages = KafkaMessageGenerator.generateBatchMessages(3);

      // Mock successful service responses
      for (let i = 0; i < batchMessages.length; i++) {
        const mockTask = {
          id: batchMessages[i].headers.id.toString(),
          userEmail: 'test@example.com',
          userQuery: 'test query',
          originalUrl: `https://example${i}.com`,
          status: 'new',
          receivedAt: new Date(),
          startedAt: null,
          completedAt: null,
          errorMessage: null,
          result: null,
          metadata: { batchIndex: i },
        };
        mockService.createWebCrawlTask.mockResolvedValueOnce(mockTask);
      }

      // Process all messages
      for (const message of batchMessages) {
        await newTaskHandler.process({
          topic: message.topic,
          partition: message.partition,
          message: {
            key: message.key,
            value: message.value,
            headers: message.headers,
            offset: message.offset,
            timestamp: message.timestamp,
          },
          heartbeat: jest.fn(),
          pause: jest.fn(),
        });
      }

      // Verify all messages were processed successfully
      expect(mockService.createWebCrawlTask).toHaveBeenCalledTimes(3);
    });
  });

  describe('UUID Tracking', () => {
    it('should track UUID throughout the processing pipeline', async () => {
      const taskId = '550e8400-e29b-41d4-a716-446655440005';
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId,
        status: 'new',
        url: 'https://example.com',
      });

      const mockTask = {
        id: taskId,
        userEmail: 'test@example.com',
        userQuery: 'test query',
        originalUrl: 'https://example.com',
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: {},
      };
      mockService.createWebCrawlTask.mockResolvedValue(mockTask);

      // Process the message
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify UUID was tracked correctly
      expect(mockService.createWebCrawlTask).toHaveBeenCalledWith(
        taskId,
        expect.any(String), // userEmail
        expect.any(String), // userQuery
        expect.any(String) // baseUrl
      );
    });

    it('should handle UUID extraction errors', async () => {
      const invalidMessage =
        KafkaMessageGenerator.generateMissingHeadersMessage();

      // Process the message
      await newTaskHandler.process({
        topic: invalidMessage.topic,
        partition: invalidMessage.partition,
        message: {
          key: invalidMessage.key,
          value: invalidMessage.value,
          headers: invalidMessage.headers,
          offset: invalidMessage.offset,
          timestamp: invalidMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify service was not called
      expect(mockService.createWebCrawlTask).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Load', () => {
    it('should handle multiple concurrent messages', async () => {
      const concurrentMessages =
        KafkaMessageGenerator.generateBatchMessages(10);
      const promises = [];

      // Mock successful service responses
      for (let i = 0; i < concurrentMessages.length; i++) {
        const mockTask = {
          id: concurrentMessages[i].headers.id.toString(),
          userEmail: 'test@example.com',
          userQuery: 'test query',
          originalUrl: `https://concurrent${i}.com`,
          status: 'new',
          receivedAt: new Date(),
          startedAt: null,
          completedAt: null,
          errorMessage: null,
          result: null,
          metadata: { concurrentIndex: i },
        };
        mockService.createWebCrawlTask.mockResolvedValueOnce(mockTask);
      }

      // Process all messages concurrently
      for (const message of concurrentMessages) {
        promises.push(
          newTaskHandler.process({
            topic: message.topic,
            partition: message.partition,
            message: {
              key: message.key,
              value: message.value,
              headers: message.headers,
              offset: message.offset,
              timestamp: message.timestamp,
            },
            heartbeat: jest.fn(),
            pause: jest.fn(),
          })
        );
      }

      const results = await Promise.all(promises);

      // Verify all messages were processed successfully
      expect(results).toHaveLength(10);
      expect(mockService.createWebCrawlTask).toHaveBeenCalledTimes(10);
    });

    it('should handle large message payloads', async () => {
      const largeMetadata = {
        data: 'x'.repeat(1000),
        nested: {
          deep: 'y'.repeat(500),
        },
      };

      const largeMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440006',
        status: 'new',
        url: 'https://example.com',
        metadata: largeMetadata,
      });

      const mockTask = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        originalUrl: 'https://example.com',
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: largeMetadata,
      };
      mockService.createWebCrawlTask.mockResolvedValue(mockTask);

      // Process the large message
      await newTaskHandler.process({
        topic: largeMessage.topic,
        partition: largeMessage.partition,
        message: {
          key: largeMessage.key,
          value: largeMessage.value,
          headers: largeMessage.headers,
          offset: largeMessage.offset,
          timestamp: largeMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify large metadata was handled correctly
      expect(mockService.createWebCrawlTask).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440006',
        expect.any(String), // userEmail
        expect.any(String), // userQuery
        expect.any(String) // baseUrl
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle messages with special characters in URLs', async () => {
      const specialUrl =
        'https://example.com/path?param=value&another=test#fragment';
      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440007',
        status: 'new',
        url: specialUrl,
      });

      const mockTask = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        originalUrl: specialUrl,
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: {},
      };
      mockService.createWebCrawlTask.mockResolvedValue(mockTask);

      // Process the message
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify special URL was handled correctly
      expect(mockService.createWebCrawlTask).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440007',
        expect.any(String), // userEmail
        expect.any(String), // userQuery
        expect.any(String) // baseUrl
      );
    });

    it('should handle messages with unicode characters in metadata', async () => {
      const unicodeMetadata = {
        title: 'Hello 世界 🌍',
        description: 'Test with emojis 🚀 📱 ��',
        tags: ['test', 'unicode', '世界'],
      };

      const validMessage = KafkaMessageGenerator.generateValidMessage({
        taskId: '550e8400-e29b-41d4-a716-446655440008',
        status: 'new',
        url: 'https://example.com',
        metadata: unicodeMetadata,
      });

      const mockTask = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        originalUrl: 'https://example.com',
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: unicodeMetadata,
      };
      mockService.createWebCrawlTask.mockResolvedValue(mockTask);

      // Process the message
      await newTaskHandler.process({
        topic: validMessage.topic,
        partition: validMessage.partition,
        message: {
          key: validMessage.key,
          value: validMessage.value,
          headers: validMessage.headers,
          offset: validMessage.offset,
          timestamp: validMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify unicode metadata was handled correctly
      expect(mockService.createWebCrawlTask).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440008',
        expect.any(String), // userEmail
        expect.any(String), // userQuery
        expect.any(String) // baseUrl
      );
    });

    it('should validate user-provided data correctly', async () => {
      // Test with the exact data the user provided
      const userMessage = KafkaMessageGenerator.generateUserDataMessage();

      const mockTask = {
        id: userMessage.headers.id.toString(),
        userEmail: 'lidorTestRun1@gmail.com',
        userQuery: 'im testing this project',
        originalUrl: 'http://localhost:4912/test.com',
        status: 'new',
        receivedAt: new Date(),
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        result: null,
        metadata: {},
      };
      mockService.createWebCrawlTask.mockResolvedValue(mockTask);

      // Process the message
      await newTaskHandler.process({
        topic: userMessage.topic,
        partition: userMessage.partition,
        message: {
          key: userMessage.key,
          value: userMessage.value,
          headers: userMessage.headers,
          offset: userMessage.offset,
          timestamp: userMessage.timestamp,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      });

      // Verify user data was processed correctly
      expect(mockService.createWebCrawlTask).toHaveBeenCalledWith(
        userMessage.headers.id.toString(),
        'lidorTestRun1@gmail.com',
        'im testing this project',
        'http://localhost:4912/test.com'
      );
    });
  });
});
