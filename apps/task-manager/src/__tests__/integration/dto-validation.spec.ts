import 'reflect-metadata';
import { TaskManagerApplication } from '../../app';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto, WebCrawlTaskUpdateHeaderDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../../api/kafka/dtos/index';
import { kafkaTopicConfig, postgresConfig } from '../../config';
import { validateDto } from '../../common/utils/validation';
import { TaskType } from '../../common/enums/task-type.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';

describe('DTO Validation Integration Tests', () => {
  let app: TaskManagerApplication;
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

  describe('W3C Trace Header Validation', () => {
    it('should accept valid W3C traceparent format', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid W3C traceparent format', async () => {
      const invalidHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: 'invalid-traceparent-format',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlNewTaskHeaderDto, invalidHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('traceparent must be in W3C format');
    });

    it('should accept valid tracestate within length limit', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value,other=value2',
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      expect(result.isValid).toBe(true);
    });

    it('should reject tracestate exceeding length limit', async () => {
      const longTracestate = 'a'.repeat(513); // 513 characters, exceeding 512 limit
      const invalidHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: longTracestate,
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlNewTaskHeaderDto, invalidHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('tracestate must not exceed 512 characters');
    });

    it('should accept headers without trace context (optional)', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      expect(result.isValid).toBe(true);
    });
  });

  describe('New Task DTO Validation', () => {
    it('should accept valid new task message', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const validMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'valid-test@example.com',
        user_query: 'Valid test query',
        base_url: 'https://example.com',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlNewTaskMessageDto, validMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(true);

      // Send valid message to Kafka
      const topicName = kafkaTopicConfig.taskStatus;
      const kafkaHeaders: Record<string, Buffer> = {
        'content-type': Buffer.from('application/json'),
      };
      
      if (validHeaders.traceparent) {
        kafkaHeaders['traceparent'] = Buffer.from(validHeaders.traceparent);
      }
      if (validHeaders.tracestate) {
        kafkaHeaders['tracestate'] = Buffer.from(validHeaders.tracestate);
      }
      
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: kafkaHeaders,
            value: JSON.stringify({
              headers: validHeaders,
              body: validMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was created
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [validMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.user_email).toBe(validMessage.user_email);
      expect(task.user_query).toBe(validMessage.user_query);
      expect(task.original_url).toBe(validMessage.base_url);
    }, 15000);

    it('should reject invalid email format', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const invalidMessage = {
        user_email: 'invalid-email-format',
        user_query: 'Valid test query',
        base_url: 'https://example.com',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlNewTaskMessageDto, invalidMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(false);
      expect(messageResult.errorMessage).toContain('email');
    });

    it('should reject invalid URL format', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const invalidMessage = {
        user_email: 'valid-test@example.com',
        user_query: 'Valid test query',
        base_url: 'not-a-valid-url',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlNewTaskMessageDto, invalidMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(false);
      expect(messageResult.errorMessage).toContain('url');
    });

    it('should reject empty user query', async () => {
      const validHeaders: WebCrawlNewTaskHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.NEW,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const invalidMessage = {
        user_email: 'valid-test@example.com',
        user_query: '',
        base_url: 'https://example.com',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlNewTaskHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlNewTaskMessageDto, invalidMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(false);
      expect(messageResult.errorMessage).toContain('user_query');
    });
  });

  describe('Task Update DTO Validation', () => {
    it('should accept valid completed task message', async () => {
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

      const validHeaders: WebCrawlTaskUpdateHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        task_id: taskId,
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const validMessage: WebCrawlCompletedTaskMessageDto = {
        user_email: 'test@example.com',
        user_query: 'Find product info',
        base_url: 'https://example.com',
        crawl_result: 'Product found successfully',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlTaskUpdateHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlCompletedTaskMessageDto, validMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(true);

      // Send valid message to Kafka
      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': Buffer.from('application/json'),
              'traceparent': validHeaders.traceparent ? Buffer.from(validHeaders.traceparent) : undefined,
              'tracestate': validHeaders.tracestate ? Buffer.from(validHeaders.tracestate) : undefined,
            },
            value: JSON.stringify({
              headers: validHeaders,
              body: validMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was updated
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);
      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.status).toBe('completed');
    }, 15000);

    it('should accept valid error task message', async () => {
      // First create a task
      const taskId = '123e4567-e89b-12d3-a456-426614174001';
      const pool = postgresFactory.getPool();
      await pool.query(
        `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, status, received_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [taskId, 'test@example.com', 'Find product info', 'https://example.com', 'new', new Date().toISOString()]
      );

      const validHeaders: WebCrawlTaskUpdateHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.ERROR,
        timestamp: new Date().toISOString(),
        task_id: taskId,
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const validMessage: WebCrawlErrorTaskMessageDto = {
        user_email: 'test@example.com',
        user_query: 'Find product info',
        base_url: 'https://example.com',
        error: 'Failed to crawl website: Connection timeout',
      };

      // Validate DTOs
      const headerResult = await validateDto(WebCrawlTaskUpdateHeaderDto, validHeaders);
      const messageResult = await validateDto(WebCrawlErrorTaskMessageDto, validMessage);

      expect(headerResult.isValid).toBe(true);
      expect(messageResult.isValid).toBe(true);

      // Send valid message to Kafka
      const topicName = kafkaTopicConfig.taskStatus;
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: {
              'content-type': Buffer.from('application/json'),
              'traceparent': validHeaders.traceparent ? Buffer.from(validHeaders.traceparent) : undefined,
              'tracestate': validHeaders.tracestate ? Buffer.from(validHeaders.tracestate) : undefined,
            },
            value: JSON.stringify({
              headers: validHeaders,
              body: validMessage,
            }),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify task was updated
      const result = await pool.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);
      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.status).toBe('error');
    }, 15000);

    it('should reject invalid task_id format', async () => {
      const invalidHeaders: WebCrawlTaskUpdateHeaderDto = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        task_id: 'invalid-uuid-format',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlTaskUpdateHeaderDto, invalidHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('task_id');
    });

    it('should reject missing task_id', async () => {
      const invalidHeaders = {
        task_type: TaskType.WEB_CRAWL,
        status: TaskStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        source: 'dto-test',
        version: '1.0.0',
      };

      const result = await validateDto(WebCrawlTaskUpdateHeaderDto, invalidHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('task_id');
    });
  });
});
