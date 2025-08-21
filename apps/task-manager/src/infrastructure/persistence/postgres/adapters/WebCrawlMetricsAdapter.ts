import { Pool } from 'pg';
import { IWebCrawlMetricsDataPort } from '../../../ports/web-crawl-metrics-data.port';
import { WebCrawlMetrics } from '../../../../domain/types/metrics.types';

export class WebCrawlMetricsAdapter implements IWebCrawlMetricsDataPort {
  constructor(private readonly pool: Pool) {}

  async getWebCrawlMetrics(hours: number): Promise<WebCrawlMetrics> {
    const [newCount, completedCount, errorCount, totalCount] =
      await Promise.all([
        this.getNewTasksCount(hours),
        this.getCompletedTasksCount(hours),
        this.getErrorTasksCount(hours),
        this.getTotalTasksCountByCreationTime(hours),
      ]);

    const now = new Date().toISOString();
    const timeRange = `${hours}h`;

    return {
      newTasksCount: newCount,
      completedTasksCount: completedCount,
      errorTasksCount: errorCount,
      totalTasksCount: totalCount,
      timeRange,
      timestamp: now,
      lastUpdated: now,
    };
  }

  async getNewTasksCount(hours: number): Promise<number> {
    const result = await this.pool.query(
      'SELECT get_new_tasks_count($1) as count',
      [hours]
    );
    return parseInt(result.rows[0].count);
  }

  async getCompletedTasksCount(hours: number): Promise<number> {
    const result = await this.pool.query(
      'SELECT get_completed_tasks_count($1) as count',
      [hours]
    );
    return parseInt(result.rows[0].count);
  }

  async getErrorTasksCount(hours: number): Promise<number> {
    const result = await this.pool.query(
      'SELECT get_error_tasks_count($1) as count',
      [hours]
    );
    return parseInt(result.rows[0].count);
  }

  async getTotalTasksCountByCreationTime(hours: number): Promise<number> {
    const result = await this.pool.query(
      'SELECT get_total_tasks_count_by_creation_time($1) as count',
      [hours]
    );
    return parseInt(result.rows[0].count);
  }
}
