import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { validateDto } from '../../../../common/utils/validation';
import { WebCrawlCompletedTaskMessageDto } from '../../dtos';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { logger } from '../../../../common/utils/logger';
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { TraceAttributes } from '../../../../common/utils/tracing/trace-attributes';

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

    // Use tracing wrapper for the entire message processing
    await this.traceKafkaMessage(
      message,
      'complete_task_processing',
      async () => {
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
            WebCrawlCompletedTaskMessageDto,
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
            validationResult.validatedData as WebCrawlCompletedTaskMessageDto;

          // Add trace event for validation
          this.addTraceEvent('body_validated', {
            taskId: id,
            correlationId,
            'validation.duration': Date.now(),
          });

          // Set task completion attributes
          this.setTraceAttributes(
            TraceAttributes.createTaskAttributes(
              id,
              TaskStatus.COMPLETED,
              undefined,
              undefined,
              {
                'crawl.result.size': validatedData.crawl_result?.length || 0,
                correlationId,
              }
            )
          );

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

          // Add trace event for task completion
          this.addTraceEvent('task_completed', {
            taskId: updatedTask.id,
            status: updatedTask.status,
            correlationId,
            'completion.duration': Date.now(),
          });

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

          return updatedTask;
        } catch (error) {
          // Add error attributes to trace
          this.setTraceAttributes(
            TraceAttributes.createErrorAttributes(
              error as Error,
              'TASK_COMPLETION_ERROR',
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
            'TASK_COMPLETION'
          );

          throw error;
        }
      }
    );
  }
}
