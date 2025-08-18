import { IWebCrawlMetricsDataPort } from '../../../infrastructure/ports/web-crawl-metrics-data.port';
import {
  WebCrawlMetrics,
  MetricsQueryParams,
} from '../../../domain/types/metrics.types';
import { metricsConfig } from '../../../config/metrics';
import { TraceManager } from '../../../common/utils/tracing/trace-manager';

/**
 * WebCrawlMetricsService
 *
 * Application service that provides metrics collection and reporting
 * for web crawling tasks. This service aggregates task data and provides
 * various formats for monitoring and observability.
 *
 * The service handles:
 * - Task count metrics by status
 * - Time-based filtering of metrics
 * - Prometheus format export
 * - Configuration management for metrics collection
 */
export class WebCrawlMetricsService {
  private traceManager = TraceManager.getInstance();

  /**
   * Creates a new WebCrawlMetricsService instance
   *
   * @param metricsDataPort - Data port for retrieving metrics from the infrastructure layer
   */
  constructor(private readonly metricsDataPort: IWebCrawlMetricsDataPort) {}

  /**
   * Retrieves comprehensive web crawl metrics for a specified time range
   *
   * @param params - Optional query parameters for customizing the metrics request
   * @returns Promise resolving to WebCrawlMetrics object with aggregated data
   *
   * @example
   * ```typescript
   * const metrics = await service.getMetrics({ hours: 24 });
   * console.log(`New tasks: ${metrics.newTasksCount}`);
   * ```
   */
  async getMetrics(params?: MetricsQueryParams): Promise<WebCrawlMetrics> {
    return this.traceManager.traceOperation(
      'metrics.get_web_crawl_metrics',
      async () => {
        const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

        // Set metrics query attributes
        this.traceManager.setAttributes({
          'business.operation': 'get_metrics',
          'metrics.time_range_hours': hours,
          'metrics.query_params': JSON.stringify(params || {}),
        });

        // Add trace event for metrics retrieval
        this.traceManager.addEvent('metrics_retrieval_started', {
          timeRangeHours: hours,
          hasCustomParams: !!params,
        });

        const metrics = await this.metricsDataPort.getWebCrawlMetrics(hours);

        // Add trace event for successful metrics retrieval
        this.traceManager.addEvent('metrics_retrieved', {
          newTasksCount: metrics.newTasksCount,
          completedTasksCount: metrics.completedTasksCount,
          errorTasksCount: metrics.errorTasksCount,
          totalTasksCount:
            metrics.newTasksCount +
            metrics.completedTasksCount +
            metrics.errorTasksCount,
        });

        return metrics;
      },
      {
        'business.operation': 'get_web_crawl_metrics',
        'business.entity': 'metrics',
        'metrics.time_range_hours':
          params?.hours || metricsConfig.defaultTimeRangeHours,
      }
    );
  }

  /**
   * Exports metrics in Prometheus format for monitoring systems
   *
   * This method generates Prometheus-compatible metrics output that can be
   * consumed by monitoring systems like Grafana or Prometheus itself.
   *
   * @param params - Optional query parameters for customizing the metrics request
   * @returns Promise resolving to Prometheus-formatted metrics string
   *
   * @example
   * ```typescript
   * const prometheusMetrics = await service.getPrometheusFormat({ hours: 1 });
   * console.log(prometheusMetrics);
   * // Output:
   * // # HELP web_crawl_new_tasks_total Number of new web crawl tasks in the last 1h
   * // # TYPE web_crawl_new_tasks_total counter
   * // web_crawl_new_tasks_total{time_range="1h"} 5
   * ```
   */
  async getPrometheusFormat(params?: MetricsQueryParams): Promise<string> {
    return this.traceManager.traceOperation(
      'metrics.get_prometheus_format',
      async () => {
        const metrics = await this.getMetrics(params);
        const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

        // Add trace event for Prometheus format generation
        this.traceManager.addEvent('prometheus_format_generation', {
          timeRangeHours: hours,
          metricsCount: 5, // Number of metrics in the output
        });

        const prometheusFormat = `# HELP web_crawl_new_tasks_total Number of new web crawl tasks in the last ${hours}h
# TYPE web_crawl_new_tasks_total counter
web_crawl_new_tasks_total{time_range="${hours}h"} ${metrics.newTasksCount}

# HELP web_crawl_completed_tasks_total Number of completed web crawl tasks in the last ${hours}h
# TYPE web_crawl_completed_tasks_total counter
web_crawl_completed_tasks_total{time_range="${hours}h"} ${
          metrics.completedTasksCount
        }

# HELP web_crawl_error_tasks_total Number of error web crawl tasks in the last ${hours}h
# TYPE web_crawl_error_tasks_total counter
web_crawl_error_tasks_total{time_range="${hours}h"} ${metrics.errorTasksCount}

# HELP web_crawl_total_tasks_count Total number of tasks created in time range
# TYPE web_crawl_total_tasks_count gauge
web_crawl_total_tasks_count{time_range="${hours}h"} ${metrics.totalTasksCount}

# HELP web_crawl_metrics_timestamp Timestamp of the last metrics update
# TYPE web_crawl_metrics_timestamp gauge
web_crawl_metrics_timestamp{time_range="${hours}h"} ${Math.floor(
          new Date(metrics.timestamp).getTime() / 1000
        )}`;

        // Add trace event for successful format generation
        this.traceManager.addEvent('prometheus_format_generated', {
          outputLength: prometheusFormat.length,
          metricsIncluded: [
            'new_tasks',
            'completed_tasks',
            'error_tasks',
            'total_tasks',
            'timestamp',
          ],
        });

        return prometheusFormat;
      },
      {
        'business.operation': 'get_prometheus_format',
        'business.entity': 'metrics',
        'metrics.format': 'prometheus',
        'metrics.time_range_hours':
          params?.hours || metricsConfig.defaultTimeRangeHours,
      }
    );
  }

  /**
   * Retrieves the count of new tasks for a specified time range
   *
   * @param params - Optional query parameters for customizing the time range
   * @returns Promise resolving to the count of new tasks
   *
   * @example
   * ```typescript
   * const newTasksCount = await service.getNewTasksCount({ hours: 6 });
   * console.log(`New tasks in last 6 hours: ${newTasksCount}`);
   * ```
   */
  async getNewTasksCount(params?: MetricsQueryParams): Promise<number> {
    return this.traceManager.traceOperation(
      'metrics.get_new_tasks_count',
      async () => {
        const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

        // Add trace event for new tasks count retrieval
        this.traceManager.addEvent('new_tasks_count_retrieval', {
          timeRangeHours: hours,
        });

        const count = await this.metricsDataPort.getNewTasksCount(hours);

        // Add trace event for successful count retrieval
        this.traceManager.addEvent('new_tasks_count_retrieved', {
          count,
          timeRangeHours: hours,
        });

        return count;
      },
      {
        'business.operation': 'get_new_tasks_count',
        'business.entity': 'metrics',
        'metrics.time_range_hours':
          params?.hours || metricsConfig.defaultTimeRangeHours,
      }
    );
  }

  /**
   * Retrieves the count of completed tasks for a specified time range
   *
   * @param params - Optional query parameters for customizing the time range
   * @returns Promise resolving to the count of completed tasks
   *
   * @example
   * ```typescript
   * const completedTasksCount = await service.getCompletedTasksCount({ hours: 24 });
   * console.log(`Completed tasks in last 24 hours: ${completedTasksCount}`);
   * ```
   */
  async getCompletedTasksCount(params?: MetricsQueryParams): Promise<number> {
    return this.traceManager.traceOperation(
      'metrics.get_completed_tasks_count',
      async () => {
        const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

        // Add trace event for completed tasks count retrieval
        this.traceManager.addEvent('completed_tasks_count_retrieval', {
          timeRangeHours: hours,
        });

        const count = await this.metricsDataPort.getCompletedTasksCount(hours);

        // Add trace event for successful count retrieval
        this.traceManager.addEvent('completed_tasks_count_retrieved', {
          count,
          timeRangeHours: hours,
        });

        return count;
      },
      {
        'business.operation': 'get_completed_tasks_count',
        'business.entity': 'metrics',
        'metrics.time_range_hours':
          params?.hours || metricsConfig.defaultTimeRangeHours,
      }
    );
  }

  /**
   * Retrieves the count of error tasks for a specified time range
   *
   * @param params - Optional query parameters for customizing the time range
   * @returns Promise resolving to the count of error tasks
   *
   * @example
   * ```typescript
   * const errorTasksCount = await service.getErrorTasksCount({ hours: 12 });
   * console.log(`Error tasks in last 12 hours: ${errorTasksCount}`);
   * ```
   */
  async getErrorTasksCount(params?: MetricsQueryParams): Promise<number> {
    return this.traceManager.traceOperation(
      'metrics.get_error_tasks_count',
      async () => {
        const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

        // Add trace event for error tasks count retrieval
        this.traceManager.addEvent('error_tasks_count_retrieval', {
          timeRangeHours: hours,
        });

        const count = await this.metricsDataPort.getErrorTasksCount(hours);

        // Add trace event for successful count retrieval
        this.traceManager.addEvent('error_tasks_count_retrieved', {
          count,
          timeRangeHours: hours,
        });

        return count;
      },
      {
        'business.operation': 'get_error_tasks_count',
        'business.entity': 'metrics',
        'metrics.time_range_hours':
          params?.hours || metricsConfig.defaultTimeRangeHours,
      }
    );
  }

  /**
   * Retrieves the count of all tasks created within a specified time range
   *
   * @param params - Optional query parameters for customizing the time range
   * @returns Promise resolving to the count of all tasks created in the time range
   *
   * @example
   * ```typescript
   * const totalTasksCount = await service.getTotalTasksCountByCreationTime({ hours: 24 });
   * console.log(`Total tasks created in last 24 hours: ${totalTasksCount}`);
   * ```
   */
  async getTotalTasksCountByCreationTime(
    params?: MetricsQueryParams
  ): Promise<number> {
    return this.traceManager.traceOperation(
      'metrics.get_total_tasks_count_by_creation_time',
      async () => {
        const hours = params?.hours || metricsConfig.defaultTimeRangeHours;

        // Add trace event for total tasks count retrieval
        this.traceManager.addEvent('total_tasks_count_retrieval', {
          timeRangeHours: hours,
        });

        const count =
          await this.metricsDataPort.getTotalTasksCountByCreationTime(hours);

        // Add trace event for successful count retrieval
        this.traceManager.addEvent('total_tasks_count_retrieved', {
          count,
          timeRangeHours: hours,
        });

        return count;
      },
      {
        'business.operation': 'get_total_tasks_count_by_creation_time',
        'business.entity': 'metrics',
        'metrics.time_range_hours':
          params?.hours || metricsConfig.defaultTimeRangeHours,
      }
    );
  }

  /**
   * Retrieves the available time ranges for metrics queries
   *
   * @returns Array of available time ranges in hours
   *
   * @example
   * ```typescript
   * const timeRanges = service.getAvailableTimeRanges();
   * console.log('Available time ranges:', timeRanges); // [1, 6, 24, 168]
   * ```
   */
  getAvailableTimeRanges(): number[] {
    return metricsConfig.availableTimeRanges;
  }

  /**
   * Retrieves the default time range for metrics queries
   *
   * @returns Default time range in hours
   *
   * @example
   * ```typescript
   * const defaultRange = service.getDefaultTimeRange();
   * console.log(`Default time range: ${defaultRange} hours`);
   * ```
   */
  getDefaultTimeRange(): number {
    return metricsConfig.defaultTimeRangeHours;
  }

  /**
   * Retrieves the refresh interval for metrics updates
   *
   * @returns Refresh interval in seconds
   *
   * @example
   * ```typescript
   * const refreshInterval = service.getRefreshInterval();
   * console.log(`Metrics refresh every ${refreshInterval} seconds`);
   * ```
   */
  getRefreshInterval(): number {
    return metricsConfig.refreshIntervalSeconds;
  }
}
