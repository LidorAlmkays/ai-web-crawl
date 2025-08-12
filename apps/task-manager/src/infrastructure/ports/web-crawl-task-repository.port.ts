import { WebCrawlTask } from '../../domain/entities/web-crawl-task.entity';

/**
 * Web Crawl Task Repository Port Interface
 *
 * Defines the contract for web crawl task persistence operations.
 * This interface is implemented by concrete repository adapters
 * and used by the application layer for database operations.
 *
 * This port follows the Repository pattern and Clean Architecture principles,
 * providing a clean abstraction for data persistence operations. It defines
 * all the operations that can be performed on WebCrawlTask entities without
 * exposing database-specific details to the application layer.
 *
 * The interface is implemented by infrastructure adapters (e.g., PostgreSQL)
 * and used by application services for data access.
 */
export interface IWebCrawlTaskRepositoryPort {
  /**
   * Creates a new web crawl task record in the database
   *
   * This method persists a WebCrawlTask domain entity to the underlying
   * data store. The implementation should handle all necessary data
   * transformations and validation.
   *
   * @param task - The domain entity to persist
   * @returns Promise resolving to the created task entity
   * @throws Error - If the task cannot be created (e.g., duplicate ID, validation failure)
   *
   * @example
   * ```typescript
   * const task = WebCrawlTask.create(id, email, query, url, new Date());
   * const createdTask = await repository.createWebCrawlTask(task);
   * ```
   */
  createWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask>;

  /**
   * Updates an existing web crawl task with new status and result data
   *
   * This method updates a WebCrawlTask domain entity in the underlying
   * data store. The implementation should handle status transitions
   * and ensure data consistency.
   *
   * @param task - The updated domain entity
   * @returns Promise resolving to the updated task entity
   * @throws Error - If the task does not exist or cannot be updated
   *
   * @example
   * ```typescript
   * task.markAsCompleted('Found 5 products');
   * const updatedTask = await repository.updateWebCrawlTask(task);
   * ```
   */
  updateWebCrawlTask(task: WebCrawlTask): Promise<WebCrawlTask>;

  /**
   * Retrieves a web crawl task by its unique identifier
   *
   * This method queries the underlying data store to find a specific
   * task by its ID. Returns null if no task is found.
   *
   * @param id - The task ID to search for
   * @returns Promise resolving to the task entity or null if not found
   *
   * @example
   * ```typescript
   * const task = await repository.findWebCrawlTaskById('task-123');
   * if (task) {
   *   console.log(`Task status: ${task.status}`);
   * }
   * ```
   */
  findWebCrawlTaskById(id: string): Promise<WebCrawlTask | null>;

  /**
   * Finds web crawl tasks by status
   *
   * This method queries the underlying data store to find all tasks
   * with a specific status. The status parameter should match the
   * TaskStatus enum values.
   *
   * @param status - The task status to filter by
   * @returns Promise resolving to an array of tasks with the specified status
   *
   * @example
   * ```typescript
   * const completedTasks = await repository.findWebCrawlTasksByStatus('completed');
   * console.log(`Found ${completedTasks.length} completed tasks`);
   * ```
   */
  findWebCrawlTasksByStatus(status: string): Promise<WebCrawlTask[]>;

  /**
   * Finds web crawl tasks by user email
   *
   * This method queries the underlying data store to find all tasks
   * associated with a specific user email address.
   *
   * @param userEmail - The user email to filter by
   * @returns Promise resolving to an array of tasks for the specified user
   *
   * @example
   * ```typescript
   * const userTasks = await repository.findWebCrawlTasksByUserEmail('user@example.com');
   * console.log(`User has ${userTasks.length} tasks`);
   * ```
   */
  findWebCrawlTasksByUserEmail(userEmail: string): Promise<WebCrawlTask[]>;

  /**
   * Finds all web crawl tasks with optional pagination
   *
   * This method queries the underlying data store to retrieve all tasks,
   * with optional pagination support for large datasets.
   *
   * @param limit - Maximum number of tasks to return (optional)
   * @param offset - Number of tasks to skip for pagination (optional)
   * @returns Promise resolving to an array of tasks with pagination
   *
   * @example
   * ```typescript
   * const allTasks = await repository.findAllWebCrawlTasks(50, 0);
   * console.log(`Retrieved ${allTasks.length} tasks`);
   * ```
   */
  findAllWebCrawlTasks(
    limit?: number,
    offset?: number
  ): Promise<WebCrawlTask[]>;

  /**
   * Counts web crawl tasks by status
   *
   * This method queries the underlying data store to count the number
   * of tasks with a specific status, useful for statistics and monitoring.
   *
   * @param status - The task status to count
   * @returns Promise resolving to the number of tasks with the specified status
   *
   * @example
   * ```typescript
   * const completedCount = await repository.countWebCrawlTasksByStatus('completed');
   * console.log(`There are ${completedCount} completed tasks`);
   * ```
   */
  countWebCrawlTasksByStatus(status: string): Promise<number>;

  /**
   * Counts total number of web crawl tasks
   *
   * This method queries the underlying data store to count the total
   * number of tasks, useful for system statistics and monitoring.
   *
   * @returns Promise resolving to the total number of web crawl tasks in the database
   *
   * @example
   * ```typescript
   * const totalCount = await repository.countAllWebCrawlTasks();
   * console.log(`Total tasks in system: ${totalCount}`);
   * ```
   */
  countAllWebCrawlTasks(): Promise<number>;
}
