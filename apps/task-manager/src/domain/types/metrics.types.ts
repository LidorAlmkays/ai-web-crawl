/**
 * Domain Types for Metrics
 *
 * This file contains TypeScript interfaces that define the structure
 * of metrics data used throughout the Task Manager application.
 *
 * These types represent the core domain concepts for metrics collection
 * and reporting.
 */

/**
 * Interface representing web crawl task metrics data
 *
 * This interface defines the structure for aggregated metrics about
 * web crawling tasks, including counts by status and temporal information.
 *
 * @property newTasksCount - Number of tasks with NEW status
 * @property completedTasksCount - Number of tasks with COMPLETED status
 * @property errorTasksCount - Number of tasks with ERROR status
 * @property totalTasksCount - Number of all tasks created in time range regardless of status
 * @property timeRange - Human-readable description of the time range (e.g., "Last 24 hours")
 * @property timestamp - ISO timestamp when the metrics were calculated
 * @property lastUpdated - ISO timestamp when the metrics were last updated
 *
 * @example
 * ```typescript
 * const metrics: WebCrawlMetrics = {
 *   newTasksCount: 5,
 *   completedTasksCount: 150,
 *   errorTasksCount: 3,
 *   totalTasksCount: 158,
 *   timeRange: "Last 24 hours",
 *   timestamp: "2024-01-15T10:30:00Z",
 *   lastUpdated: "2024-01-15T10:30:00Z"
 * };
 * ```
 */
export interface WebCrawlMetrics {
  newTasksCount: number;
  completedTasksCount: number;
  errorTasksCount: number;
  totalTasksCount: number;
  timeRange: string;
  timestamp: string;
  lastUpdated: string;
}

/**
 * Interface for metrics query parameters
 *
 * This interface defines the parameters that can be used to filter
 * and customize metrics queries.
 *
 * @property hours - Optional number of hours to look back for metrics calculation
 *
 * @example
 * ```typescript
 * const queryParams: MetricsQueryParams = {
 *   hours: 24
 * };
 * ```
 */
export interface MetricsQueryParams {
  hours?: number;
}
