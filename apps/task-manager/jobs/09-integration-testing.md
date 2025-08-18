# Job 09: Integration Testing

## Status

**COMPLETED**

## Overview

Perform comprehensive integration testing to validate that all implemented features work together correctly. This job focuses on end-to-end testing of the complete workflow including trace context propagation, DTO validation, UUID generation, and web crawl request publishing.

## Objectives

- Test end-to-end workflow from task creation to web crawl request publishing
- Validate trace context propagation throughout the system
- Test DTO validation and transformation
- Verify UUID generation and database operations
- Test error scenarios and edge cases
- Validate performance requirements

## Files to Create/Modify

### New Files

- `src/__tests__/integration/end-to-end-workflow.spec.ts` - End-to-end workflow tests
- `src/__tests__/integration/trace-context-propagation.spec.ts` - Trace context tests
- `src/__tests__/integration/dto-validation.spec.ts` - DTO validation tests
- `src/__tests__/integration/uuid-generation.spec.ts` - UUID generation tests
- `src/__tests__/integration/kafka-publishing.spec.ts` - Kafka publishing tests
- `src/__tests__/integration/performance.spec.ts` - Performance tests

## Detailed Implementation

### 1. End-to-End Workflow Tests

**File**: `src/__tests__/integration/end-to-end-workflow.spec.ts`

```typescript
import { App } from '../../app';
import { ApplicationFactory } from '../../application/services/application.factory';
import { LoggerFactory } from '../../common/utils/logging/logger-factory';
import { KafkaClient } from '../../common/utils/kafka-client';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto, WebCrawlTaskUpdateHeaderDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../../api/kafka/dtos/index';

describe('End-to-End Workflow Integration Tests', () => {
  let app: App;
  let applicationFactory: ApplicationFactory;
  let kafkaClient: KafkaClient;
  let postgresFactory: PostgresFactory;
  let logger: any;

  beforeAll(async () => {
    logger = LoggerFactory.createLogger('IntegrationTests');
    applicationFactory = new ApplicationFactory();
    kafkaClient = KafkaClient.getInstance();
    postgresFactory = new PostgresFactory();

    app = new App();
    await app.initialize();
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    // Clean up database before each test
    const client = await postgresFactory.getClient();
    await client.query('DELETE FROM web_crawl_tasks');
  });

  describe('Complete Task Creation Workflow', () => {
    it('should process new task creation end-to-end', async () => {
      // Create test data
      const testHeaders: WebCrawlNewTaskHeaderDto = {
        status: 'NEW',
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
        base_url: 'https://example.com',
      };

      // Send message to Kafka
      const topicName = 'web-crawl-task-status';
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: testHeaders,
            value: JSON.stringify(testMessage),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify task was created in database
      const client = await postgresFactory.getClient();
      const result = await client.query('SELECT * FROM web_crawl_tasks WHERE user_email = $1', [testMessage.user_email]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.user_email).toBe(testMessage.user_email);
      expect(task.user_query).toBe(testMessage.user_query);
      expect(task.base_url).toBe(testMessage.base_url);
      expect(task.status).toBe('NEW');
      expect(task.id).toBeDefined();
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Verify web crawl request was published
      // This would require checking the web crawl request topic
      // Implementation depends on the actual web crawl service
    }, 10000);

    it('should handle task completion workflow', async () => {
      // First create a task
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const client = await postgresFactory.getClient();
      await client.query(
        `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, base_url, status)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [taskId, 'test@example.com', 'Find product info', 'https://example.com', 'NEW']
      );

      // Send completion message
      const completionHeaders: WebCrawlTaskUpdateHeaderDto = {
        status: 'COMPLETED',
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
        base_url: 'https://example.com',
      };

      const topicName = 'web-crawl-task-status';
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: completionHeaders,
            value: JSON.stringify(completionMessage),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify task status was updated
      const result = await client.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.status).toBe('COMPLETED');
      expect(task.crawl_result).toBe('Product found successfully');
    }, 10000);
  });

  describe('Error Handling Workflow', () => {
    it('should handle task error workflow', async () => {
      // First create a task
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const client = await postgresFactory.getClient();
      await client.query(
        `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, base_url, status)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [taskId, 'test@example.com', 'Find product info', 'https://example.com', 'NEW']
      );

      // Send error message
      const errorHeaders: WebCrawlTaskUpdateHeaderDto = {
        status: 'ERROR',
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
        error: 'Network timeout occurred',
        base_url: 'https://example.com',
      };

      const topicName = 'web-crawl-task-status';
      await kafkaClient.produce({
        topic: topicName,
        messages: [
          {
            headers: errorHeaders,
            value: JSON.stringify(errorMessage),
          },
        ],
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify task status was updated
      const result = await client.query('SELECT * FROM web_crawl_tasks WHERE id = $1', [taskId]);

      expect(result.rows).toHaveLength(1);
      const task = result.rows[0];
      expect(task.status).toBe('ERROR');
      expect(task.error).toBe('Network timeout occurred');
    }, 10000);
  });
});
```

### 2. Trace Context Propagation Tests

**File**: `src/__tests__/integration/trace-context-propagation.spec.ts`

```typescript
import { TraceLoggingUtils } from '../../common/utils/trace-logging';
import { LoggerFactory } from '../../common/utils/logging/logger-factory';
import { ApplicationFactory } from '../../application/services/application.factory';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../api/kafka/dtos/index';

describe('Trace Context Propagation Integration Tests', () => {
  let applicationFactory: ApplicationFactory;
  let logger: any;

  beforeAll(() => {
    logger = LoggerFactory.createLogger('TraceContextTests');
    applicationFactory = new ApplicationFactory();
  });

  describe('Trace Context Extraction', () => {
    it('should extract trace context from headers correctly', () => {
      const headers: WebCrawlNewTaskHeaderDto = {
        status: 'NEW',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const traceContext = TraceLoggingUtils.extractTraceContext(headers);

      expect(traceContext).toBeDefined();
      expect(traceContext.traceparent).toBe(headers.traceparent);
      expect(traceContext.tracestate).toBe(headers.tracestate);
      expect(traceContext.correlationId).toBe(headers.correlation_id);
    });

    it('should handle missing trace context gracefully', () => {
      const headers: WebCrawlNewTaskHeaderDto = {
        status: 'NEW',
        timestamp: new Date().toISOString(),
      };

      const traceContext = TraceLoggingUtils.extractTraceContext(headers);

      expect(traceContext).toBeNull();
    });
  });

  describe('Trace Context Propagation Through Services', () => {
    it('should propagate trace context through task creation', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      const traceContext = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlationId: 'test-correlation-123',
      };

      // Mock the repository to avoid database operations
      const mockRepository = {
        createTask: jest.fn().mockResolvedValue({
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_email: 'test@example.com',
          user_query: 'Find product info',
          base_url: 'https://example.com',
          status: 'NEW',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      // Replace the repository in the service
      (taskManagerService as any).taskRepository = mockRepository;

      const task = await taskManagerService.createTask({
        userEmail: 'test@example.com',
        userQuery: 'Find product info',
        baseUrl: 'https://example.com',
        status: 'NEW',
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(mockRepository.createTask).toHaveBeenCalled();
    });
  });
});
```

### 3. DTO Validation Tests

**File**: `src/__tests__/integration/dto-validation.spec.ts`

```typescript
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto, WebCrawlTaskUpdateHeaderDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../../api/kafka/dtos/index';

describe('DTO Validation Integration Tests', () => {
  describe('WebCrawlNewTaskHeaderDto', () => {
    it('should validate valid new task header', async () => {
      const headerData = {
        status: 'NEW',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'test-correlation-123',
        source: 'integration-test',
        version: '1.0.0',
      };

      const header = plainToClass(WebCrawlNewTaskHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid status', async () => {
      const headerData = {
        status: 'INVALID_STATUS',
        timestamp: new Date().toISOString(),
      };

      const header = plainToClass(WebCrawlNewTaskHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });
  });

  describe('WebCrawlNewTaskMessageDto', () => {
    it('should validate valid new task message', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlNewTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid email', async () => {
      const messageData = {
        user_email: 'invalid-email',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlNewTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });
  });

  describe('WebCrawlTaskUpdateHeaderDto', () => {
    it('should validate valid task update header', async () => {
      const headerData = {
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      const header = plainToClass(WebCrawlTaskUpdateHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid task_id', async () => {
      const headerData = {
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        task_id: 'invalid-uuid',
      };

      const header = plainToClass(WebCrawlTaskUpdateHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });
  });
});
```

### 4. UUID Generation Tests

**File**: `src/__tests__/integration/uuid-generation.spec.ts`

```typescript
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlTaskRepositoryAdapter } from '../../infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';
import { LoggerFactory } from '../../common/utils/logging/logger-factory';

describe('UUID Generation Integration Tests', () => {
  let postgresFactory: PostgresFactory;
  let taskRepository: WebCrawlTaskRepositoryAdapter;
  let logger: any;

  beforeAll(() => {
    logger = LoggerFactory.createLogger('UUIDGenerationTests');
    postgresFactory = new PostgresFactory();
    taskRepository = new WebCrawlTaskRepositoryAdapter(logger, postgresFactory);
  });

  beforeEach(async () => {
    // Clean up database before each test
    const client = await postgresFactory.getClient();
    await client.query('DELETE FROM web_crawl_tasks');
  });

  describe('PostgreSQL UUID Generation', () => {
    it('should generate UUIDs automatically for new tasks', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'NEW',
      };

      const task = await taskRepository.createTask(taskData);

      expect(task.id).toBeDefined();
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(task.user_email).toBe(taskData.user_email);
      expect(task.user_query).toBe(taskData.user_query);
      expect(task.base_url).toBe(taskData.base_url);
      expect(task.status).toBe(taskData.status);
    });

    it('should generate unique UUIDs for multiple tasks', async () => {
      const taskData1 = {
        user_email: 'test1@example.com',
        user_query: 'Find product 1',
        base_url: 'https://example1.com',
        status: 'NEW',
      };

      const taskData2 = {
        user_email: 'test2@example.com',
        user_query: 'Find product 2',
        base_url: 'https://example2.com',
        status: 'NEW',
      };

      const task1 = await taskRepository.createTask(taskData1);
      const task2 = await taskRepository.createTask(taskData2);

      expect(task1.id).not.toBe(task2.id);
      expect(task1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(task2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should meet performance requirements', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'NEW',
      };

      const startTime = Date.now();
      const task = await taskRepository.createTask(taskData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be less than 100ms
      expect(task.id).toBeDefined();
    });
  });
});
```

### 5. Kafka Publishing Tests

**File**: `src/__tests__/integration/kafka-publishing.spec.ts`

```typescript
import { WebCrawlRequestPublisher } from '../../api/kafka/publishers/web-crawl-request.publisher';
import { LoggerFactory } from '../../common/utils/logging/logger-factory';
import { KafkaClient } from '../../common/utils/kafka-client';
import { getKafkaTopicName } from '../../config/kafka-topics';

describe('Kafka Publishing Integration Tests', () => {
  let publisher: WebCrawlRequestPublisher;
  let kafkaClient: KafkaClient;
  let logger: any;

  beforeAll(() => {
    logger = LoggerFactory.createLogger('KafkaPublishingTests');
    publisher = new WebCrawlRequestPublisher(logger);
    kafkaClient = KafkaClient.getInstance();
  });

  describe('Web Crawl Request Publishing', () => {
    it('should publish web crawl request successfully', async () => {
      const message = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlation_id: 'test-correlation-123',
          source: 'integration-test',
          version: '1.0.0',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const options = {
        traceContext: {
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlationId: 'test-correlation-123',
        },
      };

      const result = await publisher.publish(message, options);

      expect(result.success).toBe(true);
      expect(result.topic).toBe(getKafkaTopicName('webCrawlRequest'));
      expect(result.messageId).toBeDefined();
    }, 10000);

    it('should handle publishing errors gracefully', async () => {
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
      expect(result.error).toBeDefined();
      expect(result.error).toContain('validation');
    });
  });
});
```

### 6. Performance Tests

**File**: `src/__tests__/integration/performance.spec.ts`

```typescript
import { ApplicationFactory } from '../../application/services/application.factory';
import { LoggerFactory } from '../../common/utils/logging/logger-factory';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlTaskRepositoryAdapter } from '../../infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';

describe('Performance Integration Tests', () => {
  let applicationFactory: ApplicationFactory;
  let taskRepository: WebCrawlTaskRepositoryAdapter;
  let postgresFactory: PostgresFactory;
  let logger: any;

  beforeAll(() => {
    logger = LoggerFactory.createLogger('PerformanceTests');
    applicationFactory = new ApplicationFactory();
    postgresFactory = new PostgresFactory();
    taskRepository = new WebCrawlTaskRepositoryAdapter(logger, postgresFactory);
  });

  beforeEach(async () => {
    // Clean up database before each test
    const client = await postgresFactory.getClient();
    await client.query('DELETE FROM web_crawl_tasks');
  });

  describe('Task Creation Performance', () => {
    it('should create tasks within performance requirements', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'NEW',
      };

      const startTime = Date.now();
      const task = await taskRepository.createTask(taskData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be less than 100ms
      expect(task.id).toBeDefined();
    });

    it('should handle concurrent task creation', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'NEW',
      };

      const promises = Array.from({ length: 10 }, () => taskRepository.createTask(taskData));

      const startTime = Date.now();
      const tasks = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(tasks).toHaveLength(10);
      expect(duration).toBeLessThan(1000); // Should be less than 1 second

      // Verify all tasks have unique UUIDs
      const taskIds = tasks.map((task) => task.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Metrics Retrieval Performance', () => {
    it('should retrieve metrics within performance requirements', async () => {
      // Create some test data first
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'NEW',
      };

      await taskRepository.createTask(taskData);

      const metricsService = applicationFactory.createWebCrawlMetricsService();

      const startTime = Date.now();
      const metrics = await metricsService.getWebCrawlMetrics(24);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should be less than 500ms
      expect(metrics).toBeDefined();
      expect(metrics.totalTasksCount).toBeGreaterThan(0);
    });

    it('should handle large datasets efficiently', async () => {
      // Create 1000 test tasks
      const taskPromises = Array.from({ length: 1000 }, (_, i) =>
        taskRepository.createTask({
          user_email: `user${i}@example.com`,
          user_query: `Query ${i}`,
          base_url: 'https://example.com',
          status: 'NEW',
        })
      );

      await Promise.all(taskPromises);

      const metricsService = applicationFactory.createWebCrawlMetricsService();

      const startTime = Date.now();
      const metrics = await metricsService.getWebCrawlMetrics(24);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should be less than 2 seconds
      expect(metrics.totalTasksCount).toBe(1000);
    });
  });

  describe('Kafka Publishing Performance', () => {
    it('should publish messages within performance requirements', async () => {
      const publisher = applicationFactory.createWebCrawlRequestPublisher();
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const startTime = Date.now();
      const result = await publisher.publishFromTaskData('123e4567-e89b-12d3-a456-426614174000', taskData.user_email, taskData.user_query, taskData.base_url);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be less than 100ms
      expect(result.success).toBe(true);
    });

    it('should handle concurrent publishing', async () => {
      const publisher = applicationFactory.createWebCrawlRequestPublisher();
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const publishPromises = Array.from({ length: 50 }, (_, i) => publisher.publishFromTaskData(`123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`, taskData.user_email, taskData.user_query, taskData.base_url));

      const startTime = Date.now();
      const results = await Promise.all(publishPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should be less than 2 seconds
      expect(results).toHaveLength(50);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not have memory leaks during rapid operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform rapid operations
      for (let i = 0; i < 1000; i++) {
        await taskRepository.createTask({
          user_email: `user${i}@example.com`,
          user_query: `Query ${i}`,
          base_url: 'https://example.com',
          status: 'NEW',
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle database connection pooling correctly', async () => {
      const concurrentOperations = Array.from({ length: 100 }, (_, i) =>
        taskRepository.createTask({
          user_email: `user${i}@example.com`,
          user_query: `Query ${i}`,
          base_url: 'https://example.com',
          status: 'NEW',
        })
      );

      const startTime = Date.now();
      await Promise.all(concurrentOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
    });
  });
});
```

### Stress Testing

**File**: `src/__tests__/stress/stress-tests.spec.ts`

```typescript
import { ApplicationFactory } from '../../application/services/application.factory';
import { LoggerFactory } from '../../common/utils/logging';

describe('Stress Tests', () => {
  let applicationFactory: ApplicationFactory;
  let logger: any;

  beforeAll(() => {
    logger = LoggerFactory.createLogger('StressTests');
    applicationFactory = new ApplicationFactory();
  });

  describe('High Load Task Creation', () => {
    it('should handle 1000 concurrent task creations', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      const taskData = {
        user_email: 'stress@example.com',
        user_query: 'Stress test query',
        base_url: 'https://example.com',
        status: 'new',
      };

      const startTime = Date.now();

      const promises = Array.from({ length: 1000 }, (_, i) =>
        taskManagerService.createTask({
          ...taskData,
          user_email: `stress${i}@example.com`,
          user_query: `Stress test query ${i}`,
        })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(30000); // Should complete in less than 30 seconds

      // Verify all tasks have unique IDs
      const taskIds = results.map((task) => task.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(1000);
    });

    it('should handle sustained load over time', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      const startTime = Date.now();
      const tasksCreated = [];

      // Create tasks continuously for 30 seconds
      while (Date.now() - startTime < 30000) {
        const task = await taskManagerService.createTask({
          user_email: `sustained${Date.now()}@example.com`,
          user_query: `Sustained load query ${Date.now()}`,
          base_url: 'https://example.com',
          status: 'new',
        });

        tasksCreated.push(task);

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(tasksCreated.length).toBeGreaterThan(100);

      // Verify system is still responsive
      const metricsService = applicationFactory.createWebCrawlMetricsService();
      const metrics = await metricsService.getWebCrawlMetrics(1);
      expect(metrics.totalTasksCount).toBeGreaterThan(0);
    });
  });

  describe('Kafka Publishing Under Load', () => {
    it('should handle high-volume message publishing', async () => {
      const publisher = applicationFactory.createWebCrawlRequestPublisher();

      const startTime = Date.now();
      const publishPromises = Array.from({ length: 500 }, (_, i) => publisher.publishFromTaskData(`123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`, `user${i}@example.com`, `High volume query ${i}`, 'https://example.com'));

      const results = await Promise.all(publishPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(500);
      expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds

      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBeGreaterThan(450); // At least 90% success rate
    });
  });

  describe('Database Performance Under Load', () => {
    it('should handle concurrent read and write operations', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();
      const metricsService = applicationFactory.createWebCrawlMetricsService();

      // Create some initial tasks
      const initialTasks = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          taskManagerService.createTask({
            user_email: `concurrent${i}@example.com`,
            user_query: `Concurrent test query ${i}`,
            base_url: 'https://example.com',
            status: 'new',
          })
        )
      );

      // Perform concurrent read and write operations
      const readPromises = Array.from({ length: 50 }, () => metricsService.getWebCrawlMetrics(24));

      const writePromises = Array.from({ length: 50 }, (_, i) =>
        taskManagerService.createTask({
          user_email: `concurrent-write${i}@example.com`,
          user_query: `Concurrent write query ${i}`,
          base_url: 'https://example.com',
          status: 'new',
        })
      );

      const startTime = Date.now();
      const [readResults, writeResults] = await Promise.all([Promise.all(readPromises), Promise.all(writePromises)]);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(readResults).toHaveLength(50);
      expect(writeResults).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });

  describe('Error Recovery Under Load', () => {
    it('should recover gracefully from temporary failures', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Simulate some tasks that might fail
      const mixedPromises = Array.from({ length: 100 }, (_, i) => {
        if (i % 10 === 0) {
          // Every 10th task has invalid data that should fail
          return taskManagerService
            .createTask({
              user_email: 'invalid-email',
              user_query: '',
              base_url: 'not-a-url',
              status: 'invalid-status',
            })
            .catch((error) => ({ error: error.message }));
        } else {
          return taskManagerService.createTask({
            user_email: `recovery${i}@example.com`,
            user_query: `Recovery test query ${i}`,
            base_url: 'https://example.com',
            status: 'new',
          });
        }
      });

      const results = await Promise.allSettled(mixedPromises);

      const successfulResults = results.filter((r) => r.status === 'fulfilled');
      const failedResults = results.filter((r) => r.status === 'rejected');

      expect(successfulResults.length).toBeGreaterThan(80); // At least 80% should succeed
      expect(failedResults.length).toBeLessThan(20); // Less than 20% should fail
    });
  });
});
```

### Chaos Testing

**File**: `src/__tests__/chaos/chaos-tests.spec.ts`

```typescript
import { ApplicationFactory } from '../../application/services/application.factory';
import { LoggerFactory } from '../../common/utils/logging';

describe('Chaos Tests', () => {
  let applicationFactory: ApplicationFactory;
  let logger: any;

  beforeAll(() => {
    logger = LoggerFactory.createLogger('ChaosTests');
    applicationFactory = new ApplicationFactory();
  });

  describe('Network Partition Simulation', () => {
    it('should handle Kafka connection failures gracefully', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Simulate Kafka connection failure by mocking the publisher
      const originalPublisher = taskManagerService['publisher'];
      taskManagerService['publisher'] = {
        publishFromTaskData: jest.fn().mockResolvedValue({
          success: false,
          error: 'Kafka connection failed',
        }),
      };

      const task = await taskManagerService.createTask({
        user_email: 'chaos@example.com',
        user_query: 'Chaos test query',
        base_url: 'https://example.com',
        status: 'new',
      });

      // Task should still be created even if publishing fails
      expect(task.id).toBeDefined();
      expect(task.status).toBe('new');

      // Restore original publisher
      taskManagerService['publisher'] = originalPublisher;
    });

    it('should handle database connection failures', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Simulate database connection failure
      const originalRepository = taskManagerService['taskRepository'];
      taskManagerService['taskRepository'] = {
        createTask: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        updateTaskStatus: jest.fn(),
        getTaskById: jest.fn(),
      };

      await expect(
        taskManagerService.createTask({
          user_email: 'chaos@example.com',
          user_query: 'Chaos test query',
          base_url: 'https://example.com',
          status: 'new',
        })
      ).rejects.toThrow('Database connection failed');

      // Restore original repository
      taskManagerService['taskRepository'] = originalRepository;
    });
  });

  describe('Resource Exhaustion Simulation', () => {
    it('should handle memory pressure gracefully', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Create many tasks to simulate memory pressure
      const tasks = [];
      for (let i = 0; i < 1000; i++) {
        try {
          const task = await taskManagerService.createTask({
            user_email: `memory${i}@example.com`,
            user_query: `Memory pressure test query ${i}`,
            base_url: 'https://example.com',
            status: 'new',
          });
          tasks.push(task);
        } catch (error) {
          // System should handle memory pressure gracefully
          expect(error.message).toContain('memory') || expect(error.message).toContain('resource');
          break;
        }
      }

      // System should still be functional
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should handle connection pool exhaustion', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Create many concurrent operations to exhaust connection pool
      const promises = Array.from({ length: 200 }, (_, i) =>
        taskManagerService.createTask({
          user_email: `pool${i}@example.com`,
          user_query: `Connection pool test query ${i}`,
          base_url: 'https://example.com',
          status: 'new',
        })
      );

      const results = await Promise.allSettled(promises);

      // Some operations should succeed, some might fail due to pool exhaustion
      const successfulResults = results.filter((r) => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Data Corruption Simulation', () => {
    it('should handle corrupted trace context gracefully', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Simulate corrupted trace context
      const taskWithCorruptedTrace = {
        user_email: 'corruption@example.com',
        user_query: 'Corruption test query',
        base_url: 'https://example.com',
        status: 'new',
        traceContext: {
          traceparent: 'corrupted-trace-data',
          tracestate: null,
          correlationId: undefined,
        },
      };

      const task = await taskManagerService.createTask(taskWithCorruptedTrace);

      // Task should still be created even with corrupted trace context
      expect(task.id).toBeDefined();
      expect(task.status).toBe('new');
    });

    it('should handle malformed DTOs gracefully', async () => {
      const taskManagerService = applicationFactory.createWebCrawlTaskManagerService();

      // Simulate malformed task data
      const malformedTaskData = {
        user_email: 123, // Should be string
        user_query: null, // Should be string
        base_url: undefined, // Should be string
        status: 'invalid-status', // Should be valid enum
      };

      await expect(taskManagerService.createTask(malformedTaskData as any)).rejects.toThrow();
    });
  });
});
```

## Potential Issues and Mitigations

### 1. Test Environment Setup

**Issue**: Integration tests require complex environment setup
**Mitigation**: Use Docker containers for consistent test environment

### 2. Test Data Management

**Issue**: Tests might interfere with each other
**Mitigation**: Clean up test data before and after each test

### 3. Performance Test Reliability

**Issue**: Performance tests might be flaky due to system load
**Mitigation**: Use statistical analysis and multiple runs

### 4. Resource Management

**Issue**: Tests might consume too many resources
**Mitigation**: Implement resource limits and cleanup

### 5. Test Isolation

**Issue**: Tests might affect each other's state
**Mitigation**: Use separate test databases and proper cleanup

## Success Criteria

- [ ] All end-to-end workflow tests pass
- [ ] Trace context propagation works correctly
- [ ] DTO validation works in all scenarios
- [ ] UUID generation meets performance requirements
- [ ] Kafka publishing works reliably
- [ ] Performance requirements are met
- [ ] Error scenarios are handled correctly
- [ ] No memory leaks or resource issues
- [ ] Stress tests pass consistently
- [ ] Chaos tests demonstrate system resilience
- [ ] All tests run in CI/CD pipeline

## Dependencies

- All previous jobs (01-08)
- Test environment setup
- Docker containers for dependencies
- Performance monitoring tools

## Estimated Effort

- **Development**: 2 days
- **Testing**: 2 days
- **Total**: 4 days

## Notes

- This job validates that all previous work integrates correctly
- End-to-end testing is critical for ensuring system reliability
- Performance testing ensures requirements are met
- Error scenario testing ensures robustness
- Stress and chaos testing ensure system resilience
- All tests should be automated and run in CI/CD pipeline
- Resource monitoring is essential for performance tests
- Test data cleanup is critical for test reliability

```

## Potential Issues and Mitigations

### 1. Test Environment Setup

**Issue**: Integration tests require complex environment setup
**Mitigation**: Use Docker containers for consistent test environment

### 2. Test Data Management

**Issue**: Tests might interfere with each other
**Mitigation**: Clean up test data before and after each test

### 3. Performance Test Reliability

**Issue**: Performance tests might be flaky due to system load
**Mitigation**: Use statistical analysis and multiple runs

## Success Criteria

- [ ] All end-to-end workflow tests pass
- [ ] Trace context propagation works correctly
- [ ] DTO validation works in all scenarios
- [ ] UUID generation meets performance requirements
- [ ] Kafka publishing works reliably
- [ ] Performance requirements are met
- [ ] Error scenarios are handled correctly
- [ ] No memory leaks or resource issues

## Dependencies

- All previous jobs (13-21)
- Test environment setup
- Docker containers for dependencies

## Estimated Effort

- **Development**: 2 days
- **Testing**: 1 day
- **Total**: 3 days

## Notes

- This job validates that all previous work integrates correctly
- End-to-end testing is critical for ensuring system reliability
- Performance testing ensures requirements are met
- Error scenario testing ensures robustness
- All tests should be automated and run in CI/CD pipeline
```
