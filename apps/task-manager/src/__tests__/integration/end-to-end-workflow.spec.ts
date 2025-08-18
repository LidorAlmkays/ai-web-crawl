import 'reflect-metadata';
import { TaskManagerApplication } from '../../app';
import { ApplicationFactory } from '../../application/services/application.factory';
import { logger } from '../../common/utils/logger';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto, WebCrawlTaskUpdateHeaderDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../../api/kafka/dtos/index';
import { kafkaTopicConfig, postgresConfig } from '../../config';

describe('End-to-End Workflow Integration Tests', () => {
  let app: TaskManagerApplication;
  let applicationFactory: ApplicationFactory;
  let kafkaClient: KafkaClient;
  let postgresFactory: PostgresFactory;

  beforeAll(async () => {
    // Initialize factories
    applicationFactory = new ApplicationFactory();
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

  describe('Complete Task Creation Workflow', () => {
    it('should process new task creation end-to-end', async () => {
      // Create test data
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
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

      // Verify task was created in database
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.user_email).toBe(testMessage.user_email);
      expect(task.user_query).toBe(testMessage.user_query);
      expect(task.original_url).toBe(testMessage.original_url);
      expect(task.status).toBe('new');
      expect(task.id).toBeDefined();
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Verify web crawl request was published (check the web crawl request topic)
      // This would require checking the web crawl request topic
      // For now, we'll just verify the task was created successfully
    }, 15000);

    it('should handle task completion workflow', async () => {
      // First create a task
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const pool = postgresFactory.getPool();
      await pool.query(
        `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, status, received_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [taskId, 'test@example.com', 'Find product info', 'https://example.com', 'new', new Date().toISOString()]
      );

      // Send completion message
      const completionHeaders: WebCrawlTaskUpdateHeaderDto = {
        status: 'completed',
        timestamp: new Date().toISOString(),
        task_id: taskId,
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const completionMessage: WebCrawlCompletedTaskMessageDto = {
        user_email: 'test@example.com',
        user_query: 'Find product info',
        crawl_result: 'Product found successfully',
        original_url: 'https://example.com',
      };

      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': 'application/json',
              'traceparent': completionHeaders.traceparent,
              'tracestate': completionHeaders.tracestate,
              'correlation-id': completionHeaders.correlation_id,
            },
            value: JSON.stringify({
              headers: completionHeaders,
              body: completionMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task status was updated
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.status).toBe('completed');
      expect(task.crawl_result).toBe('Product found successfully');
    }, 15000);
  });

  describe('Error Handling Workflow', () => {
    it('should handle task error workflow', async () => {
      // First create a task
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const pool = postgresFactory.getPool();
      await pool.query(
        `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, status, received_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [taskId, 'test@example.com', 'Find product info', 'https://example.com', 'new', new Date().toISOString()]
      );

      // Send error message
      const errorHeaders: WebCrawlTaskUpdateHeaderDto = {
        status: 'error',
        timestamp: new Date().toISOString(),
        task_id: taskId,
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const errorMessage: WebCrawlErrorTaskMessageDto = {
        user_email: 'test@example.com',
        user_query: 'Find product info',
        error: 'Failed to crawl website: Connection timeout',
        original_url: 'https://example.com',
      };

      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': 'application/json',
              'traceparent': errorHeaders.traceparent,
              'tracestate': errorHeaders.tracestate,
              'correlation-id': errorHeaders.correlation_id,
            },
            value: JSON.stringify({
              headers: errorHeaders,
              body: errorMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task status was updated
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.status).toBe('error');
      expect(task.error).toBe('Failed to crawl website: Connection timeout');
    }, 15000);
  });

  describe('UUID Generation Validation', () => {
    it('should generate UUIDs automatically for new tasks', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'uuid-test@example.com',
        user_query: 'Test UUID generation',
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

      // Verify UUID was generated
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      
      // Verify UUID format
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      // Verify UUID is not null or empty
      expect(task.id).toBeTruthy();
      expect(task.id).not.toBe('');
    }, 15000);
  });
});
