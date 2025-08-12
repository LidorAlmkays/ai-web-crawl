/**
 * Task Status Enumeration
 *
 * Defines the possible states that a web crawling task can be in.
 * This enum matches the database task_status enum values exactly.
 *
 * The enum values are used throughout the application to track
 * task lifecycle and determine appropriate business logic.
 *
 * Database enum: 'new', 'completed', 'error'
 */
export enum TaskStatus {
  /**
   * Task is newly created and ready for processing
   *
   * This status indicates that a task has been created but not yet
   * started or completed. Tasks in this state are eligible for
   * processing by the task manager.
   */
  NEW = 'new',

  /**
   * Task has been completed successfully
   *
   * This status indicates that a task has finished processing
   * and produced a successful result. The task result field
   * contains the output data.
   */
  COMPLETED = 'completed',

  /**
   * Task has failed with an error
   *
   * This status indicates that a task encountered an error during
   * processing and could not complete successfully. The task result
   * field contains the error message.
   */
  ERROR = 'error',
}
