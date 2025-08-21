import { logger } from '../../common/utils/logger';

// Simple logger interface for backward compatibility
interface ILogger {
  debug(message: string, info?: Record<string, any>): void;
  info(message: string, info?: Record<string, any>): void;
  warn(message: string, info?: Record<string, any>): void;
  error(message: string, info?: Record<string, any>): void;
  success(message: string, info?: Record<string, any>): void;
  child(additionalContext: Record<string, any>): ILogger;
}
import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { WebCrawlTaskManagerService } from './web-crawl-task-manager.service';
import { IWebCrawlTaskRepositoryPort } from '../../infrastructure/ports/web-crawl-task-repository.port';
import { IWebCrawlMetricsDataPort } from '../../infrastructure/ports/web-crawl-metrics-data.port';
import { WebCrawlMetricsService } from '../metrics/services/WebCrawlMetricsService';
import { WebCrawlTaskRepositoryAdapter } from '../../infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter';
import { WebCrawlMetricsAdapter } from '../../infrastructure/persistence/postgres/adapters/WebCrawlMetricsAdapter';
import { PostgresFactory } from '../../infrastructure/persistence/postgres/postgres.factory';
import { WebCrawlRequestPublisher } from '../../infrastructure/messaging/kafka/publishers/web-crawl-request.publisher';
import { NewTaskHandler } from '../../api/kafka/handlers/task-status/new-task.handler';
import { TaskStatusRouterHandler } from '../../api/kafka/handlers/task-status/task-status-router.handler';
import { postgresConfig } from '../../config';

/**
 * Application Factory
 *
 * Provides factory functions to create application services with proper dependency injection.
 * Handles service initialization and returns properly configured ports.
 *
 * This factory class follows the Factory pattern to centralize the creation
 * of application services. It ensures proper dependency injection and
 * provides a clean interface for service instantiation.
 *
 * The factory methods create services with their required dependencies
 * and return them as ports (interfaces) to maintain loose coupling.
 */
export class ApplicationFactory {
  private readonly logger: ILogger;
  private readonly postgresFactory: PostgresFactory;

  constructor() {
    this.logger = logger;
    this.postgresFactory = new PostgresFactory(postgresConfig);
  }

  /**
   * Create web crawl task manager service with all dependencies
   */
  createWebCrawlTaskManagerService(): IWebCrawlTaskManagerPort {
    this.logger.info('Creating web crawl task manager service');

    const taskRepository = this.createTaskRepository();
    const service = new WebCrawlTaskManagerService(taskRepository);

    // Remove: 'Web crawl task manager service created successfully' - no need to log successful creation
    return service;
  }

  /**
   * Create web crawl metrics service with all dependencies
   */
  createWebCrawlMetricsService(): WebCrawlMetricsService {
    this.logger.info('Creating web crawl metrics service');

    const metricsDataPort = this.createMetricsDataPort();
    const service = new WebCrawlMetricsService(metricsDataPort);

    // Remove: 'Web crawl metrics service created successfully' - no need to log successful creation
    return service;
  }

  /**
   * Create new task handler with all dependencies
   */
  createNewTaskHandler(): NewTaskHandler {
    this.logger.info('Creating new task handler');

    const taskManagerService = this.createWebCrawlTaskManagerService();
    const webCrawlPublisher = this.createWebCrawlRequestPublisher();
    const handler = new NewTaskHandler(taskManagerService, webCrawlPublisher);

    // Remove: 'New task handler created successfully' - no need to log successful creation
    return handler;
  }

  /**
   * Create task status router handler with all dependencies
   */
  createTaskStatusRouterHandler(): TaskStatusRouterHandler {
    this.logger.info('Creating task status router handler');

    const taskManagerService = this.createWebCrawlTaskManagerService();
    const router = new TaskStatusRouterHandler(taskManagerService);

    // Remove: 'Task status router handler created successfully' - no need to log successful creation
    return router;
  }

  /**
   * Create task repository adapter
   */
  private createTaskRepository(): IWebCrawlTaskRepositoryPort {
    this.logger.info('Creating task repository adapter');

    const adapter = new WebCrawlTaskRepositoryAdapter(this.postgresFactory);

    // Remove: 'Task repository adapter created successfully' - no need to log successful creation
    return adapter;
  }

  /**
   * Create metrics data port
   */
  private createMetricsDataPort(): IWebCrawlMetricsDataPort {
    this.logger.info('Creating metrics data port');

    const adapter = new WebCrawlMetricsAdapter(this.postgresFactory.getPool());

    // Remove: 'Metrics data port created successfully' - no need to log successful creation
    return adapter;
  }

  /**
   * Create web crawl request publisher
   */
  private createWebCrawlRequestPublisher(): WebCrawlRequestPublisher {
    this.logger.info('Creating web crawl request publisher');

    const publisher = new WebCrawlRequestPublisher();

    // Remove: 'Web crawl request publisher created successfully' - no need to log successful creation
    return publisher;
  }

  /**
   * Creates a web crawl task manager service with proper dependency injection
   *
   * This factory method creates a WebCrawlTaskManagerService instance and
   * injects the required repository dependency. The service is returned
   * as an interface to maintain loose coupling.
   *
   * @param webCrawlTaskRepository - The repository port to inject for data persistence
   * @returns IWebCrawlTaskManagerPort - Configured task manager service
   *
   * @example
   * ```typescript
   * const taskManager = ApplicationFactory.createWebCrawlTaskManager(repository);
   * const task = await taskManager.createWebCrawlTask(id, email, query, url);
   * ```
   */
  public static createWebCrawlTaskManager(
    webCrawlTaskRepository: IWebCrawlTaskRepositoryPort
  ): IWebCrawlTaskManagerPort {
    logger.debug('Creating WebCrawlTaskManagerService');
    return new WebCrawlTaskManagerService(webCrawlTaskRepository);
  }

  /**
   * Creates a web crawl metrics service with proper dependency injection
   *
   * This factory method creates a WebCrawlMetricsService instance and
   * injects the required metrics data port dependency. The service provides
   * metrics collection and reporting capabilities.
   *
   * @param metricsDataPort - The metrics data port to inject for metrics operations
   * @returns WebCrawlMetricsService - Configured metrics service
   *
   * @example
   * ```typescript
   * const metricsService = ApplicationFactory.createWebCrawlMetricsService(metricsAdapter);
   * const metrics = await metricsService.getMetrics({ hours: 24 });
   * ```
   */
  public static createWebCrawlMetricsService(
    metricsDataPort: IWebCrawlMetricsDataPort
  ): WebCrawlMetricsService {
    logger.debug('Creating WebCrawlMetricsService');
    return new WebCrawlMetricsService(metricsDataPort);
  }
}
