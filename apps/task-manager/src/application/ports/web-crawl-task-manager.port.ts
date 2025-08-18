import { WebCrawlTask } from '../../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../../common/enums/task-status.enum';

/**
 * Web Crawl Task Manager Port Interface
 *
 * Defines the contract for web crawl task business operations.
 * This interface is implemented by concrete service classes
 * and used by the API layer for business logic operations.
 */
export interface IWebCrawlTaskManagerPort {
  /**
   * Creates a new web crawl task and persists it to the database.
   * This method handles the business logic of task creation.
   *
   * @param taskId - The task ID from the Kafka message header
   * @param userEmail - Email of the user requesting the task
   * @param userQuery - Query or description of what the task should do
   * @param originalUrl - Original URL associated with the task
   * @returns The created task entity
   * @throws Error if task creation fails
   */
  createWebCrawlTask(
    userEmail: string,
    userQuery: string,
    originalUrl: string
  ): Promise<WebCrawlTask>;

  /**
   * Updates the status of an existing web crawl task.
   * This method handles the business logic of task status updates.
   *
   * @param taskId - The task ID to update
   * @param status - The new status to set
   * @param result - Optional result data or error message
   * @returns The updated task entity or null if not found
   * @throws Error if task update fails
   */
  updateWebCrawlTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: string
  ): Promise<WebCrawlTask | null>;

  /**
   * Retrieves a web crawl task by its ID.
   *
   * @param taskId - The task ID to retrieve
   * @returns The task entity or null if not found
   */
  getWebCrawlTaskById(taskId: string): Promise<WebCrawlTask | null>;

  /**
   * Retrieves web crawl tasks by status.
   *
   * @param status - The task status to filter by
   * @returns Array of tasks with the specified status
   */
  getWebCrawlTasksByStatus(status: TaskStatus): Promise<WebCrawlTask[]>;

  /**
   * Retrieves web crawl tasks by user email.
   *
   * @param userEmail - The user email to filter by
   * @returns Array of tasks for the specified user
   */
  getWebCrawlTasksByUserEmail(userEmail: string): Promise<WebCrawlTask[]>;

  /**
   * Retrieves all web crawl tasks.
   *
   * @returns Array of all tasks
   */
  getAllWebCrawlTasks(): Promise<WebCrawlTask[]>;

  /**
   * Gets web crawl task statistics by status.
   *
   * @returns Object with task counts by status
   */
  getWebCrawlTaskStatistics(): Promise<{
    total: number;
    new: number;
    completed: number;
    error: number;
  }>;
}
