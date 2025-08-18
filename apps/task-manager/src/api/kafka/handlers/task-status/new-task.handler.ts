import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { NewTaskStatusMessageDto } from '../../dtos/new-task-status-message.dto';
import { NewTaskHeaderDto } from '../../dtos/new-task-header.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { TraceAttributes } from '../../../../common/utils/tracing/trace-attributes';
import { logger } from '../../../../common/utils/logger';

/**
 * Handler for new task messages
 * Processes task creation requests
 */
export class NewTaskHandler extends BaseHandler {
  constructor(private readonly webCrawlTaskManager: IWebCrawlTaskManagerPort) {
    super();
  }

  /**
   * Process new task message
   */
  async process(message: EachMessagePayload): Promise<void> {
    const handlerName = 'NewTaskHandler';
    const correlationId = this.logProcessingStart(message, handlerName);

    // Use tracing wrapper for the entire message processing
    await this.traceKafkaMessage(message, 'new_task_processing', async () => {
      try {
        // Extract and validate message headers using stacked error handling
        const headers = this.extractHeaders(message.message.headers);
        await this.validateDtoWithStackedError(
          NewTaskHeaderDto,
          headers,
          message,
          handlerName,
          correlationId
        );

        // Add trace event for header validation
        this.addTraceEvent('headers_validated', {
          correlationId,
          'validation.duration': Date.now(),
        });

        // Parse message body
        const messageBody = JSON.parse(
          message.message.value?.toString() || '{}'
        );

        // Validate message body using stacked error handling
        const validatedData = await this.validateDtoWithStackedError(
          NewTaskStatusMessageDto,
          messageBody,
          message,
          handlerName,
          correlationId
        );

        // Add trace event for body validation
        this.addTraceEvent('body_validated', {
          correlationId,
          'validation.duration': Date.now(),
        });

        // Set task creation attributes
        // Trace attributes without assuming client id
        this.setTraceAttributes(
          TraceAttributes.createTaskAttributes(
            '',
            'new',
            undefined,
            validatedData.base_url,
            {
              'user.email': validatedData.user_email,
              'user.query': validatedData.user_query,
              correlationId,
            }
          )
        );

        // Create the task without providing an ID (DB generates UUID)
        const createdTask = await this.webCrawlTaskManager.createWebCrawlTask(
          validatedData.user_email,
          validatedData.user_query,
          validatedData.base_url
        );

        // Add trace event for task creation
        this.addTraceEvent('task_created', {
          taskId: createdTask.id,
          status: createdTask.status,
          correlationId,
        });

        this.logProcessingSuccess(
          message,
          handlerName,
          correlationId,
          createdTask
        );

        // Log the task creation success with the exact message format
        logger.info(`Task ${createdTask.id} has been created`, {
          taskId: createdTask.id,
          correlationId,
          userEmail: createdTask.userEmail,
          status: createdTask.status,
          processingStage: 'TASK_CREATION_SUCCESS',
        });

        return createdTask;
      } catch (error) {
        // Add error attributes to trace
        this.setTraceAttributes(
          TraceAttributes.createErrorAttributes(
            error as Error,
            'TASK_CREATION_ERROR',
            {
              correlationId,
            }
          )
        );

        this.handleError(
          message,
          handlerName,
          error,
          correlationId,
          'TASK_CREATION'
        );

        throw error;
      }
    });
  }
}
