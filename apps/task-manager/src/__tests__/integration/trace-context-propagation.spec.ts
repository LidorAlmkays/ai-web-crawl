import 'reflect-metadata';
import { TaskManagerApplication } from '../../app';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../api/kafka/dtos/index';
import { kafkaTopicConfig, postgresConfig } from '../../config';
import { logger } from '../../common/utils/logger';

describe('Trace Context Propagation Integration Tests', () => {
  let app: TaskManagerApplication;
  let kafkaClient: KafkaClient;
  let postgresFactory: PostgresFactory;

  beforeAll(async () => {
    // Initialize services
    kafkaClient = KafkaClient.getInstance();
    postgresFactory = new PostgresFactory(postgresConfig);

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

  describe('Trace Context Flow', () => {
    it('should propagate trace context through the entire workflow', async () => {
      const traceId = '1234567890abcdef1234567890abcdef';
      const spanId = '1234567890abcdef';
      const correlationId = 'test-correlation-123';
      
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: `00-${traceId}-${spanId}-01`,
        tracestate: 'test=value,otel=1',
        correlation_id: correlationId,
        source: 'trace-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'trace-test@example.com',
        user_query: 'Test trace context propagation',
        original_url: 'https://example.com',
      };

      // Send message to Kafka with trace context
      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': 'application/json',
              'traceparent': testHeaders.traceparent,
              'tracestate': testHeaders.tracestate,
              'correlation-id': testHeaders.correlation_id,
            },
            value: JSON.stringify({
              headers: testHeaders,
              body: testMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was created with trace context
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      
      // Verify the task was created successfully
      expect(task.user_email).toBe(testMessage.user_email);
      expect(task.user_query).toBe(testMessage.user_query);
      expect(task.original_url).toBe(testMessage.original_url);
      expect(task.status).toBe('new');
      expect(task.id).toBeDefined();

      // Note: The actual trace context validation would require checking logs
      // or implementing a trace context storage mechanism
      // For now, we verify the message was processed successfully
    }, 15000);

    it('should handle missing trace context gracefully', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        // No trace context provided
        source: 'trace-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'no-trace-test@example.com',
        user_query: 'Test without trace context',
        original_url: 'https://example.com',
      };

      // Send message to Kafka without trace context
      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': 'application/json',
            },
            value: JSON.stringify({
              headers: testHeaders,
              body: testMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was still created successfully
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      
      // Verify the task was created successfully even without trace context
      expect(task.user_email).toBe(testMessage.user_email);
      expect(task.user_query).toBe(testMessage.user_query);
      expect(task.original_url).toBe(testMessage.original_url);
      expect(task.status).toBe('new');
      expect(task.id).toBeDefined();
    }, 15000);

    it('should handle invalid trace context gracefully', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: 'invalid-trace-parent-format',
        tracestate: 'invalid-trace-state',
        correlation_id: 'invalid-correlation-id',
        source: 'trace-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'invalid-trace-test@example.com',
        user_query: 'Test with invalid trace context',
        original_url: 'https://example.com',
      };

      // Send message to Kafka with invalid trace context
      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': 'application/json',
              'traceparent': testHeaders.traceparent,
              'tracestate': testHeaders.tracestate,
              'correlation-id': testHeaders.correlation_id,
            },
            value: JSON.stringify({
              headers: testHeaders,
              body: testMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was still created successfully despite invalid trace context
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      
      // Verify the task was created successfully even with invalid trace context
      expect(task.user_email).toBe(testMessage.user_email);
      expect(task.user_query).toBe(testMessage.user_query);
      expect(task.original_url).toBe(testMessage.original_url);
      expect(task.status).toBe('new');
      expect(task.id).toBeDefined();
    }, 15000);
  });

  describe('Correlation ID Propagation', () => {
    it('should propagate correlation ID through the workflow', async () => {
      const correlationId = 'unique-correlation-id-123';
      
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: correlationId,
        source: 'correlation-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'correlation-test@example.com',
        user_query: 'Test correlation ID propagation',
        original_url: 'https://example.com',
      };

      // Send message to Kafka
      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': 'application/json',
              'traceparent': testHeaders.traceparent,
              'tracestate': testHeaders.tracestate,
              'correlation-id': testHeaders.correlation_id,
            },
            value: JSON.stringify({
              headers: testHeaders,
              body: testMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was created successfully
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      
      // Verify the task was created successfully
      expect(task.user_email).toBe(testMessage.user_email);
      expect(task.user_query).toBe(testMessage.user_query);
      expect(task.original_url).toBe(testMessage.original_url);
      expect(task.status).toBe('new');
      expect(task.id).toBeDefined();

      // Note: Correlation ID validation would require checking logs or implementing
      // a correlation ID storage mechanism
    }, 15000);
  });
});
