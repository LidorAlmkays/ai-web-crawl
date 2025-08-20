import { EachMessagePayload } from 'kafkajs';
import { BaseHandler } from '../base-handler';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../dtos';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { WebCrawlRequestPublisher } from '../../../../infrastructure/messaging/kafka/publishers/web-crawl-request.publisher';
import { logger } from '../../../../common/utils/logger';
import { validateDto } from '../../../../common/utils/validation';

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
    const processingId = this.logProcessingStart(message, handlerName);

    // Process message (auto-instrumentation creates consumer span)
    {
      try {
        // Extract and validate message headers using new DTO structure
        const headers = this.extractHeaders(message.message.headers as Record<string, Buffer | undefined> || {});
        
        // Extract trace context from headers
        const traceContext = this.extractTraceContextFromHeaders(message.message.headers as Record<string, Buffer | undefined> || {});
        this.logTraceContext(traceContext, 'new-task-processing');
        
        const headerValidationResult = await validateDto(WebCrawlNewTaskHeaderDto, headers);
        
        if (!headerValidationResult.isValid) {
          this.logValidationError(
            message,
            handlerName,
            headerValidationResult.errorMessage || 'Header validation failed',
            processingId
          );
          throw new Error(`Invalid headers: ${headerValidationResult.errorMessage}`);
        }

        // Add business event for header validation
        this.addBusinessEvent('headers_validated', {
          processingId,
          'validation.duration': Date.now(),
        });

        // Parse message body
        const messageBody = JSON.parse(
          message.message.value?.toString() || '{}'
        );

        // Validate message body using new DTO structure
        const bodyValidationResult = await validateDto(WebCrawlNewTaskMessageDto, messageBody);
        
        if (!bodyValidationResult.isValid) {
          this.logValidationError(
            message,
            handlerName,
            bodyValidationResult.errorMessage || 'Body validation failed',
            processingId
          );
          throw new Error(`Invalid message body: ${bodyValidationResult.errorMessage}`);
        }

        const validatedData = bodyValidationResult.validatedData!;

        // Add business event for body validation
        this.addBusinessEvent('body_validated', {
          processingId,
          'validation.duration': Date.now(),
        });

        // Log processing start with trace context
        logger.info('Processing new task creation', {
          processingId,
          userEmail: validatedData.user_email,
          userQuery: validatedData.user_query,
          baseUrl: validatedData.base_url,
          status: headers.status,
          messageTimestamp: headers.timestamp,
        });

        // Add business attributes on active span
        this.addBusinessAttributes({
          'business.operation': 'create_task',
          'business.entity': 'web_crawl_task',
          'user.email': validatedData.user_email,
          'user.query.length': validatedData.user_query.length,
          'web.url': validatedData.base_url,
        });

        // Create the task without providing an ID (DB generates UUID)
        const createdTask = await this.webCrawlTaskManager.createWebCrawlTask(
          validatedData.user_email,
          validatedData.user_query,
          validatedData.base_url
        );

        // Add business event for task creation with trace context
        this.addBusinessEvent('task_created', {
          taskId: createdTask.id,
          status: createdTask.status,
          processingId,
          traceId: traceContext?.traceId,
          spanId: traceContext?.spanId,
        });

        // Log the task creation success with the exact message format
        logger.info(`Task ${createdTask.id} has been created`, {
          taskId: createdTask.id,
          userEmail: createdTask.userEmail,
          status: createdTask.status,
          processingStage: 'TASK_CREATION_SUCCESS',
          // Include trace context for incoming message
          ...(traceContext && {
            traceId: traceContext.traceId,
            spanId: traceContext.spanId,
          }),
        });

        // Publish web crawl request (auto-instrumentation will inject W3C context)
        await this.publishWebCrawlRequest(createdTask);

        this.logProcessingSuccess(
          message,
          handlerName,
          processingId,
          createdTask
        );
        // done
      } catch (error) {
        // Add error attributes to active span
        this.addBusinessAttributes({
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
          'error.message': error instanceof Error ? error.message : String(error),
          'error.stack': error instanceof Error ? error.stack : undefined,
          'business.operation': 'create_task_error',
        });

        this.handleError(
          message,
          handlerName,
          error,
          processingId,
          'TASK_CREATION'
        );

        throw error;
      }
    }
  }

  /**
   * Publish web crawl request with trace context
   */
  private async publishWebCrawlRequest(
    task: { id: string; userEmail: string; userQuery: string; originalUrl: string }
  ): Promise<void> {
    try {
      const publishResult = await this.webCrawlPublisher.publishFromTaskData(
        task.id,
        task.userEmail,
        task.userQuery,
        task.originalUrl
      );

      if (!publishResult.success) {
        throw new Error(`Failed to publish web crawl request: ${publishResult.error}`);
      }

      logger.info('Web crawl request published successfully', {
        taskId: task.id,
        messageId: publishResult.messageId,
        topic: publishResult.topic,
        // Include current trace context
        ...(this.getCurrentTraceContext() && {
          traceId: this.getCurrentTraceContext()!.traceId,
          spanId: this.getCurrentTraceContext()!.spanId,
        }),
      });
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
