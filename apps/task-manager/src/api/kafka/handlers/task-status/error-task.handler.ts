import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { WebCrawlErrorTaskMessageDto } from '../../dtos';
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
    const processingId = this.logProcessingStart(message, handlerName);

    // Process message (auto-instrumentation creates consumer span)
    {
      try {
                  // Extract headers
          const headers = this.extractHeaders(message.message.headers);
          const { task_id } = headers;

          if (!task_id) {
            throw new Error('Task ID is required in message headers');
          }

                  // Add business event for header extraction
          this.addBusinessEvent('headers_extracted', {
            taskId: task_id,
            processingId,
          });

          // Parse message body
          const messageBody = JSON.parse(
            message.message.value?.toString() || '{}'
          );

          // Validate message body
          const validationResult = await validateDto(
            WebCrawlErrorTaskMessageDto,
            messageBody
          );
          if (!validationResult.isValid) {
            this.logValidationError(
              message,
              handlerName,
              validationResult.errorMessage,
              processingId
            );
            throw new Error(
              `Invalid error task data: ${validationResult.errorMessage}`
            );
          }

          const validatedData =
            validationResult.validatedData as WebCrawlErrorTaskMessageDto;

          // Add business event for validation
          this.addBusinessEvent('body_validated', {
            taskId: task_id,
            processingId,
            'validation.duration': Date.now(),
          });

          // Add business attributes on active span
          this.addBusinessAttributes({
            'business.operation': 'error_task',
            'business.entity': 'web_crawl_task',
            'task.id': task_id,
            'task.status': TaskStatus.ERROR,
            'error.message': validatedData.error,
          });

          // Update the task status to error
          const updatedTask =
            await this.webCrawlTaskManager.updateWebCrawlTaskStatus(
              task_id,
              TaskStatus.ERROR,
              validatedData.error
            );

          if (!updatedTask) {
            throw new Error(`Task not found: ${task_id}`);
          }

                  // Log received data for task error update
          logger.info('Task error update received', {
            taskId: task_id,
            status: TaskStatus.ERROR,
            error: validatedData.error,
            messageTimestamp: headers.timestamp,
            traceId: this.getCurrentTraceContext()?.traceId,
            spanId: this.getCurrentTraceContext()?.spanId,
          });

          // Add business event for task error
          this.addBusinessEvent('task_error_updated', {
            taskId: updatedTask.id,
            status: updatedTask.status,
            processingId,
            'error.duration': Date.now(),
        });

        this.logProcessingSuccess(
          message,
          handlerName,
          processingId,
          updatedTask
        );
        // Task error update successful - no need to log success
        // done
      } catch (error) {
        // Add error attributes to active span
        this.addBusinessAttributes({
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
          'error.message': error instanceof Error ? error.message : String(error),
          'error.stack': error instanceof Error ? error.stack : undefined,
          'business.operation': 'error_task_processing_error',
        });

        this.handleError(
          message,
          handlerName,
          error,
          processingId,
          'TASK_ERROR'
        );

        throw error;
      }
    }
  }
}
