import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { NewTaskStatusMessageDto } from '../../dtos/new-task-status-message.dto';
import { TaskStatusHeaderDto } from '../../dtos/task-status-header.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
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

    try {
      // Extract and validate message headers using stacked error handling
      const headers = this.extractHeaders(message.message.headers);
      const validatedHeaders = await this.validateDtoWithStackedError(
        TaskStatusHeaderDto,
        headers,
        message,
        handlerName,
        correlationId
      );

      const taskId = validatedHeaders.id;

      // Parse message body
      const messageBody = JSON.parse(message.message.value?.toString() || '{}');

      // Validate message body using stacked error handling
      const validatedData = await this.validateDtoWithStackedError(
        NewTaskStatusMessageDto,
        messageBody,
        message,
        handlerName,
        correlationId
      );

      // Create the task using the ID from the message header
      const createdTask = await this.webCrawlTaskManager.createWebCrawlTask(
        taskId,
        validatedData.user_email,
        validatedData.user_query,
        validatedData.base_url
      );

      this.logProcessingSuccess(
        message,
        handlerName,
        correlationId,
        createdTask
      );

      // Log important event (task creation success) at INFO level
      logger.info(`Web-crawl task created: ${createdTask.id}`, {
        taskId: createdTask.id,
        correlationId,
        userEmail: createdTask.userEmail,
        status: createdTask.status,
        processingStage: 'TASK_CREATION_SUCCESS',
      });
    } catch (error) {
      this.handleError(
        message,
        handlerName,
        error,
        correlationId,
        'TASK_CREATION'
      );
    }
  }
}
