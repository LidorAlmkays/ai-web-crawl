import { IWebCrawlTaskRepositoryPort } from '../../../ports/web-crawl-task-repository.port';
import { WebCrawlTask } from '../../../../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { PostgresFactory } from '../postgres.factory';
import { logger } from '../../../../common/utils/logger';
import { trace } from '@opentelemetry/api';

/**
 * PostgreSQL adapter for WebCrawlTask repository operations
 *
 * This adapter implements the IWebCrawlTaskRepositoryPort interface
 * and provides PostgreSQL-specific implementations for all repository
 * operations related to web crawling tasks.
 *
 * The adapter handles:
 * - Database connection management via PostgresFactory
 * - SQL query execution with proper error handling
 * - Data transformation between database rows and domain entities
 * - Transaction management for complex operations
 * - Performance monitoring and logging
 */
export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  private readonly postgresFactory: PostgresFactory;

  constructor(postgresFactory: PostgresFactory) {
    this.postgresFactory = postgresFactory;
  }

  /**
   * Creates a new web crawl task in the database
   *
   * @param task - The WebCrawlTask entity to persist
   * @returns Promise resolving to the created WebCrawlTask entity
   * @throws Error - When database operation fails
   */
  async createWebCrawlTask(
    userEmail: string,
    userQuery: string,
    originalUrl: string,
    receivedAt: Date
  ): Promise<WebCrawlTask> {
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'create_web_crawl_task',
        'business.entity': 'web_crawl_task',
        'database.operation': 'INSERT',
        'database.table': 'web_crawl_tasks',
      });
    }

    const pool = this.postgresFactory.getPool();
    const client = await pool.connect();

    try {
      // Add business event for database operation start
      if (activeSpan) {
        activeSpan.addEvent('business.database_query_executing', {
          operation: 'INSERT',
          table: 'web_crawl_tasks',
        });
      }

      // Use stored procedure to create web crawl task
      const query = 'SELECT create_web_crawl_task($1, $2, $3, $4, $5, $6, $7) as id';

      const values = [
        userEmail,
        userQuery,
        originalUrl,
        receivedAt,
        TaskStatus.NEW,
        new Date(),
        new Date(),
      ];

      const result = await client.query(query, values);
      const taskId = result.rows[0].id;
      
      // Construct the task entity directly from the data we already have
      const now = new Date();
      const createdTask = new WebCrawlTask(
        taskId,
        userEmail,
        userQuery,
        originalUrl,
        receivedAt,
        TaskStatus.NEW,
        now,  // created_at
        now   // updated_at
      );

      // Add business event for successful database operation
      if (activeSpan) {
        activeSpan.addEvent('business.database_query_successful', {
          operation: 'INSERT',
          table: 'web_crawl_tasks',
          taskId: taskId,
        });
      }



      return createdTask;
    } catch (error) {
      // Add error attributes to active span
      if (activeSpan) {
        activeSpan.setAttributes({
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
          'error.message': error instanceof Error ? error.message : String(error),
          'error.stack': error instanceof Error ? error.stack : undefined,
          'business.operation': 'create_web_crawl_task_error',
        });
      }

      logger.error('Failed to create web crawl task', {
        error: error instanceof Error ? error.message : String(error),
        userEmail,
      });

          throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a web crawl task by its unique identifier
   *
   * @param taskId - Unique identifier of the task to find
   * @returns Promise resolving to the WebCrawlTask entity or null if not found
   */
  async findWebCrawlTaskById(taskId: string): Promise<WebCrawlTask | null> {
    const pool = this.postgresFactory.getPool();
    const client = await pool.connect();

    try {
      const query = 'SELECT * FROM find_web_crawl_task_by_id($1)';
      const result = await client.query(query, [taskId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find web crawl task by ID', {
        error: error instanceof Error ? error.message : String(error),
        taskId,
      });
      throw error;
    } finally {
      client.release();
    }
  }



  /**
   * Finds all web crawl tasks with a specific status
   *
   * @param status - TaskStatus enum value to filter by
   * @returns Promise resolving to an array of WebCrawlTask entities
   */
  async findWebCrawlTasksByStatus(status: TaskStatus): Promise<WebCrawlTask[]> {
    const pool = this.postgresFactory.getPool();
    const client = await pool.connect();

    try {
      const query = 'SELECT * FROM find_web_crawl_tasks_by_status($1)';
      const result = await client.query(query, [status]);

      return result.rows.map((row) => this.mapRowToEntity(row));
    } catch (error) {
      logger.error('Failed to find web crawl tasks by status', {
        error: error instanceof Error ? error.message : String(error),
        status,
      });
      throw error;
    } finally {
      client.release();
    }
  }



  /**
   * Updates an existing web crawl task in the database
   *
   * @param task - The WebCrawlTask entity to update
   * @returns Promise resolving to the updated WebCrawlTask entity
   * @throws Error - When database operation fails
   */
  async updateWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask> {
    const pool = this.postgresFactory.getPool();
    const client = await pool.connect();

    try {
      // Use stored procedure to update web crawl task
      const query = 'SELECT update_web_crawl_task($1, $2, $3, $4, $5)';
      
      const values = [
        task.id,
        task.status,
        task.result,
        task.finishedAt,
        new Date(),
      ];

      await client.query(query, values);

      // Return the updated task entity directly (we already have all the data)
      return task;
    } catch (error) {
      logger.error('Failed to update web crawl task', {
        error: error instanceof Error ? error.message : String(error),
        taskId: task.id,
        status: task.status,
      });
      throw error;
    } finally {
      client.release();
    }
  }



  /**
   * Counts web crawl tasks with a specific status
   *
   * @param status - TaskStatus enum value to filter by
   * @returns Promise resolving to the count of tasks with the specified status
   */
  async countWebCrawlTasksByStatus(status: TaskStatus): Promise<number> {
    const pool = this.postgresFactory.getPool();
    const client = await pool.connect();

    try {
      const query = 'SELECT count_web_crawl_tasks_by_status($1) as count';
      const result = await client.query(query, [status]);

      return result.rows[0].count;
    } catch (error) {
      logger.error('Failed to count web crawl tasks by status', {
        error: error instanceof Error ? error.message : String(error),
        status,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Maps a database row to a WebCrawlTask entity
   *
   * @param row - Database row object
   * @returns WebCrawlTask entity
   */
  private mapRowToEntity(row: any): WebCrawlTask {
    return new WebCrawlTask(
      row.id,
      row.user_email,
      row.user_query,
      row.original_url,
      new Date(row.received_at),
      row.status as TaskStatus,
      new Date(row.created_at),
      new Date(row.updated_at),
      row.result || null,
      row.started_at ? new Date(row.started_at) : undefined,
      row.finished_at ? new Date(row.finished_at) : undefined
    );
  }


}
