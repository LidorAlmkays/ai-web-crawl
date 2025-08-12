import { EachMessagePayload } from 'kafkajs';
import { IHandler } from './base-handler.interface';
import { logger } from '../../../common/utils/logger';
import { getStackedErrorHandler } from '../../../common/utils/stacked-error-handler';
import { validateDto } from '../../../common/utils/validation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base handler class with common functionality
 * Provides error handling and logging utilities
 * Simplified approach - no complex validation or deduplication
 */
export abstract class BaseHandler implements IHandler {
  /**
   * Process a Kafka message
   * @param message - The full Kafka message payload
   */
  abstract process(message: EachMessagePayload): Promise<void>;

  /**
   * Generate correlation ID for message tracking
   */
  protected generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Extract headers from Kafka message
   * Converts Buffer headers to string values
   */
  protected extractHeaders(headers: any): any {
    const extractedHeaders: any = {};

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (value instanceof Buffer) {
          extractedHeaders[key] = value.toString('utf8');
        } else if (Array.isArray(value)) {
          // Handle array of buffers (shouldn't happen with our headers)
          extractedHeaders[key] = value[0]?.toString('utf8') || '';
        } else {
          extractedHeaders[key] = value;
        }
      }
    }

    // Debug logging to see what headers we're extracting
    logger.debug('Extracted headers', {
      originalHeaders: headers,
      extractedHeaders,
      headerKeys: Object.keys(extractedHeaders),
    });

    return extractedHeaders;
  }

  /**
   * Create structured error object with full context
   */
  protected createStructuredError(
    error: any,
    message: EachMessagePayload,
    handlerName: string,
    correlationId: string,
    processingStage: string
  ): any {
    const headers = this.extractHeaders(message.message.headers);
    const messageBody = message.message.value?.toString() || '{}';

    return {
      correlationId,
      handlerName,
      processingStage,
      timestamp: new Date().toISOString(),
      topic: message.topic,
      partition: message.partition,
      offset: message.message.offset,
      messageTimestamp: message.message.timestamp,
      headers,
      messageBody:
        messageBody.length > 1000
          ? messageBody.substring(0, 1000) + '...'
          : messageBody,
      error: {
        name: error.name || 'UnknownError',
        message: error.message || 'Unknown error occurred',
        stack: error.stack || 'No stack trace available',
        code: error.code,
        cause: error.cause
          ? {
              name: error.cause.name,
              message: error.cause.message,
              stack: error.cause.stack,
            }
          : undefined,
      },
      context: {
        service: 'Task Manager',
        component: 'Kafka Handler',
        operation: `${handlerName}.${processingStage}`,
      },
    };
  }

  /**
   * Categorize error for better handling
   */
  protected categorizeError(error: any): string {
    if (error.code === '42P02' || error.code === '42601') {
      return 'DATABASE_QUERY_ERROR';
    }
    if (
      error.name === 'ValidationError' ||
      error.message?.includes('validation')
    ) {
      return 'VALIDATION_ERROR';
    }
    if (
      error.name === 'KafkaJSProtocolError' ||
      error.name === 'KafkaJSNonRetriableError'
    ) {
      return 'KAFKA_CONNECTION_ERROR';
    }
    if (
      error.message?.includes('not found') ||
      error.message?.includes('Task not found')
    ) {
      return 'RESOURCE_NOT_FOUND';
    }
    if (
      error.message?.includes('enum') ||
      error.message?.includes('invalid input value')
    ) {
      return 'ENUM_VALIDATION_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Log message processing start with correlation ID
   */
  protected logProcessingStart(
    message: EachMessagePayload,
    handlerName: string,
    correlationId?: string
  ): string {
    const id = correlationId || this.generateCorrelationId();
    const headers = this.extractHeaders(message.message.headers);
    const taskId = headers.id || headers.taskId;
    const eventType = this.extractEventType(message);

    // Log event reception at INFO level
    logger.info(
      `Kafka event received: ${eventType} (${taskId || 'no-task-id'})`,
      {
        taskId,
        correlationId: id,
        topic: message.topic,
      }
    );

    // Log detailed processing at DEBUG level
    logger.debug(`Processing message with ${handlerName}`, {
      taskId,
      correlationId: id,
      topic: message.topic,
      partition: message.partition,
      offset: message.message.offset,
      timestamp: message.message.timestamp,
      headers,
      processingStage: 'START',
    });

    return id;
  }

  /**
   * Log message processing success with correlation ID
   */
  protected logProcessingSuccess(
    message: EachMessagePayload,
    handlerName: string,
    correlationId: string,
    result?: any
  ): void {
    const headers = this.extractHeaders(message.message.headers);
    const taskId = headers.id || headers.taskId;

    // Log processing success at DEBUG level only
    logger.debug(`Message processed successfully by ${handlerName}`, {
      taskId,
      correlationId,
      topic: message.topic,
      partition: message.partition,
      offset: message.message.offset,
      processingStage: 'SUCCESS',
      result: result
        ? {
            taskId: result.id,
            status: result.status,
            userEmail: result.userEmail,
          }
        : undefined,
    });
  }

  /**
   * Log message processing error with full context
   */
  protected logProcessingError(
    message: EachMessagePayload,
    handlerName: string,
    error: any,
    correlationId: string,
    processingStage: string
  ): void {
    const structuredError = this.createStructuredError(
      error,
      message,
      handlerName,
      correlationId,
      processingStage
    );

    const errorCategory = this.categorizeError(error);

    logger.error(`Error processing message with ${handlerName}`, {
      ...structuredError,
      errorCategory,
      severity: this.getErrorSeverity(errorCategory),
    });
  }

  /**
   * Get error severity based on error category
   */
  protected getErrorSeverity(
    errorCategory: string
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (errorCategory) {
      case 'KAFKA_CONNECTION_ERROR':
      case 'DATABASE_QUERY_ERROR':
        return 'HIGH';
      case 'VALIDATION_ERROR':
      case 'ENUM_VALIDATION_ERROR':
        return 'MEDIUM';
      case 'RESOURCE_NOT_FOUND':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Handle processing errors with stacked error logging
   */
  protected handleError(
    message: EachMessagePayload,
    handlerName: string,
    error: any,
    correlationId: string,
    processingStage = 'PROCESSING'
  ): void {
    const headers = this.extractHeaders(message.message.headers);
    const taskId = headers.id || headers.taskId;
    const stackedErrorHandler = getStackedErrorHandler();

    // Initialize stacked error context
    stackedErrorHandler.initializeContext(taskId, correlationId);

    // Add handler-level error context
    stackedErrorHandler.addErrorContext(
      'HANDLER',
      handlerName,
      processingStage,
      `Error processing message: ${error.message || 'Unknown error'}`,
      {
        topic: message.topic,
        partition: message.partition,
        offset: message.message.offset,
        headers,
      },
      undefined,
      undefined,
      'Review message format and handler implementation'
    );

    // Log the stacked error
    stackedErrorHandler.logStackedError(
      error,
      handlerName,
      this.getErrorSeverity(this.categorizeError(error))
    );

    throw error; // Re-throw to prevent offset commit
  }

  /**
   * Validate DTO with stacked error handling
   */
  protected async validateDtoWithStackedError<T>(
    dtoClass: new () => T,
    data: any,
    message: EachMessagePayload,
    handlerName: string,
    correlationId: string
  ): Promise<T> {
    const headers = this.extractHeaders(message.message.headers);
    const taskId = headers.id || headers.taskId;

    const result = await validateDto(dtoClass, data, taskId);

    if (!result.isValid) {
      // Create validation error for stacked error handler
      const validationError = new Error(
        `DTO validation failed: ${result.errorMessage}`
      );
      validationError.name = 'ValidationError';

      const stackedErrorHandler = getStackedErrorHandler();
      stackedErrorHandler.initializeContext(taskId, correlationId);

      // Add handler-level error context
      stackedErrorHandler.addErrorContext(
        'HANDLER',
        handlerName,
        'validateDto',
        `DTO validation failed for ${dtoClass.name}`,
        { dtoName: dtoClass.name, data },
        undefined,
        undefined,
        'Review message format and validation rules'
      );

      // Log the stacked error
      stackedErrorHandler.logStackedError(
        validationError,
        handlerName,
        'MEDIUM'
      );

      throw validationError;
    }

    return result.validatedData!;
  }

  /**
   * Log validation errors with detailed context and sanitized data
   */
  protected logValidationError(
    message: EachMessagePayload,
    handlerName: string,
    validationErrors: any,
    correlationId: string
  ): void {
    const headers = this.extractHeaders(message.message.headers);
    const taskId = headers.id || headers.taskId;
    const receivedData = message.message.value?.toString();
    const errorDetails = this.formatValidationErrors(validationErrors);

    logger.error(
      `Validation failed: ${errorDetails} in message: ${receivedData}`,
      {
        validationErrors,
        correlationId,
        topic: message.topic,
        partition: message.partition,
        offset: message.message.offset,
        handlerName,
        taskId,
        processingStage: 'VALIDATION',
        errorCategory: 'VALIDATION_ERROR',
        severity: 'MEDIUM',
      }
    );
  }

  /**
   * Extract event type from message headers
   */
  private extractEventType(message: EachMessagePayload): string {
    const headers = this.extractHeaders(message.message.headers);
    return (
      headers.eventType || headers.status || headers.task_type || 'unknown'
    );
  }

  /**
   * Format validation errors into a readable string
   */
  private formatValidationErrors(validationErrors: any): string {
    if (Array.isArray(validationErrors)) {
      return validationErrors
        .map(
          (error: any) =>
            `${error.property}: ${
              error.constraints
                ? Object.values(error.constraints).join(', ')
                : error.message
            }`
        )
        .join('; ');
    }

    if (typeof validationErrors === 'object') {
      return Object.entries(validationErrors)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
    }

    return String(validationErrors);
  }
}
