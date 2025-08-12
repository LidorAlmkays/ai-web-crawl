import { TaskStatus } from '../../common/enums/task-status.enum';

/**
 * WebCrawlTask Entity
 *
 * Represents a web crawling task in the domain layer.
 * Contains business logic for task state management and lifecycle operations.
 *
 * This entity encapsulates the core business rules for web crawling tasks,
 * including state transitions, validation, and business calculations.
 *
 * The entity follows the Domain-Driven Design pattern and contains
 * all business logic related to task management.
 */
export class WebCrawlTask {
  /**
   * Creates a new WebCrawlTask instance
   *
   * @param id - Unique identifier for the task
   * @param userEmail - Email address of the user who requested the task
   * @param userQuery - The search query or instruction for the web crawl
   * @param originalUrl - The URL that was originally crawled
   * @param receivedAt - Timestamp when the task was received
   * @param status - Current status of the task
   * @param createdAt - Timestamp when the task was created
   * @param updatedAt - Timestamp when the task was last updated
   * @param result - Optional result data from the completed task
   * @param startedAt - Optional timestamp when the task started processing
   * @param finishedAt - Optional timestamp when the task finished processing
   */
  constructor(
    public readonly id: string,
    public readonly userEmail: string,
    public readonly userQuery: string,
    public readonly originalUrl: string,
    public readonly receivedAt: Date,
    public status: TaskStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public result?: string,
    public startedAt?: Date,
    public finishedAt?: Date
  ) {}

  /**
   * Creates a new web crawl task with initial state
   *
   * This factory method creates a new task with the NEW status and
   * sets appropriate timestamps for creation and updates.
   *
   * @param id - Unique identifier for the task
   * @param userEmail - Email address of the user who requested the task
   * @param userQuery - The search query or instruction for the web crawl
   * @param originalUrl - The URL that was originally crawled
   * @param receivedAt - Timestamp when the task was received
   * @returns A new WebCrawlTask instance with NEW status
   *
   * @example
   * ```typescript
   * const task = WebCrawlTask.create(
   *   'task-123',
   *   'user@example.com',
   *   'Find product information',
   *   'https://example.com',
   *   new Date()
   * );
   * ```
   */
  static create(
    id: string,
    userEmail: string,
    userQuery: string,
    originalUrl: string,
    receivedAt: Date
  ): WebCrawlTask {
    const now = new Date();
    return new WebCrawlTask(
      id,
      userEmail,
      userQuery,
      originalUrl,
      receivedAt,
      TaskStatus.NEW,
      now,
      now
    );
  }

  /**
   * Marks the task as started and updates timestamps
   *
   * This method transitions the task to processing state and records
   * the start time. The status remains NEW during processing.
   *
   * @example
   * ```typescript
   * task.markAsStarted();
   * ```
   */
  markAsStarted(): void {
    this.status = TaskStatus.NEW; // Keep as NEW while processing
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Marks the task as completed successfully with result data
   *
   * This method transitions the task to COMPLETED status and stores
   * the result data along with completion timestamp.
   *
   * @param result - The result data from the completed task
   *
   * @example
   * ```typescript
   * task.markAsCompleted('Found 5 products matching criteria');
   * ```
   */
  markAsCompleted(result: string): void {
    this.status = TaskStatus.COMPLETED;
    this.result = result;
    this.finishedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Marks the task as failed with error message
   *
   * This method transitions the task to ERROR status and stores
   * the error message along with completion timestamp.
   *
   * @param errorMessage - The error message describing the failure
   *
   * @example
   * ```typescript
   * task.markAsError('Network timeout occurred');
   * ```
   */
  markAsError(errorMessage: string): void {
    this.status = TaskStatus.ERROR;
    this.result = errorMessage;
    this.finishedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Creates a completed task with predefined state (for testing or direct creation)
   *
   * This factory method creates a task that is already in a completed state,
   * either successful or failed, with all timestamps set appropriately.
   *
   * @param id - Unique identifier for the task
   * @param userEmail - Email address of the user who requested the task
   * @param userQuery - The search query or instruction for the web crawl
   * @param originalUrl - The URL that was originally crawled
   * @param receivedAt - Timestamp when the task was received
   * @param result - The result data or error message
   * @param success - Whether the task completed successfully
   * @returns A WebCrawlTask instance in completed state
   *
   * @example
   * ```typescript
   * const task = WebCrawlTask.createCompleted(
   *   'task-123',
   *   'user@example.com',
   *   'Find products',
   *   'https://example.com',
   *   new Date(),
   *   'Found 3 products',
   *   true
   * );
   * ```
   */
  static createCompleted(
    id: string,
    userEmail: string,
    userQuery: string,
    originalUrl: string,
    receivedAt: Date,
    result: string,
    success: boolean
  ): WebCrawlTask {
    const status = success ? TaskStatus.COMPLETED : TaskStatus.ERROR;

    return new WebCrawlTask(
      id,
      userEmail,
      userQuery,
      originalUrl,
      receivedAt,
      status,
      new Date(),
      new Date(),
      result,
      new Date(),
      new Date()
    );
  }

  /**
   * Checks if the task is completed (either successfully or with error)
   *
   * @returns true if the task status is COMPLETED or ERROR, false otherwise
   *
   * @example
   * ```typescript
   * if (task.isCompleted()) {
   *   console.log('Task is finished');
   * }
   * ```
   */
  public isCompleted(): boolean {
    return (
      this.status === TaskStatus.COMPLETED || this.status === TaskStatus.ERROR
    );
  }

  /**
   * Checks if the task is currently in progress
   *
   * @returns true if the task status is NEW, false otherwise
   *
   * @example
   * ```typescript
   * if (task.isInProgress()) {
   *   console.log('Task is still processing');
   * }
   * ```
   */
  public isInProgress(): boolean {
    return this.status === TaskStatus.NEW;
  }

  /**
   * Checks if the task completed successfully
   *
   * @returns true if the task status is COMPLETED, false otherwise
   *
   * @example
   * ```typescript
   * if (task.isSuccessful()) {
   *   console.log('Task completed successfully');
   * }
   * ```
   */
  public isSuccessful(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  /**
   * Checks if the task failed with an error
   *
   * @returns true if the task status is ERROR, false otherwise
   *
   * @example
   * ```typescript
   * if (task.hasError()) {
   *   console.log('Task failed with error');
   * }
   * ```
   */
  public hasError(): boolean {
    return this.status === TaskStatus.ERROR;
  }

  /**
   * Calculates the task duration in milliseconds
   *
   * @returns Duration in milliseconds if both start and finish times are available, null otherwise
   *
   * @example
   * ```typescript
   * const duration = task.getDuration();
   * if (duration !== null) {
   *   console.log(`Task took ${duration}ms`);
   * }
   * ```
   */
  public getDuration(): number | null {
    if (!this.startedAt || !this.finishedAt) {
      return null;
    }
    return this.finishedAt.getTime() - this.startedAt.getTime();
  }
}
