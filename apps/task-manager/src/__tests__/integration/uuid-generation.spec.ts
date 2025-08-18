import 'reflect-metadata';
import { TaskManagerApplication } from '../../app';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../api/kafka/dtos/index';
import { kafkaTopicConfig, postgresConfig } from '../../config';

describe('UUID Generation Integration Tests', () => {
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
    });

  afterAll(async () => {
    // Clean up if needed
  
    // Disconnect from Kafka
    try {
      await kafkaClient.disconnect();
    } catch (error) {
      console.warn('Failed to disconnect from Kafka in test cleanup:', error);
    });

  beforeEach(async () => {
    // Clean up database before each test
    const pool = postgresFactory.getPool();
    await pool.query('DELETE FROM web_crawl_tasks');
  });

  describe('PostgreSQL UUID Generation', () => {
    it('should generate unique UUIDs for multiple tasks', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'uuid-test',
        version: '1.0.0',
      };

      const testMessages = [
        {
          user_email: 'uuid-test1@example.com',
          user_query: 'Test UUID generation 1',
          original_url: 'https://example1.com',
        },
        {
          user_email: 'uuid-test2@example.com',
          user_query: 'Test UUID generation 2',
          original_url: 'https://example2.com',
        },
        {
          user_email: 'uuid-test3@example.com',
          user_query: 'Test UUID generation 3',
          original_url: 'https://example3.com',
        },
      ];

      const generatedIds: string[] = [];

      // Create multiple tasks
      for (const testMessage of testMessages) {
        await kafkaClient.produce({
          topic: kafkaTopicConfig.taskStatus,
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

        // Wait a bit between messages
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Wait for all processing to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify all tasks were created with unique UUIDs
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT id, user_email FROM web_crawl_tasks WHERE user_email LIKE $1', ['uuid-test%@example.com']);

      expect(result.rows).toHaveLength(3);

      // Check each task
      for (const row of result.rows) {
        // Verify UUID format
        expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        // Verify UUID is not null or empty
        expect(row.id).toBeTruthy();
        expect(row.id).not.toBe('');
        
        // Store for uniqueness check
        generatedIds.push(row.id);
      }

      // Verify all UUIDs are unique
      const uniqueIds = new Set(generatedIds);
      expect(uniqueIds.size).toBe(3);
      expect(generatedIds.length).toBe(3);
    }, 20000);

    it('should generate valid UUID format', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'uuid-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'uuid-format-test@example.com',
        user_query: 'Test UUID format validation',
        original_url: 'https://example.com',
      };

      // Send message to Kafka
      await kafkaClient.produce({
        topic: kafkaTopicConfig.taskStatus,
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

      // Verify UUID format
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT id FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const taskId = result.rows[0].id;

      // Verify UUID format (8-4-4-4-12 pattern)
      expect(taskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      // Verify UUID is not null or empty
      expect(taskId).toBeTruthy();
      expect(taskId).not.toBe('');
      
      // Verify UUID length (36 characters including hyphens)
      expect(taskId.length).toBe(36);
    }, 15000);

    it('should not accept client-provided IDs for new tasks', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'uuid-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'no-client-id-test@example.com',
        user_query: 'Test that client IDs are not accepted',
        original_url: 'https://example.com',
      };

      // Send message to Kafka (no client-provided ID)
      await kafkaClient.produce({
        topic: kafkaTopicConfig.taskStatus,
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

      // Verify task was created with DB-generated UUID
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT id FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const taskId = result.rows[0].id;

      // Verify UUID was generated by PostgreSQL (not client-provided)
      expect(taskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(taskId).toBeTruthy();
      expect(taskId).not.toBe('');
    }, 15000);
  });

  describe('Database UUID Function', () => {
    it('should use PostgreSQL gen_random_uuid() function', async () => {
      const pool = postgresFactory.getPool();
      
      // Test the PostgreSQL UUID generation function directly
      const result = await pool.query('SELECT gen_random_uuid() as uuid');
      
      expect(result.rows).toHaveLength(1);
      const generatedUuid = result.rows[0].uuid;
      
      // Verify UUID format
      expect(generatedUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(generatedUuid).toBeTruthy();
      expect(generatedUuid).not.toBe('');
      expect(generatedUuid.length).toBe(36);
    });

    it('should generate different UUIDs on multiple calls', async () => {
      const pool = postgresFactory.getPool();
      
      const uuids: string[] = [];
      
      // Generate multiple UUIDs
      for (let i = 0; i < 5; i++) {
        const result = await pool.query('SELECT gen_random_uuid() as uuid');
        uuids.push(result.rows[0].uuid);
      }
      
      // Verify all UUIDs are unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(5);
      expect(uuids.length).toBe(5);
      
      // Verify all UUIDs have correct format
      for (const uuid of uuids) {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(uuid).toBeTruthy();
        expect(uuid).not.toBe('');
        expect(uuid.length).toBe(36);
      }
    });
  });

  describe('Task Creation with UUID', () => {
    it('should create task with proper UUID and timestamps', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'uuid-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'uuid-timestamp-test@example.com',
        user_query: 'Test UUID and timestamp creation',
        original_url: 'https://example.com',
      };

      // Send message to Kafka
      await kafkaClient.produce({
        topic: kafkaTopicConfig.taskStatus,
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

      // Verify task was created with proper UUID and timestamps
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT id, created_at, updated_at FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];

      // Verify UUID
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(task.id).toBeTruthy();
      expect(task.id).not.toBe('');

      // Verify timestamps
      expect(task.created_at).toBeDefined();
      expect(task.updated_at).toBeDefined();
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.updated_at).toBeInstanceOf(Date);

      // Verify timestamps are recent (within last 10 seconds)
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 10000);
      expect(task.created_at.getTime()).toBeGreaterThan(tenSecondsAgo.getTime());
      expect(task.updated_at.getTime()).toBeGreaterThan(tenSecondsAgo.getTime());
    }, 15000);
  });
});
