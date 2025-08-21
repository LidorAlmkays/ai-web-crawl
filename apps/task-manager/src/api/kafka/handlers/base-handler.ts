import { EachMessagePayload, IHeaders } from 'kafkajs';
import { IHandler } from './base-handler.interface';
import { logger } from '../../../common/utils/logger';
import { trace } from '@opentelemetry/api';
import { 
  extractTraceId, 
  generateSpanId, 
  parseTraceparent
} from '../../../common/utils/tracing';

/**
 * Base handler class for Kafka message processing
 * 
 * This class provides common functionality for all Kafka message handlers:
 * - Message header extraction and validation
 * - Error handling and logging
 * - Business event and attribute management
 * - Trace context propagation
 */
export abstract class BaseHandler implements IHandler {
  /**
   * Process a Kafka message
   * 
   * @param message - The Kafka message to process
   */
  abstract process(message: EachMessagePayload): Promise<void>;

  /**
   * Extract and validate message headers
   * 
   * @param headers - Kafka message headers
   * @returns Extracted header data
   */
  protected extractHeaders(headers: IHeaders | undefined): Record<string, string> {
    try {
      const headerData: Record<string, string> = {};
      if (!headers) return headerData;

      // Debug logging to see what we're receiving
      logger.debug('Extracting headers from Kafka message', {
        rawHeaders: headers,
        headerKeys: Object.keys(headers),
      });

      // Extract string headers, handling Buffer | string | (Buffer|string)[] | undefined
      for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          const first = value[0];
          if (first === undefined) continue;
          headerData[key] = Buffer.isBuffer(first) ? first.toString('utf8') : String(first);
          continue;
        }
        headerData[key] = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
      }

      // Debug logging to see what we extracted
      logger.debug('Extracted headers', {
        extractedHeaders: headerData,
        extractedKeys: Object.keys(headerData),
      });

      return headerData;
    } catch (error) {
      logger.error('Failed to extract headers', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Invalid message headers');
    }
  }

  /**
   * Log the start of message processing
   * 
   * @param message - The Kafka message being processed
   * @param handlerName - Name of the handler processing the message
   * @returns Generated processing ID for tracking
   */
  protected logProcessingStart(
    message: EachMessagePayload,
    handlerName: string
  ): string {
    const processingId = this.generateProcessingId();
    
    // Extract trace context from headers for logging (kept for potential future use)
    // const traceContext = this.extractTraceContextFromHeaders(
    //   message.message.headers as Record<string, Buffer | undefined> || {}
    // );
    
    // Don't log processing start - this will be handled by specific handlers
    // logger.info(`Starting ${handlerName} processing`, {
    //   processingId,
    //   topic: message.topic,
    //   partition: message.partition,
    //   offset: message.message.offset,
    //   timestamp: message.message.timestamp,
    //   traceId: traceContext?.traceId,
    //   spanId: traceContext?.spanId,
    //   parentId: traceContext?.parentId,
    // });

    return processingId;
  }

  /**
   * Log successful message processing
   * 
   * @param message - The Kafka message that was processed
   * @param handlerName - Name of the handler that processed the message
   * @param processingId - Processing ID for tracking
   * @param result - Optional result data to log
   */
  protected logProcessingSuccess(
    message: EachMessagePayload,
    handlerName: string,
    processingId: string,
    result?: any
  ): void {
    // Remove: 'Completed processing successfully' - no need to log successful completion
  }

  /**
   * Log validation errors
   * 
   * @param message - The Kafka message that failed validation
   * @param handlerName - Name of the handler that attempted processing
   * @param errorMessage - Validation error message
   * @param processingId - Processing ID for tracking
   */
  protected logValidationError(
    message: EachMessagePayload,
    handlerName: string,
    errorMessage: string | undefined,
    processingId: string
  ): void {
    // Get current trace context from active span
    const currentTraceContext = this.getCurrentTraceContext();
    
    logger.error(`Validation failed in ${handlerName}`, {
      processingId,
      topic: message.topic,
      partition: message.partition,
      offset: message.message.offset,
      error: errorMessage ?? 'Validation failed',
      // Include current trace context
      ...(currentTraceContext && {
        traceId: currentTraceContext.traceId,
        spanId: currentTraceContext.spanId,
      }),
    });
  }

  /**
   * Handle processing errors
   * 
   * @param message - The Kafka message that caused an error
   * @param handlerName - Name of the handler that encountered the error
   * @param error - The error that occurred
   * @param processingId - Processing ID for tracking
   * @param operation - Name of the operation that failed
   */
  protected handleError(
    message: EachMessagePayload,
    handlerName: string,
    error: any,
    processingId: string,
    operation: string
  ): void {
    // Get current trace context from active span
    const currentTraceContext = this.getCurrentTraceContext();
    
    logger.error(`Error in ${handlerName} during ${operation}`, {
      processingId,
      topic: message.topic,
      partition: message.partition,
      offset: message.message.offset,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      // Include current trace context
      ...(currentTraceContext && {
        traceId: currentTraceContext.traceId,
        spanId: currentTraceContext.spanId,
      }),
    });
  }

  /**
   * Add business attributes to the active span
   * 
   * @param attributes - Attributes to add to the span
   */
  protected addBusinessAttributes(attributes: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Add business event to the active span
   * 
   * @param eventName - Name of the business event
   * @param attributes - Event attributes
   */
  protected addBusinessEvent(
    eventName: string,
    attributes: Record<string, any>
  ): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(eventName, attributes);
    }
  }

  /**
   * Generate a unique processing ID for tracking
   * 
   * @returns Unique processing ID
   */
  private generateProcessingId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract trace context from Kafka message headers
   * 
   * @param headers - Kafka message headers
   * @returns Trace context information or null if not present
   */
  protected extractTraceContextFromHeaders(headers: Record<string, Buffer | undefined>) {
    const traceparentBuffer = headers['traceparent'];
    const tracestateBuffer = headers['tracestate'];
    
    if (!traceparentBuffer) {
      return null;
    }

    const traceparent = traceparentBuffer.toString();
    const tracestate = tracestateBuffer?.toString();

    // Parse the traceparent header
    const parsed = parseTraceparent(traceparent);
    if (!parsed) {
      logger.error('Invalid traceparent header format', { traceparent });
      return null;
    }

    // Extract trace ID and create context
    const traceId = extractTraceId(traceparent);
    const currentSpanId = generateSpanId();
    
    const traceContext = {
      traceId,
      spanId: currentSpanId,
      parentId: parsed.parentId,
      traceFlags: parsed.traceFlags,
      traceparent,
      tracestate,
    };

    // Add trace context to active span attributes
    this.addBusinessAttributes({
      'trace.id': traceId,
      'trace.span_id': currentSpanId,
      'trace.parent_id': parsed.parentId,
      'trace.flags': parsed.traceFlags,
    });



    return traceContext;
  }

  /**
   * Get current trace context from active span
   * 
   * @returns Current trace context or null if no active span
   */
  protected getCurrentTraceContext() {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return null;
    }

    const spanContext = activeSpan.spanContext();
    const currentSpanId = generateSpanId(); // Generate new span ID for child operations
    
    return {
      traceId: spanContext.traceId,
      spanId: currentSpanId,
      parentId: spanContext.spanId,
      traceFlags: spanContext.traceFlags.toString(16).padStart(2, '0'),
    };
  }

  /**
   * Log trace context information for debugging
   * 
   * @param traceContext - Trace context to log
   * @param operation - Operation name for context
   */
  protected logTraceContext(traceContext: any, operation: string): void {
    logger.debug(`Trace context for ${operation}`, {
      operation,
      traceId: traceContext?.traceId,
      spanId: traceContext?.spanId,
      parentId: traceContext?.parentId,
      traceFlags: traceContext?.traceFlags,
    });
  }
}
