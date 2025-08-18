import 'reflect-metadata';
import { TaskManagerApplication } from '../../app';
import { KafkaClient } from '../../common/clients/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../api/kafka/dtos/index';
import { kafkaTopicConfig, postgresConfig } from '../../config';

describe('Performance Integration Tests', () => {
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

  describe('Concurrent Task Creation', () => {
    it('should handle multiple concurrent task creations', async () => {
      const concurrentTasks = 10;
      const startTime = Date.now();

      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'performance-test',
        version: '1.0.0',
      };

      const promises = [];

      // Create multiple concurrent tasks
      for (let i = 0; i < concurrentTasks; i++) {
        const testMessage: WebCrawlNewTaskMessageDto = {
          user_email: `concurrent-test${i}@example.com`,
          user_query: `Concurrent test query ${i}`,
          original_url: `https://example${i}.com`,
        };

        const promise = kafkaClient.produce({
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

        promises.push(promise);
      }

      // Wait for all messages to be sent
      await Promise.all(promises);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all tasks were created
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT COUNT(*) as count FROM web_crawl_tasks WHERE user_email LIKE $1', ['concurrent-test%@example.com']);

      expect(result.rows[0].count).toBe(concurrentTasks);

      // Performance assertion: should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds

      console.log(`Created ${concurrentTasks} concurrent tasks in ${totalTime}ms`);
    }, 20000);

    it('should handle rapid sequential task creations', async () => {
      const sequentialTasks = 20;
      const startTime = Date.now();

      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'performance-test',
        version: '1.0.0',
      };

      // Create tasks sequentially
      for (let i = 0; i < sequentialTasks; i++) {
        const testMessage: WebCrawlNewTaskMessageDto = {
          user_email: `sequential-test${i}@example.com`,
          user_query: `Sequential test query ${i}`,
          original_url: `https://example${i}.com`,
        };

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

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 8000));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all tasks were created
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT COUNT(*) as count FROM web_crawl_tasks WHERE user_email LIKE $1', ['sequential-test%@example.com']);

      expect(result.rows[0].count).toBe(sequentialTasks);

      // Performance assertion: should complete within reasonable time
      expect(totalTime).toBeLessThan(15000); // 15 seconds

      console.log(`Created ${sequentialTasks} sequential tasks in ${totalTime}ms`);
    }, 25000);
  });

  describe('Database Performance', () => {
    it('should handle database queries efficiently', async () => {
      // First create some test data
      const pool = postgresFactory.getPool();
      const testTasks = 50;

      for (let i = 0; i < testTasks; i++) {
        await pool.query(
          `
          INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, status, received_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4)
        `,
          [`db-perf-test${i}@example.com`, `Test query ${i}`, `https://example${i}.com`, 'new', new Date().toISOString()]
        );
      }

      // Test query performance
      const startTime = Date.now();
      
      const result = await pool.query('SELECT COUNT(*) as count FROM web_crawl_tasks WHERE user_email LIKE $1', ['db-perf-test%@example.com']);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.rows[0].count).toBe(testTasks);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Database query completed in ${queryTime}ms`);
    });

    it('should handle UUID generation efficiently', async () => {
      const pool = postgresFactory.getPool();
      const uuidsToGenerate = 100;
      const startTime = Date.now();

      const uuids: string[] = [];

      for (let i = 0; i < uuidsToGenerate; i++) {
        const result = await pool.query('SELECT gen_random_uuid() as uuid');
        uuids.push(result.rows[0].uuid);
      }

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      // Verify all UUIDs are unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(uuidsToGenerate);

      // Performance assertion: should generate UUIDs quickly
      expect(generationTime).toBeLessThan(2000); // 2 seconds for 100 UUIDs

      console.log(`Generated ${uuidsToGenerate} UUIDs in ${generationTime}ms`);
    });
  });

  describe('Kafka Performance', () => {
    it('should handle Kafka message production efficiently', async () => {
      const messagesToSend = 25;
      const startTime = Date.now();

      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'kafka-perf-test',
        version: '1.0.0',
      };

      const promises = [];

      for (let i = 0; i < messagesToSend; i++) {
        const testMessage: WebCrawlNewTaskMessageDto = {
          user_email: `kafka-perf-test${i}@example.com`,
          user_query: `Kafka performance test query ${i}`,
          original_url: `https://example${i}.com`,
        };

        const promise = kafkaClient.produce({
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

        promises.push(promise);
      }

      // Wait for all messages to be sent
      await Promise.all(promises);

      const endTime = Date.now();
      const productionTime = endTime - startTime;

      // Performance assertion: should send messages quickly
      expect(productionTime).toBeLessThan(5000); // 5 seconds for 25 messages

      console.log(`Produced ${messagesToSend} Kafka messages in ${productionTime}ms`);
    }, 15000);
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during task creation', async () => {
      const initialMemory = process.memoryUsage();
      
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'memory-test',
        version: '1.0.0',
      };

      // Create multiple tasks
      for (let i = 0; i < 10; i++) {
        const testMessage: WebCrawlNewTaskMessageDto = {
          user_email: `memory-test${i}@example.com`,
          user_query: `Memory test query ${i}`,
          original_url: `https://example${i}.com`,
        };

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

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const finalMemory = process.memoryUsage();

      // Verify tasks were created
      const pool = postgresFactory.getPool();
      const result = await pool.query('SELECT COUNT(*) as count FROM web_crawl_tasks WHERE user_email LIKE $1', ['memory-test%@example.com']);
      expect(result.rows[0].count).toBe(10);

      // Memory usage should be reasonable (not a strict assertion as memory can vary)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Should not have excessive memory growth
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    }, 20000);
  });

  describe('Response Time', () => {
    it('should respond to task creation within acceptable time', async () => {
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'response-time-test',
        version: '1.0.0',
      };

      const testMessage: WebCrawlNewTaskMessageDto = {
        user_email: 'response-time-test@example.com',
        user_query: 'Test response time',
        original_url: 'https://example.com',
      };

      const startTime = Date.now();

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

      // Wait for processing with timeout
      let taskCreated = false;
      const maxWaitTime = 5000; // 5 seconds
      const checkInterval = 100; // Check every 100ms

      for (let i = 0; i < maxWaitTime / checkInterval; i++) {
        const pool = postgresFactory.getPool();
        const result = await pool.query('SELECT COUNT(*) as count FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);
        
        if (result.rows[0].count > 0) {
          taskCreated = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(taskCreated).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds

      console.log(`Task creation response time: ${responseTime}ms`);
    }, 10000);
  });
});
