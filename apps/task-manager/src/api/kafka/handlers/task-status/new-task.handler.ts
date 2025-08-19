import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../dtos';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { WebCrawlRequestPublisher } from '../../../../infrastructure/messaging/kafka/publishers/web-crawl-request.publisher';
import { TraceAttributes } from '../../../../common/utils/tracing/trace-attributes';
// TraceContextManager intentionally not used; we prefer correlationId over synthetic trace IDs
import { logger } from '../../../../common/utils/logger';

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
    this.webCrawlPublisher = webCrawlPublisher || new WebCrawlRequestPublisher();
  }

  /**
   * Process new task message with enhanced trace context and web crawl request publishing
   */
  async process(message: EachMessagePayload): Promise<void> {
    const handlerName = 'NewTaskHandler';
    const correlationId = this.logProcessingStart(message, handlerName);

    // Use tracing wrapper for the entire message processing
    await this.traceKafkaMessage(message, 'new_task_processing', async () => {
      try {
        // Extract and validate message headers using new DTO structure
        const headers = this.extractHeaders(message.message.headers);
        await this.validateDtoWithStackedError(
          WebCrawlNewTaskHeaderDto,
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

        // Validate message body using new DTO structure
        const validatedData = await this.validateDtoWithStackedError(
          WebCrawlNewTaskMessageDto,
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

        // Use correlationId as primary context identifier unless OTEL provides traceparent end-to-end
        // Intentionally ignoring W3C traceparent to avoid mixing identifiers

        // Log processing start with trace context
        logger.info('Processing new task creation', {
          correlationId,
          userEmail: validatedData.user_email,
          userQuery: validatedData.user_query,
          baseUrl: validatedData.base_url,
          status: headers.status,
          messageTimestamp: headers.timestamp,
        });

        // Set task creation attributes
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

        // Log the task creation success with the exact message format
        logger.info(`Task ${createdTask.id} has been created`, {
          taskId: createdTask.id,
          userEmail: createdTask.userEmail,
          status: createdTask.status,
          processingStage: 'TASK_CREATION_SUCCESS',
        });

        // Only propagate correlationId (no synthetic traceparent)
        const traceOptions = { correlationId };

        // Publish web crawl request with trace and correlation context
        await this.publishWebCrawlRequest(createdTask, traceOptions);

        this.logProcessingSuccess(
          message,
          handlerName,
          correlationId,
          createdTask
        );

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



  /**
   * Publish web crawl request with trace context
   */
  private async publishWebCrawlRequest(
    task: { id: string; userEmail: string; userQuery: string; originalUrl: string },
    traceOptions?: { traceparent?: string; tracestate?: string; correlationId?: string }
  ): Promise<void> {
    try {
      const publishResult = await this.webCrawlPublisher.publishFromTaskData(
        task.id,
        task.userEmail,
        task.userQuery,
        task.originalUrl,
        {
          traceContext: traceOptions,
        }
      );

      if (!publishResult.success) {
        throw new Error(`Failed to publish web crawl request: ${publishResult.error}`);
      }

      logger.info('Web crawl request published successfully', {
        taskId: task.id,
        messageId: publishResult.messageId,
        topic: publishResult.topic,
        traceId: undefined,
      });
    } catch (error) {
      logger.error('Failed to publish web crawl request', {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        traceId: undefined,
      });
      throw error;
    }
  }
}
