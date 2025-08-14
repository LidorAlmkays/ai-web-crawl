import { TraceContextManager, TraceContext } from './trace-context';
import { TraceContextExtractor } from './trace-context-extractor';
import { ILogger } from '../logging/interfaces';

/**
 * Kafka message trace context utilities
 *
 * Provides utilities for handling trace context in Kafka consumer message processing
 */
export class KafkaTraceContext {
  /**
   * Process incoming Kafka message and generate new span ID
   *
   * @param headers - Kafka message headers
   * @param baseLogger - Base logger instance
   * @returns Object containing trace context and trace-aware logger
   */
  static processMessage(
    headers: Record<string, any>,
    baseLogger: ILogger
  ): {
    traceContext: TraceContext;
    traceLogger: ILogger;
    isNewTrace: boolean;
  } {
    // Extract existing trace context from headers
    const existingContext =
      TraceContextExtractor.extractTraceContextFromKafkaHeaders(headers);

    let traceContext: TraceContext;
    let isNewTrace = false;

    if (existingContext) {
      // If trace context exists, generate new span ID for this message processing
      traceContext = TraceContextManager.createTraceContext(
        existingContext.traceId,
        undefined, // Generate new span ID
        existingContext.traceFlags
      );
    } else {
      // If no trace context, create completely new trace context
      traceContext = TraceContextManager.createTraceContext();
      isNewTrace = true;
    }

    // Create trace-aware logger
    const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
      {
        traceparent: TraceContextManager.formatW3CTraceContext(
          traceContext.traceId,
          traceContext.spanId,
          traceContext.traceFlags
        ),
      },
      baseLogger
    );

    return {
      traceContext,
      traceLogger,
      isNewTrace,
    };
  }

  /**
   * Create headers for outgoing Kafka messages with trace context
   *
   * @param existingHeaders - Existing headers to preserve
   * @param traceContext - Current trace context
   * @returns Headers with trace context injected
   */
  static createOutgoingHeaders(
    existingHeaders: Record<string, any> = {},
    traceContext: TraceContext
  ): Record<string, any> {
    return TraceContextManager.injectIntoKafkaHeaders(
      existingHeaders,
      traceContext.traceId,
      traceContext.spanId,
      traceContext.traceFlags
    );
  }
}

