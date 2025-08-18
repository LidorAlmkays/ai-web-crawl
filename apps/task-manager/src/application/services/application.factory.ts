import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { WebCrawlTaskManagerService } from './web-crawl-task-manager.service';
import { IWebCrawlTaskRepositoryPort } from '../../infrastructure/ports/web-crawl-task-repository.port';
import { IWebCrawlMetricsDataPort } from '../../infrastructure/ports/web-crawl-metrics-data.port';
import { WebCrawlMetricsService } from '../metrics/services/WebCrawlMetricsService';
import { logger } from '../../common/utils/logger';

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
