import { WebCrawlMetrics } from '../../domain/types/metrics.types';

/**
 * Web Crawl Metrics Data Port Interface
 *
 * Defines the contract for metrics data operations in the infrastructure layer.
 * This interface is implemented by infrastructure adapters to provide
 * metrics data access capabilities.
 *
 * The port follows the Clean Architecture pattern and abstracts the
 * data access layer from the application services.
 *
 * NOTE: This port has been moved from application layer to infrastructure layer
 * because it's implemented by infrastructure adapters and used by application services.
 */
export interface IWebCrawlMetricsDataPort {
  /**
   * Retrieves comprehensive web crawl metrics for a specified time range
   *
   * @param hours - Number of hours to look back for metrics calculation
   * @returns Promise resolving to WebCrawlMetrics object with aggregated data
   *
   * @example
   * ```typescript
   * const metrics = await metricsDataPort.getWebCrawlMetrics(24);
   * console.log(`New tasks: ${metrics.newTasksCount}`);
   * ```
   */
  getWebCrawlMetrics(hours: number): Promise<WebCrawlMetrics>;

  /**
   * Retrieves the count of new tasks for a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of new tasks
   *
   * @example
   * ```typescript
   * const newTasksCount = await metricsDataPort.getNewTasksCount(6);
   * console.log(`New tasks in last 6 hours: ${newTasksCount}`);
   * ```
   */
  getNewTasksCount(hours: number): Promise<number>;

  /**
   * Retrieves the count of completed tasks for a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of completed tasks
   *
   * @example
   * ```typescript
   * const completedTasksCount = await metricsDataPort.getCompletedTasksCount(24);
   * console.log(`Completed tasks in last 24 hours: ${completedTasksCount}`);
   * ```
   */
  getCompletedTasksCount(hours: number): Promise<number>;

  /**
   * Retrieves the count of error tasks for a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of error tasks
   *
   * @example
   * ```typescript
   * const errorTasksCount = await metricsDataPort.getErrorTasksCount(12);
   * console.log(`Error tasks in last 12 hours: ${errorTasksCount}`);
   * ```
   */
  getErrorTasksCount(hours: number): Promise<number>;

  /**
   * Retrieves the count of all tasks created within a specified time range
   *
   * @param hours - Number of hours to look back for the count
   * @returns Promise resolving to the count of all tasks created in the time range
   *
   * @example
   * ```typescript
   * const totalTasksCount = await metricsDataPort.getTotalTasksCountByCreationTime(24);
   * console.log(`Total tasks created in last 24 hours: ${totalTasksCount}`);
   * ```
   */
  getTotalTasksCountByCreationTime(hours: number): Promise<number>;
}
