import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { CompletedTaskStatusMessageDto } from '../../dtos/completed-task-status-message.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { logger } from '../../../../common/utils/logger';
import { TaskStatus } from '../../../../common/enums/task-status.enum';

/**
 * Handler for complete task messages
 * Processes task completion updates
 */
export class CompleteTaskHandler extends BaseHandler {
  constructor(private readonly webCrawlTaskManager: IWebCrawlTaskManagerPort) {
    super();
  }

  /**
   * Process complete task message
   */
  async process(message: EachMessagePayload): Promise<void> {
    const handlerName = 'CompleteTaskHandler';
    const correlationId = this.logProcessingStart(message, handlerName);

    try {
      // Extract headers
      const headers = this.extractHeaders(message.message.headers);
      const { id } = headers;

      if (!id) {
        throw new Error('Task ID is required in message headers');
      }

      // Parse message body
      const messageBody = JSON.parse(message.message.value?.toString() || '{}');

      // Validate message body
      const validationResult = await validateDto(
        CompletedTaskStatusMessageDto,
        messageBody
      );
      if (!validationResult.isValid) {
        this.logValidationError(
          message,
          handlerName,
          validationResult.errorMessage,
          correlationId
        );
        throw new Error(
          `Invalid complete task data: ${validationResult.errorMessage}`
        );
      }

      const validatedData =
        validationResult.validatedData as CompletedTaskStatusMessageDto;

      // Update the task status to completed
      const updatedTask =
        await this.webCrawlTaskManager.updateWebCrawlTaskStatus(
          id,
          TaskStatus.COMPLETED,
          validatedData.crawl_result
        );

      if (!updatedTask) {
        throw new Error(`Task not found: ${id}`);
      }

      this.logProcessingSuccess(
        message,
        handlerName,
        correlationId,
        updatedTask
      );
      logger.info(`Web-crawl task completed: ${updatedTask.id}`, {
        correlationId,
        taskId: updatedTask.id,
        userEmail: updatedTask.userEmail,
        status: updatedTask.status,
        processingStage: 'TASK_COMPLETION_SUCCESS',
      });
    } catch (error) {
      this.handleError(
        message,
        handlerName,
        error,
        correlationId,
        'TASK_COMPLETION'
      );
    }
  }
}
