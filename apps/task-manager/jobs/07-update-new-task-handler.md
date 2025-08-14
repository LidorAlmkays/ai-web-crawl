# Job 07: Update New Task Handler

## Status

**NOT_COMPLETED**

## Overview

Update the new task handler to integrate with the new DTO structure, trace context propagation, UUID generation, and web crawl request publishing. This job focuses on updating the handler to work with the refactored DTOs and new infrastructure.

## Objectives

- Update new task handler to use new DTO structure
- Integrate trace context propagation
- Implement UUID generation integration
- Add web crawl request publishing
- Ensure proper error handling and logging

## Files to Modify

### Files to Modify

- `src/api/kafka/handlers/task-status/new-task.handler.ts` - Update to use new DTOs
- `src/api/kafka/handlers/task-status/task-status-router.handler.ts` - Update routing logic
- `src/application/services/web-crawl-task-manager.service.ts` - Update service integration
- `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts` - Update repository integration

## Detailed Implementation

### 1. Update New Task Handler

**File**: `src/api/kafka/handlers/task-status/new-task.handler.ts`

```typescript
import { ILogger } from '../../../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../../../common/utils/trace-logging';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../dtos/index';
import { WebCrawlRequestPublisher } from '../../publishers/web-crawl-request.publisher';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';

export class NewTaskHandler {
  private readonly logger: ILogger;
  private readonly taskManagerService: IWebCrawlTaskManagerPort;
  private readonly webCrawlPublisher: WebCrawlRequestPublisher;

  constructor(logger: ILogger, taskManagerService: IWebCrawlTaskManagerPort, webCrawlPublisher: WebCrawlRequestPublisher) {
    this.logger = logger;
    this.taskManagerService = taskManagerService;
    this.webCrawlPublisher = webCrawlPublisher;
  }

  /**
   * Handle new task creation with enhanced trace context and UUID generation
   */
  async handle(headers: WebCrawlNewTaskHeaderDto, message: WebCrawlNewTaskMessageDto): Promise<void> {
    const traceContext = this.extractTraceContext(headers);
    const traceLogger = traceContext ? TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext) : this.logger;

    traceLogger.info('Processing new task creation', {
      userEmail: message.user_email,
      userQuery: message.user_query,
      baseUrl: message.base_url,
      status: headers.status,
    });

    try {
      // Create task with PostgreSQL UUID generation
      const task = await this.taskManagerService.createTask({
        userEmail: message.user_email,
        userQuery: message.user_query,
        baseUrl: message.base_url,
        status: headers.status,
      });

      traceLogger.info('Task created successfully', {
        taskId: task.id,
        userEmail: task.user_email,
      });

      // Publish web crawl request with trace context
      await this.publishWebCrawlRequest(task, traceContext);

      traceLogger.info('New task processing completed', {
        taskId: task.id,
      });
    } catch (error) {
      traceLogger.error('Failed to process new task', {
        error: error.message,
        userEmail: message.user_email,
        baseUrl: message.base_url,
      });
      throw error;
    }
  }

  /**
   * Extract trace context from headers
   */
  private extractTraceContext(headers: WebCrawlNewTaskHeaderDto) {
    if (!headers.traceparent && !headers.tracestate && !headers.correlation_id) {
      return null;
    }

    return {
      traceparent: headers.traceparent,
      tracestate: headers.tracestate,
      correlationId: headers.correlation_id,
    };
  }

  /**
   * Publish web crawl request with trace context
   */
  private async publishWebCrawlRequest(task: any, traceContext: any): Promise<void> {
    try {
      const publishResult = await this.webCrawlPublisher.publish(
        {
          headers: {
            task_id: task.id,
            traceparent: traceContext?.traceparent,
            tracestate: traceContext?.tracestate,
            correlation_id: traceContext?.correlationId,
            source: 'task-manager',
            version: '1.0.0',
          },
          body: {
            user_email: task.user_email,
            user_query: task.user_query,
            base_url: task.base_url,
          },
        },
        {
          traceContext,
        }
      );

      if (!publishResult.success) {
        throw new Error(`Failed to publish web crawl request: ${publishResult.error}`);
      }

      this.logger.info('Web crawl request published successfully', {
        taskId: task.id,
        messageId: publishResult.messageId,
        topic: publishResult.topic,
      });
    } catch (error) {
      this.logger.error('Failed to publish web crawl request', {
        taskId: task.id,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### 2. Update Task Status Router Handler

**File**: `src/api/kafka/handlers/task-status/task-status-router.handler.ts`

```typescript
import { ILogger } from '../../../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../../../common/utils/trace-logging';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto, WebCrawlTaskUpdateHeaderDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../../dtos/index';
import { NewTaskHandler } from './new-task.handler';
import { CompleteTaskHandler } from './complete-task.handler';
import { ErrorTaskHandler } from './error-task.handler';

export class TaskStatusRouterHandler {
  private readonly logger: ILogger;
  private readonly newTaskHandler: NewTaskHandler;
  private readonly completeTaskHandler: CompleteTaskHandler;
  private readonly errorTaskHandler: ErrorTaskHandler;

  constructor(logger: ILogger, newTaskHandler: NewTaskHandler, completeTaskHandler: CompleteTaskHandler, errorTaskHandler: ErrorTaskHandler) {
    this.logger = logger;
    this.newTaskHandler = newTaskHandler;
    this.completeTaskHandler = completeTaskHandler;
    this.errorTaskHandler = errorTaskHandler;
  }

  /**
   * Route task status messages based on status and message type
   */
  async handle(headers: any, message: any): Promise<void> {
    const traceContext = this.extractTraceContext(headers);
    const traceLogger = traceContext ? TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext) : this.logger;

    traceLogger.info('Routing task status message', {
      status: headers.status,
      taskId: headers.task_id,
    });

    try {
      switch (headers.status) {
        case 'NEW':
          await this.handleNewTask(headers as WebCrawlNewTaskHeaderDto, message as WebCrawlNewTaskMessageDto);
          break;
        case 'COMPLETED':
          await this.handleCompletedTask(headers as WebCrawlTaskUpdateHeaderDto, message as WebCrawlCompletedTaskMessageDto);
          break;
        case 'ERROR':
          await this.handleErrorTask(headers as WebCrawlTaskUpdateHeaderDto, message as WebCrawlErrorTaskMessageDto);
          break;
        default:
          throw new Error(`Unsupported task status: ${headers.status}`);
      }
    } catch (error) {
      traceLogger.error('Failed to route task status message', {
        status: headers.status,
        taskId: headers.task_id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle new task messages
   */
  private async handleNewTask(headers: WebCrawlNewTaskHeaderDto, message: WebCrawlNewTaskMessageDto): Promise<void> {
    await this.newTaskHandler.handle(headers, message);
  }

  /**
   * Handle completed task messages
   */
  private async handleCompletedTask(headers: WebCrawlTaskUpdateHeaderDto, message: WebCrawlCompletedTaskMessageDto): Promise<void> {
    await this.completeTaskHandler.handle(headers, message);
  }

  /**
   * Handle error task messages
   */
  private async handleErrorTask(headers: WebCrawlTaskUpdateHeaderDto, message: WebCrawlErrorTaskMessageDto): Promise<void> {
    await this.errorTaskHandler.handle(headers, message);
  }

  /**
   * Extract trace context from headers
   */
  private extractTraceContext(headers: any) {
    if (!headers.traceparent && !headers.tracestate && !headers.correlation_id) {
      return null;
    }

    return {
      traceparent: headers.traceparent,
      tracestate: headers.tracestate,
      correlationId: headers.correlation_id,
    };
  }
}
```

### 3. Update Application Service

**File**: `src/application/services/web-crawl-task-manager.service.ts`

```typescript
import { ILogger } from '../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../common/utils/trace-logging';
import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { IWebCrawlTaskRepositoryPort } from '../../infrastructure/ports/web-crawl-task-repository.port';

export interface CreateTaskRequest {
  userEmail: string;
  userQuery: string;
  baseUrl: string;
  status: string;
}

export interface Task {
  id: string;
  user_email: string;
  user_query: string;
  base_url: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class WebCrawlTaskManagerService implements IWebCrawlTaskManagerPort {
  private readonly logger: ILogger;
  private readonly taskRepository: IWebCrawlTaskRepositoryPort;

  constructor(logger: ILogger, taskRepository: IWebCrawlTaskRepositoryPort) {
    this.logger = logger;
    this.taskRepository = taskRepository;
  }

  /**
   * Create new task with PostgreSQL UUID generation
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    this.logger.info('Creating new task', {
      userEmail: request.userEmail,
      userQuery: request.userQuery,
      baseUrl: request.baseUrl,
    });

    try {
      // Let PostgreSQL generate the UUID
      const task = await this.taskRepository.createTask({
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
      });

      this.logger.info('Task created successfully', {
        taskId: task.id,
        userEmail: task.user_email,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to create task', {
        error: error.message,
        userEmail: request.userEmail,
        baseUrl: request.baseUrl,
      });
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string, additionalData?: any): Promise<Task> {
    this.logger.info('Updating task status', {
      taskId,
      status,
    });

    try {
      const task = await this.taskRepository.updateTaskStatus(taskId, status, additionalData);

      this.logger.info('Task status updated successfully', {
        taskId: task.id,
        status: task.status,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to update task status', {
        taskId,
        status,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### 4. Update Repository Adapter

**File**: `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`

```typescript
import { ILogger } from '../../../../common/utils/logging/interfaces';
import { IWebCrawlTaskRepositoryPort } from '../../../ports/web-crawl-task-repository.port';
import { PostgresFactory } from '../postgres.factory';

export interface CreateTaskData {
  user_email: string;
  user_query: string;
  base_url: string;
  status: string;
}

export interface Task {
  id: string;
  user_email: string;
  user_query: string;
  base_url: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  private readonly logger: ILogger;
  private readonly postgresFactory: PostgresFactory;

  constructor(logger: ILogger, postgresFactory: PostgresFactory) {
    this.logger = logger;
    this.postgresFactory = postgresFactory;
  }

  /**
   * Create new task with PostgreSQL UUID generation
   */
  async createTask(data: CreateTaskData): Promise<Task> {
    this.logger.info('Creating task in database', {
      userEmail: data.user_email,
      baseUrl: data.base_url,
    });

    try {
      const client = await this.postgresFactory.getClient();

      const query = `
        INSERT INTO web_crawl_tasks (user_email, user_query, base_url, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_email, user_query, base_url, status, created_at, updated_at
      `;

      const result = await client.query(query, [data.user_email, data.user_query, data.base_url, data.status]);

      const task = result.rows[0] as Task;

      this.logger.info('Task created in database', {
        taskId: task.id,
        userEmail: task.user_email,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to create task in database', {
        error: error.message,
        userEmail: data.user_email,
        baseUrl: data.base_url,
      });
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string, additionalData?: any): Promise<Task> {
    this.logger.info('Updating task status in database', {
      taskId,
      status,
    });

    try {
      const client = await this.postgresFactory.getClient();

      let query = `
        UPDATE web_crawl_tasks 
        SET status = $1, updated_at = NOW()
      `;
      const params = [status];

      // Add additional data if provided
      if (additionalData) {
        if (additionalData.crawl_result) {
          query += `, crawl_result = $2`;
          params.push(additionalData.crawl_result);
        }
        if (additionalData.error) {
          query += `, error = $${params.length + 1}`;
          params.push(additionalData.error);
        }
      }

      query += `
        WHERE id = $${params.length + 1}
        RETURNING id, user_email, user_query, base_url, status, created_at, updated_at
      `;
      params.push(taskId);

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const task = result.rows[0] as Task;

      this.logger.info('Task status updated in database', {
        taskId: task.id,
        status: task.status,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to update task status in database', {
        taskId,
        status,
        error: error.message,
      });
      throw error;
    }
  }
}
```

## Testing Strategy

### Unit Tests

**File**: `src/api/rest/handlers/__tests__/new-task.handler.spec.ts`

```typescript
import { NewTaskHandler } from '../new-task.handler';
import { CreateTaskRequestDto } from '../../../dtos/create-task-request.dto';
import { IWebCrawlTaskRepositoryPort } from '../../../../infrastructure/ports/web-crawl-task-repository.port';
import { IWebCrawlRequestPublisherPort } from '../../../../infrastructure/ports/web-crawl-request-publisher.port';
import { ILogger } from '../../../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../../../common/utils/trace-logging';

describe('NewTaskHandler', () => {
  let handler: NewTaskHandler;
  let mockTaskRepository: jest.Mocked<IWebCrawlTaskRepositoryPort>;
  let mockPublisher: jest.Mocked<IWebCrawlRequestPublisherPort>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockTaskRepository = {
      createTask: jest.fn(),
      updateTaskStatus: jest.fn(),
    };

    mockPublisher = {
      publishFromTaskData: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    };

    handler = new NewTaskHandler(mockTaskRepository, mockPublisher, mockLogger);
  });

  describe('handleNewTask', () => {
    it('should create task and publish request successfully', async () => {
      const request: CreateTaskRequestDto = {
        userEmail: 'test@example.com',
        userQuery: 'Find product information',
        baseUrl: 'https://example.com',
        status: 'new',
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      const result = await handler.handleNewTask(request);

      expect(result).toEqual(createdTask);
      expect(mockTaskRepository.createTask).toHaveBeenCalledWith({
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
      });
      expect(mockPublisher.publishFromTaskData).toHaveBeenCalledWith(createdTask.id, request.userEmail, request.userQuery, request.baseUrl);
    });

    it('should handle task creation failure', async () => {
      const request: CreateTaskRequestDto = {
        userEmail: 'test@example.com',
        userQuery: 'Find product information',
        baseUrl: 'https://example.com',
        status: 'new',
      };

      const error = new Error('Database connection failed');
      mockTaskRepository.createTask.mockRejectedValue(error);

      await expect(handler.handleNewTask(request)).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create task', {
        error: 'Database connection failed',
        userEmail: request.userEmail,
        baseUrl: request.baseUrl,
      });
      expect(mockPublisher.publishFromTaskData).not.toHaveBeenCalled();
    });

    it('should handle publishing failure after successful task creation', async () => {
      const request: CreateTaskRequestDto = {
        userEmail: 'test@example.com',
        userQuery: 'Find product information',
        baseUrl: 'https://example.com',
        status: 'new',
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({
        success: false,
        error: 'Kafka connection failed',
      });

      const result = await handler.handleNewTask(request);

      expect(result).toEqual(createdTask);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to publish web crawl request', {
        taskId: createdTask.id,
        error: 'Kafka connection failed',
      });
    });

    it('should propagate trace context through the workflow', async () => {
      const request: CreateTaskRequestDto = {
        userEmail: 'test@example.com',
        userQuery: 'Find product information',
        baseUrl: 'https://example.com',
        status: 'new',
        traceContext: {
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlationId: 'corr-123',
        },
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      await handler.handleNewTask(request);

      expect(mockPublisher.publishFromTaskData).toHaveBeenCalledWith(createdTask.id, request.userEmail, request.userQuery, request.baseUrl, request.traceContext);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'completed';
      const additionalData = { crawl_result: 'Product found successfully' };

      const updatedTask = {
        id: taskId,
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.updateTaskStatus.mockResolvedValue(updatedTask);

      const result = await handler.updateTaskStatus(taskId, status, additionalData);

      expect(result).toEqual(updatedTask);
      expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(taskId, status, additionalData);
    });

    it('should handle task status update failure', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'completed';

      const error = new Error('Task not found');
      mockTaskRepository.updateTaskStatus.mockRejectedValue(error);

      await expect(handler.updateTaskStatus(taskId, status)).rejects.toThrow('Task not found');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update task status', {
        taskId,
        status,
        error: 'Task not found',
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid request data', async () => {
      const invalidRequest = {
        userEmail: 'invalid-email',
        userQuery: '',
        baseUrl: 'not-a-url',
        status: 'invalid-status',
      } as CreateTaskRequestDto;

      await expect(handler.handleNewTask(invalidRequest)).rejects.toThrow();
    });

    it('should handle empty trace context', async () => {
      const request: CreateTaskRequestDto = {
        userEmail: 'test@example.com',
        userQuery: 'Find product information',
        baseUrl: 'https://example.com',
        status: 'new',
        // No trace context
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      const result = await handler.handleNewTask(request);

      expect(result).toEqual(createdTask);
      expect(mockPublisher.publishFromTaskData).toHaveBeenCalledWith(createdTask.id, request.userEmail, request.userQuery, request.baseUrl, undefined);
    });

    it('should handle very long user queries', async () => {
      const request: CreateTaskRequestDto = {
        userEmail: 'test@example.com',
        userQuery: 'a'.repeat(1000), // Long query
        baseUrl: 'https://example.com',
        status: 'new',
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_email: request.userEmail,
        user_query: request.userQuery,
        base_url: request.baseUrl,
        status: request.status,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      const result = await handler.handleNewTask(request);

      expect(result).toEqual(createdTask);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent task creation', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        userEmail: `user${i}@example.com`,
        userQuery: `Query ${i}`,
        baseUrl: 'https://example.com',
        status: 'new' as const,
      }));

      const createdTasks = requests.map((_, i) => ({
        id: `123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`,
        user_email: `user${i}@example.com`,
        user_query: `Query ${i}`,
        base_url: 'https://example.com',
        status: 'new',
        created_at: new Date(),
        updated_at: new Date(),
      }));

      mockTaskRepository.createTask.mockImplementation((data) => {
        const index = requests.findIndex((r) => r.userEmail === data.user_email);
        return Promise.resolve(createdTasks[index]);
      });
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      const results = await Promise.all(requests.map((req) => handler.handleNewTask(req)));

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.id).toBe(createdTasks[i].id);
      });
    });

    it('should handle rapid task creation', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const request: CreateTaskRequestDto = {
          userEmail: `user${i}@example.com`,
          userQuery: `Query ${i}`,
          baseUrl: 'https://example.com',
          status: 'new',
        };

        const createdTask = {
          id: `123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`,
          user_email: request.userEmail,
          user_query: request.userQuery,
          base_url: request.baseUrl,
          status: request.status,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockTaskRepository.createTask.mockResolvedValue(createdTask);
        mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

        await handler.handleNewTask(request);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });
});
```

### Integration Tests

**File**: `src/api/rest/handlers/__tests__/new-task.handler.integration.spec.ts`

```typescript
import { NewTaskHandler } from '../new-task.handler';
import { WebCrawlTaskRepositoryAdapter } from '../../../../infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';
import { WebCrawlRequestPublisher } from '../../../../infrastructure/messaging/kafka/web-crawl-request.publisher.adapter';
import { PostgresFactory } from '../../../../infrastructure/persistence/postgres/postgres.factory';
import { KafkaClient } from '../../../../common/clients/kafka-client';
import { LoggerFactory } from '../../../../common/utils/logging';

describe('NewTaskHandler Integration', () => {
  let handler: NewTaskHandler;
  let repository: WebCrawlTaskRepositoryAdapter;
  let publisher: WebCrawlRequestPublisher;
  let postgresFactory: PostgresFactory;
  let kafkaClient: KafkaClient;
  let logger: any;

  beforeAll(async () => {
    // Setup test database and Kafka connections
    postgresFactory = new PostgresFactory(/* test config */);
    kafkaClient = new KafkaClient(/* test config */);
    logger = LoggerFactory.createLogger('test');

    repository = new WebCrawlTaskRepositoryAdapter(logger, postgresFactory);
    publisher = new WebCrawlRequestPublisher(kafkaClient, logger);
    handler = new NewTaskHandler(repository, publisher, logger);
  });

  afterAll(async () => {
    await postgresFactory.close();
    await kafkaClient.disconnect();
  });

  it('should create task and publish request end-to-end', async () => {
    const request = {
      userEmail: 'integration@example.com',
      userQuery: 'Integration test query',
      baseUrl: 'https://example.com',
      status: 'new' as const,
    };

    const result = await handler.handleNewTask(request);

    expect(result.id).toBeDefined();
    expect(result.user_email).toBe(request.userEmail);
    expect(result.user_query).toBe(request.userQuery);
    expect(result.base_url).toBe(request.baseUrl);
    expect(result.status).toBe(request.status);

    // Verify task exists in database
    const dbTask = await repository.getTaskById(result.id);
    expect(dbTask).toBeDefined();
    expect(dbTask.id).toBe(result.id);
  });
});
```

## Potential Issues and Mitigations

### 1. DTO Integration

**Issue**: New DTO structure might not integrate properly with existing handlers
**Mitigation**: Comprehensive testing of all DTO transformations

### 2. Trace Context Propagation

**Issue**: Trace context might not be properly propagated through all layers
**Mitigation**: Add trace context validation and logging

### 3. UUID Generation

**Issue**: PostgreSQL UUID generation might fail
**Mitigation**: Add fallback UUID generation and error handling

### 4. Database Connection Failures

**Issue**: Database connections might fail during task creation
**Mitigation**: Proper connection pooling and retry mechanisms

### 5. Kafka Publishing Failures

**Issue**: Kafka publishing might fail after successful task creation
**Mitigation**: Graceful handling and logging of publishing failures

## Success Criteria

- [ ] New task handler uses new DTO structure correctly
- [ ] Trace context is propagated through all layers
- [ ] UUID generation works with PostgreSQL
- [ ] Web crawl request publishing works correctly
- [ ] All error scenarios are handled properly
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Performance is acceptable under load
- [ ] Error logging includes trace context

## Dependencies

- PRD: Trace ID Logging and UUID Generation
- Job 01: Trace Logging Utilities
- Job 02: Database UUID Generation
- Job 04: Web Crawl Request DTOs
- Job 05: API DTOs Refactoring
- Job 06: Kafka Publisher Implementation

## Estimated Effort

- **Development**: 1 day
- **Testing**: 1 day
- **Total**: 2 days

## Notes

- This job integrates all previous foundation work
- New DTO structure must be properly integrated
- Trace context must be maintained throughout the workflow
- UUID generation should be handled by PostgreSQL
- Web crawl request publishing must work with trace context
- Comprehensive error handling and logging is essential
- Performance testing should be included
