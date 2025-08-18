import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { ErrorTaskStatusMessageDto } from '../../dtos/error-task-status-message.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { logger } from '../../../../common/utils/logger';
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { TraceAttributes } from '../../../../common/utils/tracing/trace-attributes';

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

    // Use tracing wrapper for the entire message processing
    await this.traceKafkaMessage(message, 'error_task_processing', async () => {
      try {
        // Extract headers
        const headers = this.extractHeaders(message.message.headers);
        const { id } = headers;

        if (!id) {
          throw new Error('Task ID is required in message headers');
        }

        // Add trace event for header extraction
        this.addTraceEvent('headers_extracted', {
          taskId: id,
          correlationId,
        });

        // Parse message body
        const messageBody = JSON.parse(
          message.message.value?.toString() || '{}'
        );

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

        // Add trace event for validation
        this.addTraceEvent('body_validated', {
          taskId: id,
          correlationId,
          'validation.duration': Date.now(),
        });

        // Set task error attributes
        this.setTraceAttributes(
          TraceAttributes.createTaskAttributes(
            id,
            TaskStatus.ERROR,
            undefined,
            undefined,
            {
              'error.message': validatedData.error,
              correlationId,
            }
          )
        );

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

        // Add trace event for task error
        this.addTraceEvent('task_error_updated', {
          taskId: updatedTask.id,
          status: updatedTask.status,
          correlationId,
          'error.duration': Date.now(),
        });

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

        return updatedTask;
      } catch (error) {
        // Add error attributes to trace
        this.setTraceAttributes(
          TraceAttributes.createErrorAttributes(
            error as Error,
            'TASK_ERROR_PROCESSING_ERROR',
            {
              correlationId,
                              taskId: this.extractHeaders(message.message.headers).task_id,
            }
          )
        );

        this.handleError(
          message,
          handlerName,
          error,
          correlationId,
          'TASK_ERROR'
        );

        throw error;
      }
    });
  }
}
