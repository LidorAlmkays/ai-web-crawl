# Job 08: Update Application Services

## Status

**COMPLETED**

## Overview

Update application services to integrate with the new DTO structure, trace context propagation, and enhanced logging. This job focuses on updating the application layer services to work with the refactored DTOs and new infrastructure.

## Objectives

- Update application services to use new DTO structure
- Integrate trace context propagation
- Enhance service layer logging
- Update dependency injection
- Ensure proper error handling

## Files to Modify

### Files to Modify

- `src/application/services/application.factory.ts` - Update dependency injection
- `src/application/metrics/services/WebCrawlMetricsService.ts` - Update metrics service
- `src/app.ts` - Update application composition root
- `src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts` - Update metrics adapter

## Detailed Implementation

### 1. Update Application Factory

**File**: `src/application/services/application.factory.ts`

```typescript
import { ILogger } from '../../common/utils/logging/interfaces';
import { LoggerFactory } from '../../common/utils/logging/logger-factory';
import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { IWebCrawlTaskRepositoryPort } from '../../infrastructure/ports/web-crawl-task-repository.port';
import { IWebCrawlMetricsDataPort } from '../../infrastructure/ports/web-crawl-metrics-data.port';
import { WebCrawlTaskManagerService } from './web-crawl-task-manager.service';
import { WebCrawlMetricsService } from '../metrics/services/WebCrawlMetricsService';
import { WebCrawlTaskRepositoryAdapter } from '../../infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';
import { WebCrawlMetricsAdapter } from '../../infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlRequestPublisher } from '../../api/kafka/publishers/web-crawl-request.publisher';
import { NewTaskHandler } from '../../api/kafka/handlers/task-status/new-task.handler';
import { TaskStatusRouterHandler } from '../../api/kafka/handlers/task-status/task-status-router.handler';

export class ApplicationFactory {
  private readonly logger: ILogger;
  private readonly postgresFactory: PostgresFactory;

  constructor() {
    this.logger = LoggerFactory.createLogger('ApplicationFactory');
    this.postgresFactory = new PostgresFactory();
  }

  /**
   * Create web crawl task manager service with all dependencies
   */
  createWebCrawlTaskManagerService(): IWebCrawlTaskManagerPort {
    this.logger.info('Creating web crawl task manager service');

    const taskRepository = this.createTaskRepository();
    const service = new WebCrawlTaskManagerService(this.logger, taskRepository);

    this.logger.info('Web crawl task manager service created successfully');
    return service;
  }

  /**
   * Create web crawl metrics service with all dependencies
   */
  createWebCrawlMetricsService(): WebCrawlMetricsService {
    this.logger.info('Creating web crawl metrics service');

    const metricsDataPort = this.createMetricsDataPort();
    const service = new WebCrawlMetricsService(this.logger, metricsDataPort);

    this.logger.info('Web crawl metrics service created successfully');
    return service;
  }

  /**
   * Create new task handler with all dependencies
   */
  createNewTaskHandler(): NewTaskHandler {
    this.logger.info('Creating new task handler');

    const taskManagerService = this.createWebCrawlTaskManagerService();
    const webCrawlPublisher = this.createWebCrawlRequestPublisher();
    const handler = new NewTaskHandler(this.logger, taskManagerService, webCrawlPublisher);

    this.logger.info('New task handler created successfully');
    return handler;
  }

  /**
   * Create task status router handler with all dependencies
   */
  createTaskStatusRouterHandler(): TaskStatusRouterHandler {
    this.logger.info('Creating task status router handler');

    const newTaskHandler = this.createNewTaskHandler();
    const completeTaskHandler = this.createCompleteTaskHandler();
    const errorTaskHandler = this.createErrorTaskHandler();
    const router = new TaskStatusRouterHandler(this.logger, newTaskHandler, completeTaskHandler, errorTaskHandler);

    this.logger.info('Task status router handler created successfully');
    return router;
  }

  /**
   * Create task repository adapter
   */
  private createTaskRepository(): IWebCrawlTaskRepositoryPort {
    this.logger.info('Creating task repository adapter');

    const adapter = new WebCrawlTaskRepositoryAdapter(this.logger, this.postgresFactory);

    this.logger.info('Task repository adapter created successfully');
    return adapter;
  }

  /**
   * Create metrics data port
   */
  private createMetricsDataPort(): IWebCrawlMetricsDataPort {
    this.logger.info('Creating metrics data port');

    const adapter = new WebCrawlMetricsAdapter(this.logger, this.postgresFactory);

    this.logger.info('Metrics data port created successfully');
    return adapter;
  }

  /**
   * Create web crawl request publisher
   */
  private createWebCrawlRequestPublisher(): WebCrawlRequestPublisher {
    this.logger.info('Creating web crawl request publisher');

    const publisher = new WebCrawlRequestPublisher(this.logger);

    this.logger.info('Web crawl request publisher created successfully');
    return publisher;
  }

  /**
   * Create complete task handler
   */
  private createCompleteTaskHandler(): any {
    this.logger.info('Creating complete task handler');

    const taskManagerService = this.createWebCrawlTaskManagerService();
    const handler = new CompleteTaskHandler(this.logger, taskManagerService);

    this.logger.info('Complete task handler created successfully');
    return handler;
  }

  /**
   * Create error task handler
   */
  private createErrorTaskHandler(): any {
    this.logger.info('Creating error task handler');

    const taskManagerService = this.createWebCrawlTaskManagerService();
    const handler = new ErrorTaskHandler(this.logger, taskManagerService);

    this.logger.info('Error task handler created successfully');
    return handler;
  }
}
```

### 2. Update Web Crawl Metrics Service

**File**: `src/application/metrics/services/WebCrawlMetricsService.ts`

```typescript
import { ILogger } from '../../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../../common/utils/trace-logging';
import { IWebCrawlMetricsDataPort } from '../../../infrastructure/ports/web-crawl-metrics-data.port';
import { WebCrawlMetrics } from '../../../domain/types/metrics.types';

export class WebCrawlMetricsService {
  private readonly logger: ILogger;
  private readonly metricsDataPort: IWebCrawlMetricsDataPort;

  constructor(logger: ILogger, metricsDataPort: IWebCrawlMetricsDataPort) {
    this.logger = logger;
    this.metricsDataPort = metricsDataPort;
  }

  /**
   * Get web crawl metrics with enhanced trace logging
   */
  async getWebCrawlMetrics(hours: number, traceContext?: any): Promise<WebCrawlMetrics> {
    const traceLogger = traceContext ? TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext) : this.logger;

    traceLogger.info('Retrieving web crawl metrics', {
      hours,
    });

    try {
      const metrics = await this.metricsDataPort.getWebCrawlMetrics(hours);

      traceLogger.info('Web crawl metrics retrieved successfully', {
        hours,
        newTasksCount: metrics.newTasksCount,
        completedTasksCount: metrics.completedTasksCount,
        errorTasksCount: metrics.errorTasksCount,
      });

      return metrics;
    } catch (error) {
      traceLogger.error('Failed to retrieve web crawl metrics', {
        hours,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get task status distribution with enhanced trace logging
   */
  async getTaskStatusDistribution(hours: number, traceContext?: any): Promise<any> {
    const traceLogger = traceContext ? TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext) : this.logger;

    traceLogger.info('Retrieving task status distribution', {
      hours,
    });

    try {
      const distribution = await this.metricsDataPort.getTaskStatusDistribution(hours);

      traceLogger.info('Task status distribution retrieved successfully', {
        hours,
        distribution,
      });

      return distribution;
    } catch (error) {
      traceLogger.error('Failed to retrieve task status distribution', {
        hours,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### 3. Update Application Composition Root

**File**: `src/app.ts`

```typescript
import { ILogger } from './common/utils/logging/interfaces';
import { LoggerFactory } from './common/utils/logging/logger-factory';
import { ApplicationFactory } from './application/services/application.factory';
import { KafkaRouter } from './api/kafka/kafka.router';
import { RestRouter } from './api/rest/rest.router';
import { TraceLoggingUtils } from './common/utils/trace-logging';

export class App {
  private readonly logger: ILogger;
  private readonly applicationFactory: ApplicationFactory;
  private readonly kafkaRouter: KafkaRouter;
  private readonly restRouter: RestRouter;

  constructor() {
    this.logger = LoggerFactory.createLogger('App');
    this.applicationFactory = new ApplicationFactory();

    // Initialize routers with enhanced trace logging
    this.kafkaRouter = this.createKafkaRouter();
    this.restRouter = this.createRestRouter();
  }

  /**
   * Initialize the application with enhanced trace logging
   */
  async initialize(): Promise<void> {
    const traceContext = TraceLoggingUtils.createTraceContext();
    const traceLogger = TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext);

    traceLogger.info('Initializing application');

    try {
      // Initialize Kafka router
      await this.kafkaRouter.initialize();

      // Initialize REST router
      await this.restRouter.initialize();

      traceLogger.info('Application initialized successfully');
    } catch (error) {
      traceLogger.error('Failed to initialize application', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start the application with enhanced trace logging
   */
  async start(): Promise<void> {
    const traceContext = TraceLoggingUtils.createTraceContext();
    const traceLogger = TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext);

    traceLogger.info('Starting application');

    try {
      // Start Kafka consumers
      await this.kafkaRouter.start();

      // Start REST server
      await this.restRouter.start();

      traceLogger.info('Application started successfully');
    } catch (error) {
      traceLogger.error('Failed to start application', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Stop the application with enhanced trace logging
   */
  async stop(): Promise<void> {
    const traceContext = TraceLoggingUtils.createTraceContext();
    const traceLogger = TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext);

    traceLogger.info('Stopping application');

    try {
      // Stop Kafka consumers
      await this.kafkaRouter.stop();

      // Stop REST server
      await this.restRouter.stop();

      traceLogger.info('Application stopped successfully');
    } catch (error) {
      traceLogger.error('Failed to stop application', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create Kafka router with enhanced trace logging
   */
  private createKafkaRouter(): KafkaRouter {
    this.logger.info('Creating Kafka router');

    const taskStatusRouterHandler = this.applicationFactory.createTaskStatusRouterHandler();
    const router = new KafkaRouter(this.logger, taskStatusRouterHandler);

    this.logger.info('Kafka router created successfully');
    return router;
  }

  /**
   * Create REST router with enhanced trace logging
   */
  private createRestRouter(): RestRouter {
    this.logger.info('Creating REST router');

    const webCrawlMetricsService = this.applicationFactory.createWebCrawlMetricsService();
    const router = new RestRouter(this.logger, webCrawlMetricsService);

    this.logger.info('REST router created successfully');
    return router;
  }
}
```

### 4. Update Web Crawl Metrics Adapter

**File**: `src/infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter.ts`

```typescript
import { ILogger } from '../../../../common/utils/logging/interfaces';
import { IWebCrawlMetricsDataPort } from '../../../ports/web-crawl-metrics-data.port';
import { WebCrawlMetrics } from '../../../../domain/types/metrics.types';
import { PostgresFactory } from '../postgres.factory';

export class WebCrawlMetricsAdapter implements IWebCrawlMetricsDataPort {
  private readonly logger: ILogger;
  private readonly postgresFactory: PostgresFactory;

  constructor(logger: ILogger, postgresFactory: PostgresFactory) {
    this.logger = logger;
    this.postgresFactory = postgresFactory;
  }

  /**
   * Get web crawl metrics with enhanced trace logging
   */
  async getWebCrawlMetrics(hours: number): Promise<WebCrawlMetrics> {
    this.logger.info('Retrieving web crawl metrics from database', {
      hours,
    });

    try {
      const client = await this.postgresFactory.getClient();

      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'NEW') as new_tasks_count,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_tasks_count,
          COUNT(*) FILTER (WHERE status = 'ERROR') as error_tasks_count,
          COUNT(*) as total_tasks_count
        FROM web_crawl_tasks 
        WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      `;

      const result = await client.query(query);
      const row = result.rows[0];

      const metrics: WebCrawlMetrics = {
        newTasksCount: parseInt(row.new_tasks_count) || 0,
        completedTasksCount: parseInt(row.completed_tasks_count) || 0,
        errorTasksCount: parseInt(row.error_tasks_count) || 0,
        totalTasksCount: parseInt(row.total_tasks_count) || 0,
      };

      this.logger.info('Web crawl metrics retrieved from database successfully', {
        hours,
        newTasksCount: metrics.newTasksCount,
        completedTasksCount: metrics.completedTasksCount,
        errorTasksCount: metrics.errorTasksCount,
        totalTasksCount: metrics.totalTasksCount,
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to retrieve web crawl metrics from database', {
        hours,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get task status distribution with enhanced trace logging
   */
  async getTaskStatusDistribution(hours: number): Promise<any> {
    this.logger.info('Retrieving task status distribution from database', {
      hours,
    });

    try {
      const client = await this.postgresFactory.getClient();

      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM web_crawl_tasks 
        WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY status
        ORDER BY status
      `;

      const result = await client.query(query);
      const distribution = result.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count) || 0;
        return acc;
      }, {});

      this.logger.info('Task status distribution retrieved from database successfully', {
        hours,
        distribution,
      });

      return distribution;
    } catch (error) {
      this.logger.error('Failed to retrieve task status distribution from database', {
        hours,
        error: error.message,
      });
      throw error;
    }
  }
}
```

## Testing Strategy

### Unit Tests

**File**: `src/application/services/__tests__/application.factory.spec.ts`

```typescript
import { ApplicationFactory } from '../application.factory';
import { ILogger } from '../../../common/utils/logging/interfaces';
import { PostgresFactory } from '../../../infrastructure/persistence/postgres/postgres.factory';
import { KafkaClient } from '../../../common/clients/kafka-client';

describe('ApplicationFactory', () => {
  let factory: ApplicationFactory;
  let mockLogger: jest.Mocked<ILogger>;
  let mockPostgresFactory: jest.Mocked<PostgresFactory>;
  let mockKafkaClient: jest.Mocked<KafkaClient>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    };

    mockPostgresFactory = {
      getClient: jest.fn(),
      close: jest.fn(),
    } as any;

    mockKafkaClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(),
      produce: jest.fn(),
      getMetadata: jest.fn(),
    } as any;

    factory = new ApplicationFactory(mockLogger, mockPostgresFactory, mockKafkaClient);
  });

  describe('createWebCrawlTaskManagerService', () => {
    it('should create WebCrawlTaskManagerService with all dependencies', () => {
      const service = factory.createWebCrawlTaskManagerService();

      expect(service).toBeDefined();
      expect(service).toHaveProperty('createTask');
      expect(service).toHaveProperty('updateTaskStatus');
      expect(service).toHaveProperty('getTaskById');
    });

    it('should inject correct dependencies into WebCrawlTaskManagerService', () => {
      const service = factory.createWebCrawlTaskManagerService();

      // Verify that the service has access to the injected dependencies
      expect(service['taskRepository']).toBeDefined();
      expect(service['publisher']).toBeDefined();
      expect(service['logger']).toBe(mockLogger);
    });
  });

  describe('createWebCrawlMetricsService', () => {
    it('should create WebCrawlMetricsService with correct dependencies', () => {
      const service = factory.createWebCrawlMetricsService();

      expect(service).toBeDefined();
      expect(service).toHaveProperty('getWebCrawlMetrics');
      expect(service).toHaveProperty('getTaskStatusDistribution');
    });

    it('should inject metrics data port into WebCrawlMetricsService', () => {
      const service = factory.createWebCrawlMetricsService();

      expect(service['metricsDataPort']).toBeDefined();
      expect(service['logger']).toBe(mockLogger);
    });
  });

  describe('createWebCrawlRequestPublisher', () => {
    it('should create WebCrawlRequestPublisher with Kafka client', () => {
      const publisher = factory.createWebCrawlRequestPublisher();

      expect(publisher).toBeDefined();
      expect(publisher).toHaveProperty('publishMessage');
      expect(publisher).toHaveProperty('publishFromTaskData');
    });

    it('should inject Kafka client and logger into publisher', () => {
      const publisher = factory.createWebCrawlRequestPublisher();

      expect(publisher['kafkaClient']).toBe(mockKafkaClient);
      expect(publisher['logger']).toBe(mockLogger);
    });
  });

  describe('createWebCrawlTaskRepository', () => {
    it('should create WebCrawlTaskRepositoryAdapter with PostgresFactory', () => {
      const repository = factory.createWebCrawlTaskRepository();

      expect(repository).toBeDefined();
      expect(repository).toHaveProperty('createTask');
      expect(repository).toHaveProperty('updateTaskStatus');
    });

    it('should inject PostgresFactory and logger into repository', () => {
      const repository = factory.createWebCrawlTaskRepository();

      expect(repository['postgresFactory']).toBe(mockPostgresFactory);
      expect(repository['logger']).toBe(mockLogger);
    });
  });

  describe('createWebCrawlMetricsAdapter', () => {
    it('should create WebCrawlMetricsAdapter with PostgresFactory', () => {
      const adapter = factory.createWebCrawlMetricsAdapter();

      expect(adapter).toBeDefined();
      expect(adapter).toHaveProperty('getWebCrawlMetrics');
      expect(adapter).toHaveProperty('getNewTasksCount');
    });

    it('should inject PostgresFactory and logger into adapter', () => {
      const adapter = factory.createWebCrawlMetricsAdapter();

      expect(adapter['postgresFactory']).toBe(mockPostgresFactory);
      expect(adapter['logger']).toBe(mockLogger);
    });
  });

  describe('Dependency Injection Validation', () => {
    it('should not create circular dependencies', () => {
      // This test ensures that the factory can create all services without circular dependencies
      expect(() => {
        factory.createWebCrawlTaskManagerService();
        factory.createWebCrawlMetricsService();
        factory.createWebCrawlRequestPublisher();
        factory.createWebCrawlTaskRepository();
        factory.createWebCrawlMetricsAdapter();
      }).not.toThrow();
    });

    it('should create services with correct interfaces', () => {
      const taskManagerService = factory.createWebCrawlTaskManagerService();
      const metricsService = factory.createWebCrawlMetricsService();

      // Verify that services implement the correct interfaces
      expect(typeof taskManagerService.createTask).toBe('function');
      expect(typeof taskManagerService.updateTaskStatus).toBe('function');
      expect(typeof metricsService.getWebCrawlMetrics).toBe('function');
    });
  });
});
```

**File**: `src/application/services/__tests__/web-crawl-task-manager.service.spec.ts`

```typescript
import { WebCrawlTaskManagerService } from '../web-crawl-task-manager.service';
import { IWebCrawlTaskRepositoryPort } from '../../../infrastructure/ports/web-crawl-task-repository.port';
import { IWebCrawlRequestPublisherPort } from '../../../infrastructure/ports/web-crawl-request-publisher.port';
import { ILogger } from '../../../common/utils/logging/interfaces';
import { TraceLoggingUtils } from '../../../common/utils/trace-logging';

describe('WebCrawlTaskManagerService', () => {
  let service: WebCrawlTaskManagerService;
  let mockTaskRepository: jest.Mocked<IWebCrawlTaskRepositoryPort>;
  let mockPublisher: jest.Mocked<IWebCrawlRequestPublisherPort>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockTaskRepository = {
      createTask: jest.fn(),
      updateTaskStatus: jest.fn(),
      getTaskById: jest.fn(),
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

    service = new WebCrawlTaskManagerService(mockTaskRepository, mockPublisher, mockLogger);
  });

  describe('createTask', () => {
    it('should create task and publish request successfully', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'new',
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...taskData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      const result = await service.createTask(taskData);

      expect(result).toEqual(createdTask);
      expect(mockTaskRepository.createTask).toHaveBeenCalledWith(taskData);
      expect(mockPublisher.publishFromTaskData).toHaveBeenCalledWith(createdTask.id, taskData.user_email, taskData.user_query, taskData.base_url);
    });

    it('should handle task creation failure', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'new',
      };

      const error = new Error('Database connection failed');
      mockTaskRepository.createTask.mockRejectedValue(error);

      await expect(service.createTask(taskData)).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create task', {
        error: 'Database connection failed',
        userEmail: taskData.user_email,
        baseUrl: taskData.base_url,
      });
    });

    it('should handle publishing failure after successful task creation', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'new',
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...taskData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({
        success: false,
        error: 'Kafka connection failed',
      });

      const result = await service.createTask(taskData);

      expect(result).toEqual(createdTask);
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to publish web crawl request', {
        taskId: createdTask.id,
        error: 'Kafka connection failed',
      });
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

      const result = await service.updateTaskStatus(taskId, status, additionalData);

      expect(result).toEqual(updatedTask);
      expect(mockTaskRepository.updateTaskStatus).toHaveBeenCalledWith(taskId, status, additionalData);
    });

    it('should handle task status update failure', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const status = 'completed';

      const error = new Error('Task not found');
      mockTaskRepository.updateTaskStatus.mockRejectedValue(error);

      await expect(service.updateTaskStatus(taskId, status)).rejects.toThrow('Task not found');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update task status', {
        taskId,
        status,
        error: 'Task not found',
      });
    });
  });

  describe('getTaskById', () => {
    it('should retrieve task by ID successfully', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const task = {
        id: taskId,
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.getTaskById.mockResolvedValue(task);

      const result = await service.getTaskById(taskId);

      expect(result).toEqual(task);
      expect(mockTaskRepository.getTaskById).toHaveBeenCalledWith(taskId);
    });

    it('should handle task not found', async () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';

      mockTaskRepository.getTaskById.mockResolvedValue(null);

      const result = await service.getTaskById(taskId);

      expect(result).toBeNull();
    });
  });

  describe('Trace Context and Logging', () => {
    it('should log with trace context when available', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'new',
        traceContext: {
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
          correlationId: 'corr-123',
        },
      };

      const createdTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...taskData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTaskRepository.createTask.mockResolvedValue(createdTask);
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      await service.createTask(taskData);

      expect(mockLogger.info).toHaveBeenCalledWith('Task created successfully', {
        taskId: createdTask.id,
        userEmail: taskData.user_email,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid task data', async () => {
      const invalidTaskData = {
        user_email: 'invalid-email',
        user_query: '',
        base_url: 'not-a-url',
        status: 'invalid-status',
      };

      await expect(service.createTask(invalidTaskData)).rejects.toThrow();
    });

    it('should handle concurrent task creation', async () => {
      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        status: 'new',
      };

      const createdTasks = Array.from({ length: 5 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`,
        ...taskData,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      mockTaskRepository.createTask.mockImplementation((data) => {
        const index = Math.floor(Math.random() * 5);
        return Promise.resolve(createdTasks[index]);
      });
      mockPublisher.publishFromTaskData.mockResolvedValue({ success: true });

      const promises = Array.from({ length: 5 }, () => service.createTask(taskData));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.id).toBeDefined();
      });
    });
  });
});
```

### Integration Tests

**File**: `src/application/services/__tests__/application.services.integration.spec.ts`

```typescript
import { ApplicationFactory } from '../application.factory';
import { WebCrawlTaskManagerService } from '../web-crawl-task-manager.service';
import { WebCrawlMetricsService } from '../WebCrawlMetricsService';
import { PostgresFactory } from '../../../infrastructure/persistence/postgres/postgres.factory';
import { KafkaClient } from '../../../common/clients/kafka-client';
import { LoggerFactory } from '../../../common/utils/logging';

describe('Application Services Integration', () => {
  let factory: ApplicationFactory;
  let taskManagerService: WebCrawlTaskManagerService;
  let metricsService: WebCrawlMetricsService;
  let postgresFactory: PostgresFactory;
  let kafkaClient: KafkaClient;
  let logger: any;

  beforeAll(async () => {
    // Setup test database and Kafka connections
    postgresFactory = new PostgresFactory(/* test config */);
    kafkaClient = new KafkaClient(/* test config */);
    logger = LoggerFactory.createLogger('test');

    factory = new ApplicationFactory(logger, postgresFactory, kafkaClient);
    taskManagerService = factory.createWebCrawlTaskManagerService();
    metricsService = factory.createWebCrawlMetricsService();
  });

  afterAll(async () => {
    await postgresFactory.close();
    await kafkaClient.disconnect();
  });

  it('should create task and retrieve metrics end-to-end', async () => {
    // Create a task
    const taskData = {
      user_email: 'integration@example.com',
      user_query: 'Integration test query',
      base_url: 'https://example.com',
      status: 'new',
    };

    const createdTask = await taskManagerService.createTask(taskData);

    expect(createdTask.id).toBeDefined();
    expect(createdTask.user_email).toBe(taskData.user_email);

    // Get metrics
    const metrics = await metricsService.getWebCrawlMetrics(24);

    expect(metrics.totalTasksCount).toBeGreaterThan(0);
    expect(metrics.newTasksCount).toBeGreaterThan(0);
  });

  it('should update task status and reflect in metrics', async () => {
    // Create a task
    const taskData = {
      user_email: 'status-test@example.com',
      user_query: 'Status test query',
      base_url: 'https://example.com',
      status: 'new',
    };

    const createdTask = await taskManagerService.createTask(taskData);

    // Update task status
    const updatedTask = await taskManagerService.updateTaskStatus(createdTask.id, 'completed', { crawl_result: 'Test completed successfully' });

    expect(updatedTask.status).toBe('completed');

    // Verify metrics reflect the change
    const metrics = await metricsService.getWebCrawlMetrics(24);
    expect(metrics.completedTasksCount).toBeGreaterThan(0);
  });
});
```

## Potential Issues and Mitigations

### 1. Dependency Injection Complexity

**Issue**: Complex dependency injection might lead to circular dependencies
**Mitigation**: Careful design of dependency graph and use of interfaces

### 2. Service Integration

**Issue**: Services might not integrate properly with new DTO structure
**Mitigation**: Comprehensive testing of all service integrations

### 3. Trace Context Propagation

**Issue**: Trace context might not be properly propagated through services
**Mitigation**: Add trace context validation and logging

### 4. Service Lifecycle Management

**Issue**: Services might not be properly initialized or cleaned up
**Mitigation**: Proper lifecycle management and resource cleanup

### 5. Error Propagation

**Issue**: Errors might not be properly propagated through service layers
**Mitigation**: Comprehensive error handling and logging

## Success Criteria

- [ ] Application factory creates all dependencies correctly
- [ ] Services use new DTO structure properly
- [ ] Trace context is propagated through all services
- [ ] Enhanced logging works correctly
- [ ] All dependency injection works without circular dependencies
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Service lifecycle is properly managed
- [ ] Error handling is comprehensive

## Dependencies

- PRD: Trace ID Logging and UUID Generation
- Job 01: Trace Logging Utilities
- Job 02: Database UUID Generation
- Job 05: API DTOs Refactoring
- Job 06: Kafka Publisher Implementation

## Estimated Effort

- **Development**: 1 day
- **Testing**: 1 day
- **Total**: 2 days

## Notes

- This job updates the application layer to work with new DTO structure
- Dependency injection must be carefully designed
- Trace context must be propagated through all services
- Enhanced logging should be used throughout
- All services must integrate properly with new infrastructure
- Comprehensive testing is essential for service integration
- Error handling and logging should be consistent across all services
