import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { WebCrawlTask } from '../../domain/entities/web-crawl-task.entity';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { IWebCrawlTaskRepositoryPort } from '../../infrastructure/ports/web-crawl-task-repository.port';
import { logger } from '../../common/utils/logger';
import { trace } from '@opentelemetry/api';

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
    userEmail: string,
    userQuery: string,
    originalUrl: string
  ): Promise<WebCrawlTask> {
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'create_web_crawl_task',
        'business.entity': 'web_crawl_task',
        'user.email': userEmail,
        'user.query.length': userQuery.length,
        'web.url': originalUrl,
      });
    }

    logger.debug('Creating new web crawl task', {
      userEmail,
      userQuery,
      originalUrl,
    });

    const receivedAt = new Date();
    const createdTask = await this.webCrawlTaskRepository.createWebCrawlTask(
      userEmail,
      userQuery,
      originalUrl,
      receivedAt
    );

    // Add business event for database persistence
    if (activeSpan) {
      activeSpan.addEvent('business.task_persisted', {
        taskId: createdTask.id,
        status: createdTask.status,
        'persistence.layer': 'database',
      });
    }

    // Update span attributes with the generated task ID
    if (activeSpan) {
      activeSpan.setAttributes({
        'task.id': createdTask.id,
        'task.status': createdTask.status,
        'task.created_at': createdTask.receivedAt.toISOString(),
      });
    }

    return createdTask;
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
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'get_web_crawl_task_by_id',
        'business.entity': 'web_crawl_task',
        'task.id': taskId,
      });
    }

    logger.debug('Getting web crawl task by ID', { taskId });

    const task = await this.webCrawlTaskRepository.findWebCrawlTaskById(taskId);

    if (!task) {
      // Add business event for task not found
      if (activeSpan) {
        activeSpan.addEvent('business.task_not_found', {
          taskId,
          'search.criteria': 'by_id',
        });
      }

      logger.warn('Web crawl task not found', { taskId });
      return null;
    }

    // Add business event for successful retrieval
    if (activeSpan) {
      activeSpan.addEvent('business.task_retrieved', {
        taskId: task.id,
        status: task.status,
        'search.criteria': 'by_id',
      });
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
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'get_web_crawl_tasks_by_user_email',
        'business.entity': 'web_crawl_task',
        'user.email': userEmail,
      });
    }

    logger.debug('Getting web crawl tasks by user email', { userEmail });

    const tasks =
      await this.webCrawlTaskRepository.findWebCrawlTasksByUserEmail(userEmail);

    // Add business event for successful retrieval
    if (activeSpan) {
      activeSpan.addEvent('business.tasks_retrieved_by_user', {
        userEmail,
        taskCount: tasks.length,
        'search.criteria': 'by_user_email',
      });
    }

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
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'get_web_crawl_tasks_by_status',
        'business.entity': 'web_crawl_task',
        'task.status': status,
      });
    }

    logger.debug('Getting web crawl tasks by status', { status });

    const tasks = await this.webCrawlTaskRepository.findWebCrawlTasksByStatus(
      status
    );

    // Add business event for successful retrieval
    if (activeSpan) {
      activeSpan.addEvent('business.tasks_retrieved_by_status', {
        status,
        taskCount: tasks.length,
        'search.criteria': 'by_status',
      });
    }

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
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'get_all_web_crawl_tasks',
        'business.entity': 'web_crawl_task',
      });
    }

    logger.debug('Getting all web crawl tasks');

    const tasks = await this.webCrawlTaskRepository.findAllWebCrawlTasks();

    // Add business event for successful retrieval
    if (activeSpan) {
      activeSpan.addEvent('business.all_tasks_retrieved', {
        taskCount: tasks.length,
        'search.criteria': 'all',
      });
    }

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
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'update_web_crawl_task_status',
        'business.entity': 'web_crawl_task',
        'task.id': taskId,
        'task.status': status,
        'result.size': result?.length || 0,
        'status.transition': status,
      });
    }

    logger.debug('Updating web crawl task status', {
      taskId,
      status,
      hasResult: !!result,
    });

    const task = await this.webCrawlTaskRepository.findWebCrawlTaskById(
      taskId
    );
    if (!task) {
      // Add business event for task not found
      if (activeSpan) {
        activeSpan.addEvent('business.task_not_found_for_update', {
          taskId,
          requestedStatus: status,
          'search.criteria': 'by_id',
        });
      }

      logger.warn('Web crawl task not found for status update', { taskId });
      return null;
    }

    // Add business event for task retrieval
    if (activeSpan) {
      activeSpan.addEvent('business.task_retrieved_for_update', {
        taskId,
        currentStatus: task.status,
        requestedStatus: status,
        'search.criteria': 'by_id',
      });
    }

    // Update task based on status
    if (status === TaskStatus.COMPLETED) {
      task.markAsCompleted(result || 'Task completed successfully');
    } else if (status === TaskStatus.ERROR) {
      task.markAsError(result || 'Task failed with error');
    } else if (status === TaskStatus.NEW) {
      task.markAsStarted();
    }

    // Add business event for domain entity update
    if (activeSpan) {
      activeSpan.addEvent('business.domain_entity_updated', {
        taskId,
        newStatus: task.status,
        previousStatus: task.status, // Note: domain entity doesn't track previous status
        'entity.type': 'WebCrawlTask',
      });
    }

    const updatedTask =
      await this.webCrawlTaskRepository.updateWebCrawlTask(task);

    // Add business event for database update
    if (activeSpan) {
      activeSpan.addEvent('business.task_updated_in_database', {
        taskId: updatedTask.id,
        status: updatedTask.status,
        'persistence.layer': 'database',
      });
    }

    logger.debug('Web crawl task status updated successfully', {
      taskId: updatedTask.id,
      status: updatedTask.status,
    });

    return updatedTask;
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
    const activeSpan = trace.getActiveSpan();
    
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'get_web_crawl_task_statistics',
        'business.entity': 'web_crawl_task',
      });
    }

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

    // Add business event for statistics retrieval
    if (activeSpan) {
      activeSpan.addEvent('business.statistics_retrieved', {
        total,
        new: newCount,
        completed: completedCount,
        error: errorCount,
        'statistics.type': 'task_counts_by_status',
      });
    }

    logger.info('Web crawl task statistics retrieved', statistics);

    return statistics;
  }
}
