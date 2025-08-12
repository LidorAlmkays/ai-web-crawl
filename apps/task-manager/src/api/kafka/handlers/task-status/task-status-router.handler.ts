import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { TaskStatusHeaderDto } from '../../dtos/task-status-header.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { logger } from '../../../../common/utils/logger';
import { NewTaskHandler } from './new-task.handler';
import { CompleteTaskHandler } from './complete-task.handler';
import { ErrorTaskHandler } from './error-task.handler';
import { IHandler } from '../base-handler.interface';

/**
 * TaskStatusRouterHandler
 *
 * Single handler for task-status topic that routes messages based on status header
 * to specific handlers (new, complete, error).
 *
 * This handler implements the Router pattern and acts as a dispatcher for
 * task status messages. It validates message headers and routes each message
 * to the appropriate specialized handler based on the status value.
 *
 * The handler provides centralized routing logic while delegating actual
 * processing to status-specific handlers.
 */
export class TaskStatusRouterHandler extends BaseHandler {
  private readonly handlers: Record<string, IHandler>;

  /**
   * Creates a new TaskStatusRouterHandler instance
   *
   * Initializes the router with status-specific handlers for new, completed,
   * and error task statuses. Each handler is responsible for processing
   * messages with its corresponding status.
   *
   * @param webCrawlTaskManager - Application service for task management operations
   */
  constructor(private readonly webCrawlTaskManager: IWebCrawlTaskManagerPort) {
    super();

    // Initialize specific handlers
    this.handlers = {
      new: new NewTaskHandler(this.webCrawlTaskManager),
      completed: new CompleteTaskHandler(this.webCrawlTaskManager),
      error: new ErrorTaskHandler(this.webCrawlTaskManager),
    };

    logger.debug('TaskStatusRouterHandler initialized', {
      availableStatuses: Object.keys(this.handlers),
    });
  }

  /**
   * Processes task-status message by routing to appropriate handler based on status
   *
   * This method validates the message headers, extracts the status, and routes
   * the message to the appropriate specialized handler. It provides comprehensive
   * error handling and logging for the routing process.
   *
   * @param message - The Kafka message payload containing task status information
   * @returns Promise that resolves when message processing is complete
   * @throws Error - When header validation fails or no handler is found for the status
   *
   * @example
   * ```typescript
   * await routerHandler.process(message);
   * ```
   */
  async process(message: EachMessagePayload): Promise<void> {
    const handlerName = 'TaskStatusRouterHandler';
    const correlationId = this.logProcessingStart(message, handlerName);

    try {
      // Extract and validate headers
      const headers = this.extractHeaders(message.message.headers);
      const headerValidationResult = await validateDto(
        TaskStatusHeaderDto,
        headers
      );

      if (!headerValidationResult.isValid) {
        this.logValidationError(
          message,
          handlerName,
          headerValidationResult.errorMessage,
          correlationId
        );
        throw new Error(
          `Invalid headers: ${headerValidationResult.errorMessage}`
        );
      }

      const validatedHeaders =
        headerValidationResult.validatedData as TaskStatusHeaderDto;
      const { status } = validatedHeaders;

      // Get specific handler for status
      const handler = this.handlers[status];
      if (!handler) {
        logger.error(`No handler registered for status: ${status}`, {
          status,
          receivedMessage: message.message.value?.toString(),
          correlationId,
          availableStatuses: Object.keys(this.handlers),
          topic: message.topic,
          partition: message.partition,
          offset: message.message.offset,
          processingStage: 'HANDLER_ROUTING',
          errorCategory: 'VALIDATION_ERROR',
        });
        throw new Error(`No handler for status: ${status}`);
      }

      // Route to specific handler
      logger.debug(
        `Routing task-status message to handler for status: ${status}`,
        {
          correlationId,
          status,
          topic: message.topic,
          partition: message.partition,
          offset: message.message.offset,
          processingStage: 'HANDLER_ROUTING',
        }
      );

      await handler.process(message);

      this.logProcessingSuccess(message, handlerName, correlationId);
      logger.debug(`Task-status message routed successfully`, {
        correlationId,
        status,
        topic: message.topic,
        partition: message.partition,
        offset: message.message.offset,
        processingStage: 'ROUTING_SUCCESS',
      });
    } catch (error) {
      this.handleError(
        message,
        handlerName,
        error,
        correlationId,
        'MESSAGE_ROUTING'
      );
    }
  }

  /**
   * Gets all registered statuses that have handlers
   *
   * @returns Array of status strings that have registered handlers
   *
   * @example
   * ```typescript
   * const statuses = routerHandler.getRegisteredStatuses();
   * console.log('Available statuses:', statuses); // ['new', 'completed', 'error']
   * ```
   */
  getRegisteredStatuses(): string[] {
    return Object.keys(this.handlers);
  }

  /**
   * Checks if a status has a registered handler
   *
   * @param status - The status to check for handler availability
   * @returns true if a handler exists for the status, false otherwise
   *
   * @example
   * ```typescript
   * if (routerHandler.hasHandler('new')) {
   *   console.log('Handler available for new status');
   * }
   * ```
   */
  hasHandler(status: string): boolean {
    return status in this.handlers;
  }
}
