import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { WebCrawlCompletedTaskMessageDto } from '../../dtos';
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
    const processingId = this.logProcessingStart(message, handlerName);

    // Process message (auto-instrumentation creates consumer span)
    {
        try {
          // Extract headers
          const headers = this.extractHeaders(message.message.headers);
          const { id } = headers;

          if (!id) {
            throw new Error('Task ID is required in message headers');
          }

          // Add business event for header extraction
          this.addBusinessEvent('headers_extracted', {
            taskId: id,
            processingId,
          });

          // Parse message body
          const messageBody = JSON.parse(
            message.message.value?.toString() || '{}'
          );

          // Validate message body
          const validationResult = await validateDto(
            WebCrawlCompletedTaskMessageDto,
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
              `Invalid complete task data: ${validationResult.errorMessage}`
            );
          }

          const validatedData =
            validationResult.validatedData as WebCrawlCompletedTaskMessageDto;

          // Add business event for validation
          this.addBusinessEvent('body_validated', {
            taskId: id,
            processingId,
            'validation.duration': Date.now(),
          });

          // Add business attributes on active span
          this.addBusinessAttributes({
            'business.operation': 'complete_task',
            'business.entity': 'web_crawl_task',
            'task.id': id,
            'task.status': TaskStatus.COMPLETED,
            'crawl.result.size': validatedData.crawl_result?.length || 0,
          });

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

          // Add business event for task completion
          this.addBusinessEvent('task_completed', {
            taskId: updatedTask.id,
            status: updatedTask.status,
            processingId,
            'completion.duration': Date.now(),
          });

          this.logProcessingSuccess(
            message,
            handlerName,
            processingId,
            updatedTask
          );
          logger.info(`Web-crawl task completed: ${updatedTask.id}`, {
            processingId,
            taskId: updatedTask.id,
            userEmail: updatedTask.userEmail,
            status: updatedTask.status,
            processingStage: 'TASK_COMPLETION_SUCCESS',
          });
          // done
        } catch (error) {
          // Add error attributes to active span
          this.addBusinessAttributes({
            'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
            'error.message': error instanceof Error ? error.message : String(error),
            'error.stack': error instanceof Error ? error.stack : undefined,
            'business.operation': 'complete_task_error',
          });

          this.handleError(
            message,
            handlerName,
            error,
            processingId,
            'TASK_COMPLETION'
          );

          throw error;
        }
      }
  }
}
