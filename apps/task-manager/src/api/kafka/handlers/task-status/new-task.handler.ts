import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import {
  WebCrawlNewTaskHeaderDto,
  WebCrawlNewTaskMessageDto,
} from '../../dtos';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { WebCrawlRequestPublisher } from '../../../../infrastructure/messaging/kafka/publishers/web-crawl-request.publisher';
import { logger } from '../../../../common/utils/logger';
import { validateDto } from '../../../../common/utils/validation';
import { SimpleSpanManager } from '../../../../common/utils/simple-span-manager';

/**
 * Handler for new task messages
 * Processes task creation requests with enhanced trace context and web crawl request publishing
 */
export class NewTaskHandler extends BaseHandler {
  private readonly webCrawlPublisher: WebCrawlRequestPublisher;

  constructor(
    private readonly webCrawlTaskManager: IWebCrawlTaskManagerPort,
    webCrawlPublisher?: WebCrawlRequestPublisher
  ) {
    super();
    this.webCrawlPublisher =
      webCrawlPublisher || new WebCrawlRequestPublisher();
  }

  /**
   * Process new task message with enhanced trace context and web crawl request publishing
   */
  async process(
    message: EachMessagePayload,
    traceContext?: any
  ): Promise<void> {
    const handlerName = 'NewTaskHandler';
    const processingId = this.logProcessingStart(message, handlerName);

    // Create the main new-task-processing span first
    const newTaskSpan = SimpleSpanManager.createSpanFromTraceContext(
      'new-task-processing',
      traceContext,
      {
        'business.operation': 'create_task',
        'business.handler': handlerName,
        'messaging.kafka.processing_id': processingId,
      }
    );

    // Set initial status to OK
    newTaskSpan.setStatus({ code: 0 });

    try {
      // Extract and validate message headers using new DTO structure
      const headers = this.extractHeaders(
        (message.message.headers as Record<string, Buffer | undefined>) || {}
      );

      // Log trace context received
      logger.info('Trace context received', {
        traceId: traceContext?.traceId,
        spanId: traceContext?.spanId,
      });

      // Validate headers with separate span
      await SimpleSpanManager.withSpanWithParent(
        'validate-headers',
        async (validateHeadersSpan) => {
          const headerValidationResult = await validateDto(
            WebCrawlNewTaskHeaderDto,
            headers
          );

          if (!headerValidationResult.isValid) {
            this.logValidationError(
              message,
              handlerName,
              headerValidationResult.errorMessage || 'Header validation failed',
              processingId
            );
            throw new Error(
              `Invalid headers: ${headerValidationResult.errorMessage}`
            );
          }
        },
        newTaskSpan,
        {
          'business.operation': 'validate_headers',
          processingId: processingId,
        }
      );

      // Parse and validate message body with separate span
      const validatedData = await SimpleSpanManager.withSpanWithParent(
        'validate-message-body',
        async (validateBodySpan) => {
          const messageBody = JSON.parse(
            message.message.value?.toString() || '{}'
          );

          const bodyValidationResult = await validateDto(
            WebCrawlNewTaskMessageDto,
            messageBody
          );

          if (!bodyValidationResult.isValid) {
            this.logValidationError(
              message,
              handlerName,
              bodyValidationResult.errorMessage || 'Body validation failed',
              processingId
            );
            throw new Error(
              `Invalid message body: ${bodyValidationResult.errorMessage}`
            );
          }

          return bodyValidationResult.validatedData!;
        },
        newTaskSpan,
        {
          'business.operation': 'validate_message_body',
          processingId: processingId,
        }
      );

      // Log received data for new task creation
      logger.info('New task creation received', {
        userEmail: validatedData.user_email,
        userQuery: validatedData.user_query,
        baseUrl: validatedData.base_url,
        status: headers.status,
        messageTimestamp: headers.timestamp,
        traceId: traceContext?.traceId,
        spanId: traceContext?.spanId,
      });

      // Add business attributes to main span
      SimpleSpanManager.addAttributes(newTaskSpan, {
        'business.entity': 'web_crawl_task',
        'user.email': validatedData.user_email,
        'user.query.length': validatedData.user_query.length,
        'web.url': validatedData.base_url,
      });

      // Create the task with separate span
      const createdTask = await SimpleSpanManager.withSpanWithParent(
        'save-to-database',
        async (saveSpan) => {
          const task = await this.webCrawlTaskManager.createWebCrawlTask(
            validatedData.user_email,
            validatedData.user_query,
            validatedData.base_url
          );

          // Verify the task was actually created
          if (!task || !task.id) {
            throw new Error('Task creation failed - no task ID returned');
          }

          logger.info('Task successfully saved to database', {
            taskId: task.id,
            userEmail: task.userEmail,
            status: task.status,
            traceId: traceContext?.traceId,
            spanId: traceContext?.spanId,
          });

          return task;
        },
        newTaskSpan,
        {
          'business.operation': 'save_to_database',
          'business.entity': 'web_crawl_task',
          'user.email': validatedData.user_email,
        }
      );

      // Publish web crawl request with separate span
      await SimpleSpanManager.withSpanWithParent(
        'publish-web-crawl-request',
        async (publishSpan) => {
          const publishResult = await this.publishWebCrawlRequest(
            createdTask,
            traceContext
          );

          // Verify the publish operation actually succeeded
          if (!publishResult.success) {
            throw new Error(
              `Failed to publish web crawl request: ${publishResult.error}`
            );
          }

          logger.info('Web crawl request successfully published to Kafka', {
            taskId: createdTask.id,
            topic: publishResult.topic,
            partition: publishResult.partition,
            offset: publishResult.offset,
            traceId: traceContext?.traceId,
            spanId: traceContext?.spanId,
          });

          return publishResult;
        },
        newTaskSpan,
        {
          'business.operation': 'publish_web_crawl_request',
          taskId: createdTask.id,
        }
      );

      this.logProcessingSuccess(
        message,
        handlerName,
        processingId,
        createdTask
      );

      // End main span with success
      SimpleSpanManager.endSpan(newTaskSpan);
    } catch (error) {
      // End main span with error
      SimpleSpanManager.endSpanWithError(
        newTaskSpan,
        error instanceof Error ? error : new Error(String(error))
      );

      // Log the error with full context
      logger.error('New task processing failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingId,
        traceId: traceContext?.traceId,
        spanId: traceContext?.spanId,
      });

      throw error;
    }
  }

  /**
   * Publish web crawl request with trace context
   */
  private async publishWebCrawlRequest(
    task: {
      id: string;
      userEmail: string;
      userQuery: string;
      originalUrl: string;
    },
    traceContext?: any
  ): Promise<{
    success: boolean;
    error?: string;
    topic?: string;
    partition?: number;
    offset?: number;
  }> {
    try {
      const publishResult = await this.webCrawlPublisher.publishFromTaskData(
        task.id,
        task.userEmail,
        task.userQuery,
        task.originalUrl,
        traceContext
      );

      if (!publishResult.success) {
        throw new Error(
          `Failed to publish web crawl request: ${publishResult.error}`
        );
      }

      return publishResult;
    } catch (error) {
      logger.error('Failed to publish web crawl request', {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        // Include current trace context
        ...(this.getCurrentTraceContext() && {
          traceId: this.getCurrentTraceContext()!.traceId,
          spanId: this.getCurrentTraceContext()!.spanId,
        }),
      });
      throw error;
    }
  }
}
