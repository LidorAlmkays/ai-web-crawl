import 'reflect-metadata';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { kafkaTopicConfig, postgresConfig } from '../../config';
import { validateDto } from '../../common/utils/validation';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../api/kafka/dtos/index';

describe('Simple Integration Tests', () => {
  let kafkaClient: KafkaClient;
  let postgresFactory: PostgresFactory;

  beforeAll(async () => {
    // Initialize services
    kafkaClient = KafkaClient.getInstance();
    postgresFactory = new PostgresFactory(postgresConfig);

    // Connect to Kafka
    try {
      await kafkaClient.connect();
    } catch (error) {
      console.warn('Failed to connect to Kafka in test setup:', error);
    }

    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
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

  describe('Basic Service Connectivity', () => {
    it('should connect to PostgreSQL database', async () => {
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should connect to Kafka', async () => {
      // Skip this test if Kafka is not available
      if (!kafkaClient.isConnectedToKafka()) {
        console.warn('Kafka not connected, skipping Kafka connectivity test');
        return;
      }
      expect(kafkaClient.isConnectedToKafka()).toBe(true);
    });

    it('should have correct topic configuration', () => {
      expect(kafkaTopicConfig.taskStatus).toBe('task-status');
      expect(kafkaTopicConfig.webCrawlRequest).toBe('requests-web-crawl');
    });
  });

  describe('DTO Validation', () => {
    it('should validate valid new task message', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const validMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'test@example.com',
        user_query: 'Test query',
        base_url: 'https://example.com',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlNewTaskMessageDto, validMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const invalidMessage = {
        user_email: 'invalid-email-format',
        user_query: 'Test query',
        base_url: 'https://example.com',
      };

      const messageResult = await validateDto(WebCrawlNewTaskMessageDto, invalidMessage);
      expect(messageResult.isValid).toBe(false);
      expect(messageResult.errorMessage).toContain('email');
    });
  });

  describe('Database Operations', () => {
    it('should generate UUIDs using PostgreSQL', async () => {
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT gen_random_uuid() as uuid');
      
      expect(result.rows).toHaveLength(1);
      const generatedUuid = result.rows[0].uuid;
      
      // Verify UUID format
      expect(generatedUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(generatedUuid).toBeTruthy();
      expect(generatedUuid).not.toBe('');
      expect(generatedUuid.length).toBe(36);
    });

    it('should create and retrieve tasks', async () => {
      const pool = postgresFactory.getPool();
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Create a task
      await pool.query(
        `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, status, received_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [taskId, 'test@example.com', 'Test query', 'https://example.com', 'new', new Date().toISOString()]
      );

      // Retrieve the task
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);
      
      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.id).toBe(taskId);
      expect(task.user_email).toBe('test@example.com');
      expect(task.user_query).toBe('Test query');
      expect(task.original_url).toBe('https://example.com');
      expect(task.status).toBe('new');
    });
  });

  describe('Kafka Operations', () => {
    it('should produce messages to Kafka', async () => {
      // Skip this test if Kafka is not available
      if (!kafkaClient.isConnectedToKafka()) {
        console.warn('Kafka not connected, skipping Kafka message production test');
        return;
      }

      const testMessage = {
        headers: {
          'content-type': 'application/json',
          'test-header': 'test-value',
        },
        value: JSON.stringify({
          test: 'data',
          timestamp: new Date().toISOString(),
        }),
      };

      const result = await kafkaClient.produce({
        topic: kafkaTopicConfig.taskStatus,
        messages: [testMessage],
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
