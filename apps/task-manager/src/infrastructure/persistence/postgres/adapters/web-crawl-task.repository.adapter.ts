import { IWebCrawlTaskRepositoryPort } from '../../../../infrastructure/ports/web-crawl-task-repository.port';
import { WebCrawlTask } from '../../../../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { Pool } from 'pg';
import { logger } from '../../../../common/utils/logger';

/**
 * Web Crawl Task Repository Adapter
 *
 * PostgreSQL implementation of the web crawl task repository port.
 * Handles all database operations for web crawl task entities.
 *
 * This adapter implements the IWebCrawlTaskRepositoryPort interface and provides
 * concrete PostgreSQL-specific implementations for all task persistence operations.
 * It uses stored procedures and functions for database operations and includes
 * comprehensive error handling and logging.
 *
 * The adapter follows the Repository pattern and Clean Architecture principles,
 * abstracting database-specific details from the application layer.
 */
export class WebCrawlTaskRepositoryAdapter
  implements IWebCrawlTaskRepositoryPort
{
  /**
   * Creates a new WebCrawlTaskRepositoryAdapter instance
   *
   * @param pool - PostgreSQL connection pool for database operations
   */
  constructor(private readonly pool: Pool) {}

  /**
   * Creates a new web crawl task record in the database using stored procedure
   *
   * This method persists a WebCrawlTask domain entity to the PostgreSQL database
   * using the create_web_crawl_task stored procedure. It handles parameter mapping
   * and provides comprehensive error logging.
   *
   * @param task - The WebCrawlTask domain entity to persist
   * @returns Promise resolving to the created WebCrawlTask entity
   * @throws Error - When database operation fails or stored procedure errors occur
   *
   * @example
   * ```typescript
   * const task = WebCrawlTask.create(id, email, query, url, new Date());
   * const createdTask = await repository.createWebCrawlTask(task);
   * ```
   */
  public async createWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask> {
    const operation = 'createWebCrawlTask';
    const sql = 'SELECT create_web_crawl_task($1, $2, $3, $4, $5, $6, $7, $8)';
    const params = [
      task.id,
      task.userEmail,
      task.userQuery,
      task.originalUrl,
      task.receivedAt.toISOString(),
      task.status,
      task.createdAt.toISOString(),
      task.updatedAt.toISOString(),
    ];

    logger.debug('Executing createWebCrawlTask procedure', {
      taskId: task.id,
      operation,
      sql,
      params: this.sanitizeParams(params),
    });

    try {
      await this.pool.query(sql, params);

      logger.debug('Web crawl task created successfully', {
        taskId: task.id,
        operation,
        status: task.status,
      });
      return task;
    } catch (error) {
      this.logDatabaseError(operation, error, {
        taskId: task.id,
        sql,
        params: this.sanitizeParams(params),
        userEmail: task.userEmail,
        status: task.status,
      });
      throw error;
    }
  }

  /**
   * Updates an existing web crawl task with new status and result data using stored procedure
   *
   * This method updates a WebCrawlTask domain entity in the PostgreSQL database
   * using the update_web_crawl_task stored procedure. It handles status transitions
   * and result data updates.
   *
   * @param task - The updated WebCrawlTask domain entity
   * @returns Promise resolving to the updated WebCrawlTask entity
   * @throws Error - When database operation fails or stored procedure errors occur
   *
   * @example
   * ```typescript
   * task.markAsCompleted('Found 5 products');
   * const updatedTask = await repository.updateWebCrawlTask(task);
   * ```
   */
  public async updateWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask> {
    const operation = 'updateWebCrawlTask';
    const sql = 'SELECT update_web_crawl_task($1, $2, $3, $4, $5)';
    const params = [
      task.id,
      task.status,
      task.result || null,
      task.finishedAt?.toISOString() || null,
      task.updatedAt.toISOString(),
    ];

    logger.debug('Executing updateWebCrawlTask procedure', {
      taskId: task.id,
      newStatus: task.status,
      operation,
      sql,
      params: this.sanitizeParams(params),
    });

    try {
      await this.pool.query(sql, params);

      logger.debug('Web crawl task updated successfully', {
        taskId: task.id,
        newStatus: task.status,
        operation,
      });
      return task;
    } catch (error) {
      this.logDatabaseError(operation, error, {
        taskId: task.id,
        sql,
        params: this.sanitizeParams(params),
        newStatus: task.status,
        hasResult: !!task.result,
      });
      throw error;
    }
  }

  /**
   * Retrieves a web crawl task by its unique identifier
   *
   * This method queries the PostgreSQL database using the find_web_crawl_task_by_id
   * function to retrieve a specific task by its ID.
   *
   * @param id - Unique identifier of the task to retrieve
   * @returns Promise resolving to the WebCrawlTask entity or null if not found
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const task = await repository.findWebCrawlTaskById('task-123');
   * if (task) {
   *   console.log(`Task status: ${task.status}`);
   * }
   * ```
   */
  public async findWebCrawlTaskById(id: string): Promise<WebCrawlTask | null> {
    const operation = 'findWebCrawlTaskById';
    const sql = 'SELECT * FROM find_web_crawl_task_by_id($1)';
    const params = [id];

    logger.debug('Executing findWebCrawlTaskById function', {
      taskId: id,
      operation,
      sql,
      params,
    });

    try {
      const result = await this.pool.query(sql, params);

      if (result.rows.length === 0) {
        logger.debug('Web crawl task not found', {
          taskId: id,
          operation,
        });
        return null;
      }

      const row = result.rows[0] as any;
      const task = this.mapRowToWebCrawlTask(row);

      logger.debug('Web crawl task found', {
        taskId: id,
        operation,
        status: task.status,
      });
      return task;
    } catch (error) {
      this.logDatabaseError(operation, error, {
        taskId: id,
        sql,
        params,
      });
      throw error;
    }
  }

  /**
   * Finds web crawl tasks by status using database function
   *
   * @param status - Task status to filter by (should match TaskStatus enum values)
   * @returns Promise resolving to an array of WebCrawlTask entities
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const completedTasks = await repository.findWebCrawlTasksByStatus('completed');
   * console.log(`Found ${completedTasks.length} completed tasks`);
   * ```
   */
  public async findWebCrawlTasksByStatus(
    status: string
  ): Promise<WebCrawlTask[]> {
    logger.debug('Executing findWebCrawlTasksByStatus function', { status });

    try {
      const result = await this.pool.query(
        'SELECT * FROM find_web_crawl_tasks_by_status($1)',
        [status]
      );
      const tasks = result.rows.map((row) =>
        this.mapRowToWebCrawlTask(row as Record<string, any>)
      );

      logger.debug('Web crawl tasks found by status', {
        status,
        count: tasks.length,
      });
      return tasks;
    } catch (error) {
      logger.error('Failed to find web crawl tasks by status', {
        status,
        error,
      });
      throw error;
    }
  }

  /**
   * Finds web crawl tasks by user email using database function
   *
   * @param userEmail - Email address of the user whose tasks to retrieve
   * @returns Promise resolving to an array of WebCrawlTask entities
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const userTasks = await repository.findWebCrawlTasksByUserEmail('user@example.com');
   * console.log(`User has ${userTasks.length} tasks`);
   * ```
   */
  public async findWebCrawlTasksByUserEmail(
    userEmail: string
  ): Promise<WebCrawlTask[]> {
    logger.debug('Executing findWebCrawlTasksByUserEmail function', {
      userEmail,
    });

    try {
      const result = await this.pool.query(
        'SELECT * FROM find_web_crawl_tasks_by_user_email($1)',
        [userEmail]
      );
      const tasks = result.rows.map((row) =>
        this.mapRowToWebCrawlTask(row as Record<string, any>)
      );

      logger.debug('Web crawl tasks found by user email', {
        userEmail,
        count: tasks.length,
      });
      return tasks;
    } catch (error) {
      logger.error('Failed to find web crawl tasks by user email', {
        userEmail,
        error,
      });
      throw error;
    }
  }

  /**
   * Finds all web crawl tasks with optional pagination using database function
   *
   * @param limit - Maximum number of tasks to return (default: 100)
   * @param offset - Number of tasks to skip for pagination (default: 0)
   * @returns Promise resolving to an array of WebCrawlTask entities
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const allTasks = await repository.findAllWebCrawlTasks(50, 0);
   * console.log(`Retrieved ${allTasks.length} tasks`);
   * ```
   */
  public async findAllWebCrawlTasks(
    limit?: number,
    offset?: number
  ): Promise<WebCrawlTask[]> {
    logger.debug('Executing findAllWebCrawlTasks function', { limit, offset });

    try {
      const result = await this.pool.query(
        'SELECT * FROM find_all_web_crawl_tasks($1, $2)',
        [limit || 100, offset || 0]
      );
      const tasks = result.rows.map((row) =>
        this.mapRowToWebCrawlTask(row as Record<string, any>)
      );

      logger.debug('Web crawl tasks found', {
        count: tasks.length,
        limit,
        offset,
      });
      return tasks;
    } catch (error) {
      logger.error('Failed to find all web crawl tasks', { error });
      throw error;
    }
  }

  /**
   * Counts web crawl tasks by status using database function
   *
   * @param status - Task status to count (should match TaskStatus enum values)
   * @returns Promise resolving to the count of tasks with the specified status
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const completedCount = await repository.countWebCrawlTasksByStatus('completed');
   * console.log(`There are ${completedCount} completed tasks`);
   * ```
   */
  public async countWebCrawlTasksByStatus(status: string): Promise<number> {
    logger.debug('Executing countWebCrawlTasksByStatus function', { status });

    try {
      const result = await this.pool.query(
        'SELECT count_web_crawl_tasks_by_status($1)',
        [status]
      );
      const count = parseInt(
        (result.rows[0] as Record<string, any>)
          .count_web_crawl_tasks_by_status as string
      );

      logger.debug('Web crawl task count by status', { status, count });
      return count;
    } catch (error) {
      logger.error('Failed to count web crawl tasks by status', {
        status,
        error,
      });
      throw error;
    }
  }

  /**
   * Counts total number of web crawl tasks using database function
   *
   * @returns Promise resolving to the total count of web crawl tasks
   * @throws Error - When database operation fails
   *
   * @example
   * ```typescript
   * const totalCount = await repository.countAllWebCrawlTasks();
   * console.log(`Total tasks in system: ${totalCount}`);
   * ```
   */
  public async countAllWebCrawlTasks(): Promise<number> {
    logger.debug('Executing countAllWebCrawlTasks function');

    try {
      const result = await this.pool.query(
        'SELECT count_all_web_crawl_tasks()'
      );
      const count = parseInt(
        (result.rows[0] as Record<string, any>)
          .count_all_web_crawl_tasks as string
      );

      logger.debug('Total web crawl task count', { count });
      return count;
    } catch (error) {
      logger.error('Failed to count all web crawl tasks', { error });
      throw error;
    }
  }

  /**
   * Maps a database row to a WebCrawlTask domain entity
   *
   * This private method handles the conversion from database row format
   * to domain entity format, including proper date parsing and field mapping.
   *
   * @param row - Database row object with snake_case column names
   * @returns WebCrawlTask domain entity
   *
   * @example
   * ```typescript
   * const task = this.mapRowToWebCrawlTask(dbRow);
   * ```
   */
  private mapRowToWebCrawlTask(row: Record<string, any>): WebCrawlTask {
    return new WebCrawlTask(
      row.id,
      row.user_email,
      row.user_query,
      row.original_url,
      new Date(row.received_at),
      row.status as TaskStatus,
      new Date(row.created_at),
      new Date(row.updated_at),
      row.data, // Database column is 'data', map to entity 'result'
      undefined, // startedAt - not in database yet
      row.finished_at ? new Date(row.finished_at) : undefined
    );
  }

  /**
   * Logs database errors with detailed context and categorization
   *
   * This private method provides comprehensive error logging for database
   * operations, including error categorization and severity assessment.
   *
   * @param operation - Name of the database operation that failed
   * @param error - The database error object
   * @param context - Additional context information for debugging
   *
   * @example
   * ```typescript
   * this.logDatabaseError('createWebCrawlTask', error, { taskId: '123' });
   * ```
   */
  private logDatabaseError(operation: string, error: any, context: any): void {
    const errorCategory = this.categorizeDatabaseError(error);

    logger.error(`Database operation failed: ${operation}`, {
      operation,
      errorCategory,
      severity: this.getDatabaseErrorSeverity(errorCategory),
      error: {
        name: error.name || 'DatabaseError',
        message: error.message || 'Unknown database error',
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        where: error.where,
        file: error.file,
        line: error.line,
        routine: error.routine,
        stack: error.stack,
      },
      context: {
        ...context,
        service: 'Task Manager',
        component: 'Database Repository',
        database: 'PostgreSQL',
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Categorizes database errors for better handling and monitoring
   *
   * @param error - The database error object
   * @returns String representing the error category
   *
   * @example
   * ```typescript
   * const category = this.categorizeDatabaseError(error);
   * // Returns: 'UNIQUE_VIOLATION', 'SYNTAX_ERROR', etc.
   * ```
   */
  private categorizeDatabaseError(error: any): string {
    if (error.code === '42P02') {
      return 'PARAMETER_NOT_FOUND';
    }
    if (error.code === '42601') {
      return 'SYNTAX_ERROR';
    }
    if (error.code === '22P02') {
      return 'INVALID_ENUM_VALUE';
    }
    if (error.code === '23505') {
      return 'UNIQUE_VIOLATION';
    }
    if (error.code === '23503') {
      return 'FOREIGN_KEY_VIOLATION';
    }
    if (error.code === '23502') {
      return 'NOT_NULL_VIOLATION';
    }
    if (error.code === '42703') {
      return 'UNDEFINED_COLUMN';
    }
    if (error.code === '42883') {
      return 'UNDEFINED_FUNCTION';
    }
    if (error.code === '42P01') {
      return 'UNDEFINED_TABLE';
    }
    return 'UNKNOWN_DATABASE_ERROR';
  }

  /**
   * Gets error severity based on database error category
   *
   * @param errorCategory - The categorized error type
   * @returns String representing the error severity level
   *
   * @example
   * ```typescript
   * const severity = this.getDatabaseErrorSeverity('SYNTAX_ERROR');
   * // Returns: 'HIGH'
   * ```
   */
  private getDatabaseErrorSeverity(errorCategory: string): string {
    switch (errorCategory) {
      case 'SYNTAX_ERROR':
      case 'UNDEFINED_FUNCTION':
      case 'UNDEFINED_TABLE':
      case 'UNDEFINED_COLUMN':
        return 'HIGH'; // Configuration/schema issues
      case 'PARAMETER_NOT_FOUND':
      case 'INVALID_ENUM_VALUE':
        return 'MEDIUM'; // Data/parameter issues
      case 'UNIQUE_VIOLATION':
      case 'FOREIGN_KEY_VIOLATION':
      case 'NOT_NULL_VIOLATION':
        return 'MEDIUM'; // Constraint violations
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Sanitizes parameters for logging to remove sensitive data
   *
   * This method masks sensitive information like email addresses
   * before logging to prevent data exposure in logs.
   *
   * @param params - Array of parameters to sanitize
   * @returns Array of sanitized parameters
   *
   * @example
   * ```typescript
   * const sanitized = this.sanitizeParams(['user@example.com', 'query']);
   * // Returns: ['us***@example.com', 'query']
   * ```
   */
  private sanitizeParams(params: any[]): any[] {
    return params.map((param) => {
      if (typeof param === 'string' && param.includes('@')) {
        // Likely an email, mask it
        const [local, domain] = param.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      }
      return param;
    });
  }
}
