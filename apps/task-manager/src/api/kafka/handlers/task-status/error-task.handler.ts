import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { ErrorTaskStatusMessageDto } from '../../dtos/error-task-status-message.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { logger } from '../../../../common/utils/logger';
import { TaskStatus } from '../../../../common/enums/task-status.enum';

/**
 * Handler for error task messages
 * Processes task error updates
 */
export class ErrorTaskHandler extends BaseHandler {
  constructor(private readonly webCrawlTaskManager: IWebCrawlTaskManagerPort) {
    super();
  }

  /**
   * Process error task message
   */
  async process(message: EachMessagePayload): Promise<void> {
    const handlerName = 'ErrorTaskHandler';
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
        ErrorTaskStatusMessageDto,
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
          `Invalid error task data: ${validationResult.errorMessage}`
        );
      }

      const validatedData =
        validationResult.validatedData as ErrorTaskStatusMessageDto;

      // Update the task status to error
      const updatedTask =
        await this.webCrawlTaskManager.updateWebCrawlTaskStatus(
          id,
          TaskStatus.ERROR,
          validatedData.error
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
      logger.info('Web-crawl task failed', {
        correlationId,
        taskId: updatedTask.id,
        userEmail: updatedTask.userEmail,
        status: updatedTask.status,
        error: validatedData.error,
        processingStage: 'TASK_ERROR_SUCCESS',
      });
    } catch (error) {
      this.handleError(
        message,
        handlerName,
        error,
        correlationId,
        'TASK_ERROR'
      );
    }
  }
}
