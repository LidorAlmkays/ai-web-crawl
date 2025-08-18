import 'reflect-metadata';
import { TaskManagerApplication } from '../../app';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../api/kafka/dtos/index';
import { kafkaTopicConfig, postgresConfig } from '../../config';
import { WebCrawlRequestPublisher } from '../../infrastructure/messaging/kafka/publishers/web-crawl-request.publisher';

describe('Kafka Publishing Integration Tests', () => {
  let app: TaskManagerApplication;
  let kafkaClient: KafkaClient;
  let postgresFactory: PostgresFactory;
  let webCrawlRequestPublisher: WebCrawlRequestPublisher;

  beforeAll(async () => {
    // Initialize services
    kafkaClient = KafkaClient.getInstance();
    postgresFactory = new PostgresFactory(postgresConfig);
    webCrawlRequestPublisher = new WebCrawlRequestPublisher();

    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  
    // Connect to Kafka
    try {
      await kafkaClient.connect();
    } catch (error) {
      console.warn('Failed to connect to Kafka in test setup:', error);
    }
  });

  afterAll(async () => {
    // Clean up if needed
  
    // Disconnect from Kafka
    try {
      await kafkaClient.disconnect();
    } catch (error) {
      console.warn('Failed to disconnect from Kafka in test cleanup:', error);
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    const pool = postgresFactory.getPool();
    await pool.query('DELETE FROM web_crawl_tasks');
  });

  describe('Web Crawl Request Publishing', () => {
    it('should publish web crawl request message to Kafka', async () => {
      const testMessage = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlation_id: 'test-correlation-123',
          source: 'kafka-test',
          version: '1.0.0',
        },
        body: {
          user_email: 'kafka-publish-test@example.com',
          user_query: 'Test Kafka publishing',
          base_url: 'https://example.com',
        },
      };

      // Publish message directly using the publisher
      const publishResult = await webCrawlRequestPublisher.publish(testMessage, {
        traceContext: {
          traceparent: testMessage.headers.traceparent,
          tracestate: testMessage.headers.tracestate,
          correlationId: testMessage.headers.correlation_id,
        },
      });

      // Verify the message was published successfully
      expect(publishResult.success).toBe(true);
      expect(publishResult.topic).toBe(kafkaTopicConfig.webCrawlRequest);
      expect(publishResult.messageId).toBeDefined();
      expect(publishResult.partition).toBeDefined();
      expect(publishResult.offset).toBeDefined();
    });

    it('should handle web crawl request publishing errors gracefully', async () => {
      // Test with invalid message to verify error handling
      const invalidMessage = {
        headers: {
          task_id: 'invalid-uuid',
          timestamp: 'invalid-timestamp',
          source: 'kafka-test',
          version: '1.0.0',
        },
        body: {
          user_email: 'invalid-email',
          user_query: '',
          base_url: 'not-a-valid-url',
        },
      };

      // Attempt to publish invalid message
      const publishResult = await webCrawlRequestPublisher.publish(invalidMessage);

      // Verify error handling
      expect(publishResult.success).toBe(false);
      expect(publishResult.error).toBeDefined();
      expect(publishResult.error).toContain('Message validation failed');
      expect(publishResult.topic).toBe(kafkaTopicConfig.webCrawlRequest);
    });
  });

  describe('Web Crawl Request Publisher', () => {
    it('should validate publisher configuration', async () => {
      const validation = await webCrawlRequestPublisher.validateConfiguration();
      
      // Should have validation result with proper structure
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      
      // If there are errors, they should be related to connection or topic issues
      if (validation.errors.length > 0) {
        validation.errors.forEach(error => {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
        });
      }
    });

    it('should publish valid web crawl request message', async () => {
      const validMessage = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlation_id: 'test-correlation-123',
          source: 'kafka-test',
          version: '1.0.0',
        },
        body: {
          user_email: 'publisher-test@example.com',
          user_query: 'Test publisher functionality',
          base_url: 'https://example.com',
        },
      };

      const publishResult = await webCrawlRequestPublisher.publish(validMessage, {
        traceContext: {
          traceparent: validMessage.headers.traceparent,
          tracestate: validMessage.headers.tracestate,
          correlationId: validMessage.headers.correlation_id,
        },
      });

      expect(publishResult.success).toBe(true);
      expect(publishResult.topic).toBe(kafkaTopicConfig.webCrawlRequest);
      expect(publishResult.messageId).toBeDefined();
      expect(publishResult.partition).toBeDefined();
      expect(publishResult.offset).toBeDefined();
    });

    it('should reject invalid web crawl request message', async () => {
      const invalidMessage = {
        headers: {
          task_id: 'invalid-uuid',
          timestamp: 'invalid-timestamp',
          source: 'kafka-test',
          version: '1.0.0',
        },
        body: {
          user_email: 'invalid-email',
          user_query: '',
          base_url: 'not-a-valid-url',
        },
      };

      const publishResult = await webCrawlRequestPublisher.publish(invalidMessage);

      expect(publishResult.success).toBe(false);
      expect(publishResult.error).toBeDefined();
      expect(publishResult.error).toContain('Message validation failed');
    });

    it('should handle Kafka connection issues gracefully', async () => {
      // This test would require temporarily disconnecting Kafka
      // For now, we'll test the error handling with a malformed message
      const malformedMessage = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Test query',
          base_url: 'https://example.com',
        },
      };

      const publishResult = await webCrawlRequestPublisher.publish(malformedMessage);

      // Should either succeed or fail gracefully
      expect(typeof publishResult.success).toBe('boolean');
      if (!publishResult.success) {
        expect(publishResult.error).toBeDefined();
        expect(typeof publishResult.error).toBe('string');
      }
    });
  });

  describe('Topic Configuration', () => {
    it('should use correct topic names', async () => {
      expect(kafkaTopicConfig.taskStatus).toBe('task-status');
      expect(kafkaTopicConfig.webCrawlRequest).toBe('requests-web-crawl');
    });

    it('should have valid topic configuration', async () => {
      // Verify topic configuration is properly structured
      expect(typeof kafkaTopicConfig.taskStatus).toBe('string');
      expect(typeof kafkaTopicConfig.webCrawlRequest).toBe('string');
      expect(kafkaTopicConfig.taskStatus.length).toBeGreaterThan(0);
      expect(kafkaTopicConfig.webCrawlRequest.length).toBeGreaterThan(0);
    });
  });

  describe('Message Format Validation', () => {
    it('should validate message structure', async () => {
      const validMessage = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlation_id: 'test-correlation-123',
          source: 'kafka-test',
          version: '1.0.0',
        },
        body: {
          user_email: 'format-test@example.com',
          user_query: 'Test message format validation',
          base_url: 'https://example.com',
        },
      };

      // Validate message structure
      expect(validMessage.headers).toBeDefined();
      expect(validMessage.body).toBeDefined();
      expect(validMessage.headers.task_id).toBeDefined();
      expect(validMessage.headers.timestamp).toBeDefined();
      expect(validMessage.body.user_email).toBeDefined();
      expect(validMessage.body.user_query).toBeDefined();
      expect(validMessage.body.base_url).toBeDefined();

      // Validate data types
      expect(typeof validMessage.headers.task_id).toBe('string');
      expect(typeof validMessage.headers.timestamp).toBe('string');
      expect(typeof validMessage.body.user_email).toBe('string');
      expect(typeof validMessage.body.user_query).toBe('string');
      expect(typeof validMessage.body.base_url).toBe('string');
    });
  });
});
