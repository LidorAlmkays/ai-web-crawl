# Job 2: Business Logic Instrumentation

## Overview

Implement tracing instrumentation for business logic operations including task management, Kafka message processing, and database operations.

## Objectives

- Instrument task manager service with comprehensive tracing
- Implement Kafka message processing with distributed trace support
- Add database operation tracing
- Create traced versions of existing services

## Files to Create/Modify

### 1. Traced Task Manager Service

**File**: `apps/task-manager/src/application/services/traced-web-crawl-task-manager.ts`

**Implementation**:

```typescript
import { TraceManager } from '../../common/utils/tracing/trace-manager';
import { TraceAttributes } from '../../common/utils/tracing/trace-attributes';
import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { CreateTaskDto, Task, TaskStatus } from '../../domain/entities';

export class TracedWebCrawlTaskManager implements IWebCrawlTaskManagerPort {
  private traceManager = TraceManager.getInstance();

  constructor(private readonly taskRepository: any) {}

  async createTask(taskData: CreateTaskDto): Promise<Task> {
    return this.traceManager.traceOperation(
      'web_crawl_task.create',
      async () => {
        // Create task with business logic
        const task = await this.taskRepository.create(taskData);

        // Add business-specific span for task creation
        this.traceManager
          .createSpan('task.created', {
            [TraceAttributes.TASK_ID]: task.id,
            [TraceAttributes.TASK_STATUS]: task.status,
            [TraceAttributes.TASK_PRIORITY]: task.priority,
            [TraceAttributes.TASK_URL]: task.url,
            'task.created_at': task.createdAt,
            'task.updated_at': task.updatedAt,
          })
          .end();

        return task;
      },
      {
        [TraceAttributes.TASK_URL]: taskData.url,
        [TraceAttributes.TASK_PRIORITY]: taskData.priority,
        'task_data.size': JSON.stringify(taskData).length,
      }
    );
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.traceManager.traceOperation(
      'web_crawl_task.get_by_id',
      async () => {
        const task = await this.taskRepository.findById(id);

        if (task) {
          // Add span for successful task retrieval
          this.traceManager
            .createSpan('task.retrieved', {
              [TraceAttributes.TASK_ID]: task.id,
              [TraceAttributes.TASK_STATUS]: task.status,
              'task.found': true,
            })
            .end();
        } else {
          // Add span for task not found
          this.traceManager
            .createSpan('task.not_found', {
              [TraceAttributes.TASK_ID]: id,
              'task.found': false,
            })
            .end();
        }

        return task;
      },
      {
        [TraceAttributes.TASK_ID]: id,
      }
    );
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.traceManager.traceOperation(
      'web_crawl_task.update_status',
      async () => {
        const task = await this.taskRepository.updateStatus(id, status);

        // Add span for status update
        this.traceManager
          .createSpan('task.status_updated', {
            [TraceAttributes.TASK_ID]: task.id,
            [TraceAttributes.TASK_STATUS]: task.status,
            'task.previous_status': task.previousStatus,
            'task.updated_at': task.updatedAt,
          })
          .end();

        return task;
      },
      {
        [TraceAttributes.TASK_ID]: id,
        [TraceAttributes.TASK_STATUS]: status,
      }
    );
  }

  async getTasksByStatus(status: TaskStatus, limit: number = 10): Promise<Task[]> {
    return this.traceManager.traceOperation(
      'web_crawl_task.get_by_status',
      async () => {
        const tasks = await this.taskRepository.findByStatus(status, limit);

        // Add span for bulk task retrieval
        this.traceManager
          .createSpan('tasks.retrieved_by_status', {
            [TraceAttributes.TASK_STATUS]: status,
            'tasks.count': tasks.length,
            'tasks.limit': limit,
          })
          .end();

        return tasks;
      },
      {
        [TraceAttributes.TASK_STATUS]: status,
        'query.limit': limit,
      }
    );
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.traceManager.traceOperation(
      'web_crawl_task.delete',
      async () => {
        const deleted = await this.taskRepository.delete(id);

        // Add span for task deletion
        this.traceManager
          .createSpan('task.deleted', {
            [TraceAttributes.TASK_ID]: id,
            'task.deleted': deleted,
          })
          .end();

        return deleted;
      },
      {
        [TraceAttributes.TASK_ID]: id,
      }
    );
  }
}
```

### 2. Traced Kafka API Manager

**File**: `apps/task-manager/src/api/kafka/traced-kafka-api-manager.ts`

**Implementation**:

```typescript
import { TraceManager } from '../../common/utils/tracing/trace-manager';
import { TraceContextManager } from '../../common/utils/tracing/trace-context';
import { TraceAttributes } from '../../common/utils/tracing/trace-attributes';
import { KafkaClient } from '../../common/clients/kafka-client';
import { logger } from '../../common/utils/logger';
import { IWebCrawlTaskManagerPort } from '../../application/ports/web-crawl-task-manager.port';
import { registerConsumers, ConsumerRegistration } from './kafka.router';
import { kafkaConfig } from '../../config';
import { trace } from '@opentelemetry/api';

export class TracedKafkaApiManager {
  private registrations: ConsumerRegistration[] = [];
  private traceManager = TraceManager.getInstance();

  constructor(private readonly kafkaClient: KafkaClient, private readonly deps: { webCrawlTaskManager: IWebCrawlTaskManagerPort }) {
    logger.debug('TracedKafkaApiManager initialized');
  }

  async start(): Promise<void> {
    return this.traceManager.traceOperation(
      'kafka.api.start',
      async () => {
        // Get consumer/handler registrations from router
        this.registrations = registerConsumers(this.deps);
        logger.debug('Got consumer registrations', {
          count: this.registrations.length,
          topics: this.registrations.map((r) => r.consumer.topic),
        });

        // Subscribe all consumers first (no consuming yet)
        for (const { consumer, handler } of this.registrations) {
          await consumer.start(this.kafkaClient, handler);
          logger.debug('Consumer subscribed', { topic: consumer.topic });
        }

        // Start consuming once after all subscriptions
        await this.kafkaClient.startConsuming();
        logger.info('Kafka consumption started for all topics');
      },
      {
        'kafka.consumers.count': this.registrations.length,
        'kafka.topics': this.registrations.map((r) => r.consumer.topic).join(','),
      }
    );
  }

  async processMessage(message: any): Promise<void> {
    // Extract trace context from Kafka headers (W3C Trace Context)
    const traceContext = TraceContextManager.extractFromKafkaHeaders(message.headers);

    if (traceContext) {
      // Create child span of the incoming trace (distributed tracing)
      return this.traceManager.traceOperationWithContext(
        'kafka.message.process',
        traceContext as any, // Convert to SpanContext
        async () => {
          await this.processWithContext(message, traceContext);
        },
        {
          [TraceAttributes.KAFKA_TOPIC]: message.topic,
          [TraceAttributes.KAFKA_PARTITION]: message.partition,
          [TraceAttributes.KAFKA_OFFSET]: message.offset,
          [TraceAttributes.MESSAGE_SIZE]: message.value?.length || 0,
          [TraceAttributes.PARENT_TRACE_ID]: traceContext.traceId,
          [TraceAttributes.DISTRIBUTED_TRACE]: true,
        }
      );
    } else {
      // No trace context - create new trace (single-service scenario)
      return this.traceManager.traceOperation(
        'kafka.message.process.new_trace',
        async () => {
          await this.processMessageInternal(message);
        },
        {
          [TraceAttributes.KAFKA_TOPIC]: message.topic,
          [TraceAttributes.KAFKA_PARTITION]: message.partition,
          [TraceAttributes.KAFKA_OFFSET]: message.offset,
          [TraceAttributes.MESSAGE_SIZE]: message.value?.length || 0,
          [TraceAttributes.DISTRIBUTED_TRACE]: false,
        }
      );
    }
  }

  private async processWithContext(message: any, traceContext: any): Promise<void> {
    // Process message with trace context
    const span = this.traceManager.createSpan('kafka.message.handler', {
      [TraceAttributes.KAFKA_TOPIC]: message.topic,
      'message.key': message.key,
      'message.timestamp': message.timestamp,
      'parent.trace.id': traceContext.traceId,
    });

    try {
      await this.processMessageInternal(message);
      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.setStatus({ code: 2, message: error.message }); // ERROR
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  private async processMessageInternal(message: any): Promise<void> {
    // Existing message processing logic
    logger.info('Processing message', {
      topic: message.topic,
      partition: message.partition,
      offset: message.offset,
    });
  }

  async pause(): Promise<void> {
    return this.traceManager.traceOperation(
      'kafka.api.pause',
      async () => {
        await this.kafkaClient.pause();
        logger.info('Kafka API paused');
      },
      {
        'kafka.consumers.count': this.registrations.length,
      }
    );
  }

  async resume(): Promise<void> {
    return this.traceManager.traceOperation(
      'kafka.api.resume',
      async () => {
        await this.kafkaClient.resume();
        logger.info('Kafka API resumed');
      },
      {
        'kafka.consumers.count': this.registrations.length,
      }
    );
  }

  async stop(): Promise<void> {
    return this.traceManager.traceOperation(
      'kafka.api.stop',
      async () => {
        await this.kafkaClient.stop();
        logger.info('Kafka API stopped');
      },
      {
        'kafka.consumers.count': this.registrations.length,
      }
    );
  }

  // Inject trace context into outgoing Kafka messages (for future use)
  private injectTraceContextIntoMessage(message: any): void {
    const currentContext = trace.getActiveSpan()?.context();
    if (currentContext) {
      const headers = TraceContextManager.injectIntoKafkaHeaders(currentContext);
      Object.assign(message.headers, headers);
    }
  }
}
```

### 3. Traced Database Repository

**File**: `apps/task-manager/src/infrastructure/persistence/postgres/traced-web-crawl-task-repository.ts`

**Implementation**:

```typescript
import { TraceManager } from '../../../common/utils/tracing/trace-manager';
import { TraceAttributes } from '../../../common/utils/tracing/trace-attributes';
import { Task, CreateTaskDto, TaskStatus } from '../../../domain/entities';

export class TracedWebCrawlTaskRepository {
  private traceManager = TraceManager.getInstance();

  constructor(private readonly pool: any) {}

  async create(taskData: CreateTaskDto): Promise<Task> {
    return this.traceManager.traceOperation(
      'database.task.create',
      async () => {
        const query = `
          INSERT INTO web_crawl_tasks (url, priority, status, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING *
        `;

        const result = await this.pool.query(query, [taskData.url, taskData.priority, taskData.status || 'PENDING']);

        return result.rows[0];
      },
      {
        [TraceAttributes.DATABASE_OPERATION]: 'INSERT',
        [TraceAttributes.DATABASE_TABLE]: 'web_crawl_tasks',
        [TraceAttributes.TASK_URL]: taskData.url,
        [TraceAttributes.TASK_PRIORITY]: taskData.priority,
      }
    );
  }

  async findById(id: string): Promise<Task | null> {
    return this.traceManager.traceOperation(
      'database.task.find_by_id',
      async () => {
        const query = 'SELECT * FROM web_crawl_tasks WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
      },
      {
        [TraceAttributes.DATABASE_OPERATION]: 'SELECT',
        [TraceAttributes.DATABASE_TABLE]: 'web_crawl_tasks',
        [TraceAttributes.TASK_ID]: id,
      }
    );
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.traceManager.traceOperation(
      'database.task.update_status',
      async () => {
        const query = `
          UPDATE web_crawl_tasks 
          SET status = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;

        const result = await this.pool.query(query, [id, status]);

        if (result.rows.length === 0) {
          throw new Error(`Task with id ${id} not found`);
        }

        return result.rows[0];
      },
      {
        [TraceAttributes.DATABASE_OPERATION]: 'UPDATE',
        [TraceAttributes.DATABASE_TABLE]: 'web_crawl_tasks',
        [TraceAttributes.TASK_ID]: id,
        [TraceAttributes.TASK_STATUS]: status,
      }
    );
  }

  async findByStatus(status: TaskStatus, limit: number = 10): Promise<Task[]> {
    return this.traceManager.traceOperation(
      'database.task.find_by_status',
      async () => {
        const query = `
          SELECT * FROM web_crawl_tasks 
          WHERE status = $1 
          ORDER BY created_at DESC 
          LIMIT $2
        `;

        const result = await this.pool.query(query, [status, limit]);
        return result.rows;
      },
      {
        [TraceAttributes.DATABASE_OPERATION]: 'SELECT',
        [TraceAttributes.DATABASE_TABLE]: 'web_crawl_tasks',
        [TraceAttributes.TASK_STATUS]: status,
        'query.limit': limit,
      }
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.traceManager.traceOperation(
      'database.task.delete',
      async () => {
        const query = 'DELETE FROM web_crawl_tasks WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rowCount > 0;
      },
      {
        [TraceAttributes.DATABASE_OPERATION]: 'DELETE',
        [TraceAttributes.DATABASE_TABLE]: 'web_crawl_tasks',
        [TraceAttributes.TASK_ID]: id,
      }
    );
  }

  async getTaskCount(): Promise<number> {
    return this.traceManager.traceOperation(
      'database.task.count',
      async () => {
        const query = 'SELECT COUNT(*) as count FROM web_crawl_tasks';
        const result = await this.pool.query(query);
        return parseInt(result.rows[0].count);
      },
      {
        [TraceAttributes.DATABASE_OPERATION]: 'SELECT',
        [TraceAttributes.DATABASE_TABLE]: 'web_crawl_tasks',
        'query.type': 'count',
      }
    );
  }
}
```

## Integration Points

### 1. Application Factory Update

**File**: `apps/task-manager/src/application/services/application.factory.ts` (Enhanced)

**Changes**:

```typescript
import { TracedWebCrawlTaskManager } from './traced-web-crawl-task-manager';
import { TracedWebCrawlTaskRepository } from '../../infrastructure/persistence/postgres/traced-web-crawl-task-repository';

export class ApplicationFactory {
  static createWebCrawlTaskManager(repository: any): IWebCrawlTaskManagerPort {
    return new TracedWebCrawlTaskManager(repository);
  }

  static createTracedWebCrawlTaskRepository(pool: any): TracedWebCrawlTaskRepository {
    return new TracedWebCrawlTaskRepository(pool);
  }
}
```

### 2. App.ts Integration

**File**: `apps/task-manager/src/app.ts` (Enhanced)

**Changes**:

```typescript
import { TracedKafkaApiManager } from './api/kafka/traced-kafka-api-manager';
import { TracedWebCrawlTaskRepository } from './infrastructure/persistence/postgres/traced-web-crawl-task-repository';

export class TaskManagerApplication {
  public async start(): Promise<void> {
    // ... existing initialization ...

    const tracedWebCrawlTaskRepository = new TracedWebCrawlTaskRepository(this.postgresFactory.getPool());

    const tracedWebCrawlTaskManager = ApplicationFactory.createWebCrawlTaskManager(tracedWebCrawlTaskRepository);

    this.kafkaApiManager = new TracedKafkaApiManager(this.kafkaFactory.getClient(), { webCrawlTaskManager: tracedWebCrawlTaskManager });

    // ... rest of startup logic ...
  }
}
```

## Unit Tests

### 1. Traced Task Manager Tests

**File**: `apps/task-manager/src/application/services/__tests__/traced-web-crawl-task-manager.spec.ts`

**Test Cases**:

- Test task creation with tracing
- Test task retrieval with tracing
- Test status update with tracing
- Test bulk operations with tracing
- Test error handling with tracing
- Test business span creation

### 2. Traced Kafka Manager Tests

**File**: `apps/task-manager/src/api/kafka/__tests__/traced-kafka-api-manager.spec.ts`

**Test Cases**:

- Test message processing with trace context
- Test message processing without trace context
- Test distributed tracing flow
- Test error handling in message processing
- Test Kafka lifecycle operations

### 3. Traced Repository Tests

**File**: `apps/task-manager/src/infrastructure/persistence/postgres/__tests__/traced-web-crawl-task-repository.spec.ts`

**Test Cases**:

- Test database operations with tracing
- Test query performance tracking
- Test error handling in database operations
- Test bulk operations with tracing

## Success Criteria

- [ ] Task manager operations are fully traced
- [ ] Kafka message processing supports distributed tracing
- [ ] Database operations include performance tracking
- [ ] Business spans are created for key events
- [ ] Error handling preserves trace context
- [ ] All unit tests pass
- [ ] Integration with existing services works
- [ ] Performance impact is minimal (<1ms per operation)

## Dependencies

- Job 1: Core Tracing Infrastructure (must be completed first)
- Existing domain entities and DTOs
- Existing Kafka and PostgreSQL infrastructure

## Estimated Time

**3-4 days**

## Next Steps

After completing this job, proceed to Job 3: Testing and Validation.
