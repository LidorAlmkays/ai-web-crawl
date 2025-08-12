import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { WebCrawlTask } from '../../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { IWebCrawlTaskRepositoryPort } from '../../infrastructure/ports/web-crawl-task-repository.port';
import { logger } from '../../common/utils/logger';
import { TraceManager } from '../../common/utils/tracing/trace-manager';
import { TraceAttributes } from '../../common/utils/tracing/trace-attributes';

/**
 * WebCrawlTaskManager Service
 *
 * Application service that implements business logic for web crawl task management.
 * Coordinates between the domain entities and infrastructure layer.
 *
 * This service encapsulates all business operations related to web crawling tasks,
 * including creation, retrieval, status updates, and statistics. It acts as the
 * primary interface between the API layer and the domain layer.
 *
 * The service follows the Clean Architecture pattern and implements the
 * IWebCrawlTaskManagerPort interface.
 */
export class WebCrawlTaskManagerService implements IWebCrawlTaskManagerPort {
  private traceManager = TraceManager.getInstance();

  /**
   * Creates a new WebCrawlTaskManagerService instance
   *
   * @param webCrawlTaskRepository - Repository port for task persistence operations
   */
  constructor(
    private readonly webCrawlTaskRepository: IWebCrawlTaskRepositoryPort
  ) {
    logger.debug('WebCrawlTaskManagerService initialized');
  }

  /**
   * Creates a new web crawl task and persists it to the database
   *
   * This method handles the complete business logic for task creation:
   * 1. Creates a new WebCrawlTask domain entity with NEW status
   * 2. Persists the task to the database via the repository
   * 3. Logs the creation event for monitoring
   *
   * @param taskId - Unique identifier for the task
   * @param userEmail - Email address of the user requesting the task
   * @param userQuery - The search query or instruction for the web crawl
   * @param originalUrl - The URL that was originally crawled
   * @returns Promise resolving to the created WebCrawlTask entity
   * @throws Error - When task creation fails in the repository
   *
   * @example
   * ```typescript
   * const task = await service.createWebCrawlTask(
   *   'task-123',
   *   'user@example.com',
   *   'Find product information',
   *   'https://example.com'
   * );
   * ```
   */
  async createWebCrawlTask(
    taskId: string,
    userEmail: string,
    userQuery: string,
    originalUrl: string
  ): Promise<WebCrawlTask> {
    return this.traceManager.traceOperation(
      'create_web_crawl_task',
      async () => {
        logger.debug('Creating new web crawl task', {
          taskId,
          userEmail,
          userQuery,
          originalUrl,
        });

        // Set trace attributes for task creation
        this.traceManager.setAttributes(
          TraceAttributes.createTaskAttributes(
            taskId,
            'new',
            undefined,
            originalUrl,
            {
              'user.email': userEmail,
              'user.query': userQuery,
              'business.operation': 'task_creation',
            }
          )
        );

        const task = WebCrawlTask.create(
          taskId,
          userEmail,
          userQuery,
          originalUrl,
          new Date()
        );

        // Add trace event for domain entity creation
        this.traceManager.addEvent('domain_entity_created', {
          taskId,
          status: task.status,
        });

        const createdTask =
          await this.webCrawlTaskRepository.createWebCrawlTask(task);

        // Add trace event for database persistence
        this.traceManager.addEvent('task_persisted', {
          taskId: createdTask.id,
          status: createdTask.status,
        });

        logger.info('Web crawl task created successfully', {
          taskId: createdTask.id,
          userEmail: createdTask.userEmail,
          status: createdTask.status,
        });

        return createdTask;
      },
      {
        [TraceAttributes.BUSINESS_OPERATION]: 'create_web_crawl_task',
        [TraceAttributes.BUSINESS_ENTITY]: 'web_crawl_task',
        'task.id': taskId,
        'user.email': userEmail,
      }
    );
  }

  /**
   * Retrieves a web crawl task by its unique identifier
   *
   * @param taskId - Unique identifier of the task to retrieve
   * @returns Promise resolving to the WebCrawlTask entity or null if not found
   *
   * @example
   * ```typescript
   * const task = await service.getWebCrawlTaskById('task-123');
   * if (task) {
   *   console.log(`Task status: ${task.status}`);
   * }
   * ```
   */
  async getWebCrawlTaskById(taskId: string): Promise<WebCrawlTask | null> {
    logger.debug('Getting web crawl task by ID', { taskId });

    const task = await this.webCrawlTaskRepository.findWebCrawlTaskById(taskId);

    if (!task) {
      logger.warn('Web crawl task not found', { taskId });
      return null;
    }

    logger.debug('Web crawl task retrieved successfully', {
      taskId: task.id,
      status: task.status,
    });

    return task;
  }

  /**
   * Retrieves all web crawl tasks for a specific user
   *
   * @param userEmail - Email address of the user whose tasks to retrieve
   * @returns Promise resolving to an array of WebCrawlTask entities
   *
   * @example
   * ```typescript
   * const userTasks = await service.getWebCrawlTasksByUserEmail('user@example.com');
   * console.log(`User has ${userTasks.length} tasks`);
   * ```
   */
  async getWebCrawlTasksByUserEmail(
    userEmail: string
  ): Promise<WebCrawlTask[]> {
    logger.debug('Getting web crawl tasks by user email', { userEmail });

    const tasks =
      await this.webCrawlTaskRepository.findWebCrawlTasksByUserEmail(userEmail);

    logger.info('Retrieved web crawl tasks for user', {
      userEmail,
      taskCount: tasks.length,
    });

    return tasks;
  }

  /**
   * Retrieves all web crawl tasks with a specific status
   *
   * @param status - TaskStatus enum value to filter by
   * @returns Promise resolving to an array of WebCrawlTask entities
   *
   * @example
   * ```typescript
   * const completedTasks = await service.getWebCrawlTasksByStatus(TaskStatus.COMPLETED);
   * console.log(`Found ${completedTasks.length} completed tasks`);
   * ```
   */
  async getWebCrawlTasksByStatus(status: TaskStatus): Promise<WebCrawlTask[]> {
    logger.debug('Getting web crawl tasks by status', { status });

    const tasks = await this.webCrawlTaskRepository.findWebCrawlTasksByStatus(
      status
    );

    logger.info('Retrieved web crawl tasks by status', {
      status,
      taskCount: tasks.length,
    });

    return tasks;
  }

  /**
   * Retrieves all web crawl tasks in the system
   *
   * @returns Promise resolving to an array of all WebCrawlTask entities
   *
   * @example
   * ```typescript
   * const allTasks = await service.getAllWebCrawlTasks();
   * console.log(`Total tasks in system: ${allTasks.length}`);
   * ```
   */
  async getAllWebCrawlTasks(): Promise<WebCrawlTask[]> {
    logger.debug('Getting all web crawl tasks');

    const tasks = await this.webCrawlTaskRepository.findAllWebCrawlTasks();

    logger.info('Retrieved all web crawl tasks', {
      taskCount: tasks.length,
    });

    return tasks;
  }

  /**
   * Updates the status of an existing web crawl task
   *
   * This method handles the business logic for task status transitions:
   * 1. Retrieves the existing task from the repository
   * 2. Updates the task status using domain entity methods
   * 3. Persists the updated task back to the repository
   *
   * @param taskId - Unique identifier of the task to update
   * @param status - New TaskStatus to set
   * @param result - Optional result data or error message
   * @returns Promise resolving to the updated WebCrawlTask entity or null if not found
   * @throws Error - When task update fails in the repository
   *
   * @example
   * ```typescript
   * const updatedTask = await service.updateWebCrawlTaskStatus(
   *   'task-123',
   *   TaskStatus.COMPLETED,
   *   'Found 5 products matching criteria'
   * );
   * ```
   */
  async updateWebCrawlTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: string
  ): Promise<WebCrawlTask | null> {
    return this.traceManager.traceOperation(
      'update_web_crawl_task_status',
      async () => {
        logger.debug('Updating web crawl task status', {
          taskId,
          status,
          hasResult: !!result,
        });

        // Set trace attributes for status update
        this.traceManager.setAttributes(
          TraceAttributes.createTaskAttributes(
            taskId,
            status,
            undefined,
            undefined,
            {
              'status.transition': status,
              'result.size': result?.length || 0,
              'business.operation': 'task_status_update',
            }
          )
        );

        const task = await this.webCrawlTaskRepository.findWebCrawlTaskById(
          taskId
        );
        if (!task) {
          logger.warn('Web crawl task not found for status update', { taskId });

          // Add trace event for task not found
          this.traceManager.addEvent('task_not_found', {
            taskId,
            requestedStatus: status,
          });

          return null;
        }

        // Add trace event for task retrieval
        this.traceManager.addEvent('task_retrieved', {
          taskId,
          currentStatus: task.status,
          requestedStatus: status,
        });

        // Update task based on status
        if (status === TaskStatus.COMPLETED) {
          task.markAsCompleted(result || 'Task completed successfully');
        } else if (status === TaskStatus.ERROR) {
          task.markAsError(result || 'Task failed with error');
        } else if (status === TaskStatus.NEW) {
          task.markAsStarted();
        }

        // Add trace event for domain entity update
        this.traceManager.addEvent('domain_entity_updated', {
          taskId,
          newStatus: task.status,
          previousStatus: task.status, // Note: domain entity doesn't track previous status
        });

        const updatedTask =
          await this.webCrawlTaskRepository.updateWebCrawlTask(task);

        // Add trace event for database update
        this.traceManager.addEvent('task_updated_in_database', {
          taskId: updatedTask.id,
          status: updatedTask.status,
        });

        logger.info('Web crawl task status updated successfully', {
          taskId: updatedTask.id,
          status: updatedTask.status,
        });

        return updatedTask;
      },
      {
        [TraceAttributes.BUSINESS_OPERATION]: 'update_web_crawl_task_status',
        [TraceAttributes.BUSINESS_ENTITY]: 'web_crawl_task',
        'task.id': taskId,
        'task.status': status,
      }
    );
  }

  /**
   * Retrieves comprehensive statistics about web crawl tasks
   *
   * This method aggregates task counts by status to provide
   * system-wide statistics for monitoring and reporting.
   *
   * @returns Promise resolving to an object with task counts by status
   *
   * @example
   * ```typescript
   * const stats = await service.getWebCrawlTaskStatistics();
   * console.log(`Total: ${stats.total}, Completed: ${stats.completed}, Errors: ${stats.error}`);
   * ```
   */
  async getWebCrawlTaskStatistics(): Promise<{
    total: number;
    new: number;
    completed: number;
    error: number;
  }> {
    logger.debug('Getting web crawl task statistics');

    const [total, newCount, completedCount, errorCount] = await Promise.all([
      this.webCrawlTaskRepository.countAllWebCrawlTasks(),
      this.webCrawlTaskRepository.countWebCrawlTasksByStatus(TaskStatus.NEW),
      this.webCrawlTaskRepository.countWebCrawlTasksByStatus(
        TaskStatus.COMPLETED
      ),
      this.webCrawlTaskRepository.countWebCrawlTasksByStatus(TaskStatus.ERROR),
    ]);

    const statistics = {
      total,
      new: newCount,
      completed: completedCount,
      error: errorCount,
    };

    logger.info('Web crawl task statistics retrieved', statistics);

    return statistics;
  }
}
