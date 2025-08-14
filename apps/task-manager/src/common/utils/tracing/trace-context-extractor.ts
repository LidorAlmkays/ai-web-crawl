import { TraceContextManager, TraceContext } from './trace-context';
import { ILogger } from '../logging/interfaces';
import { logger } from '../logger';

/**
 * Trace context extraction utilities for Kafka message processing
 *
 * This module provides utilities for:
 * - Extracting trace context from Kafka message headers
 * - Creating trace-aware loggers with extracted context
 * - Validating trace context format
 * - Handling missing or invalid trace context gracefully
 */
export class TraceContextExtractor {
  /**
   * Extract trace context from Kafka message headers
   *
   * @param headers - Kafka message headers
   * @returns Extracted trace context or null if not found/invalid
   */
  static extractTraceContextFromKafkaHeaders(
    headers: Record<string, any>
  ): TraceContext | null {
    try {
      return TraceContextManager.extractFromKafkaHeaders(headers);
    } catch (error) {
      logger.warn('Failed to extract trace context from Kafka headers', {
        error: error instanceof Error ? error.message : String(error),
        headers: headers ? Object.keys(headers) : [],
      });
      return null;
    }
  }

  /**
   * Create a trace-aware logger from Kafka headers
   *
   * @param headers - Kafka message headers
   * @param baseLogger - Base logger instance (optional, uses default if not provided)
   * @returns Logger with trace context metadata
   */
  static createTraceLoggerFromHeaders(
    headers: Record<string, any>,
    baseLogger?: ILogger
  ): ILogger {
    const traceContext = this.extractTraceContextFromKafkaHeaders(headers);
    const loggerInstance = baseLogger || logger;

    if (!traceContext) {
      loggerInstance.warn('No valid trace context found in headers', {
        headers: Object.keys(headers),
      });
      return loggerInstance;
    }

    // Create child logger with trace context metadata
    return loggerInstance.child({
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      traceFlags: traceContext.traceFlags,
      traceState: traceContext.traceState,
    });
  }

  /**
   * Extract additional trace-related fields from Kafka headers
   *
   * @param headers - Kafka message headers
   * @returns Object with trace-related fields
   */
  static extractTraceFieldsFromHeaders(headers: Record<string, any>): {
    traceparent?: string;
    tracestate?: string;
    correlationId?: string;
    source?: string;
    version?: string;
  } {
    return {
      traceparent: headers['traceparent'],
      tracestate: headers['tracestate'],
      correlationId: headers['correlation_id'],
      source: headers['source'],
      version: headers['version'],
    };
  }

  /**
   * Validate trace context format
   *
   * @param traceContext - Trace context to validate
   * @returns True if valid, false otherwise
   */
  static isValidTraceContext(traceContext: TraceContext | null): boolean {
    if (!traceContext) {
      return false;
    }
    return TraceContextManager.isValidTraceContext(traceContext);
  }

  /**
   * Create trace context for testing purposes
   *
   * @param traceId - Optional trace ID (will generate if not provided)
   * @param spanId - Optional span ID (will generate if not provided)
   * @returns New trace context
   */
  static createTestTraceContext(
    traceId?: string,
    spanId?: string
  ): TraceContext {
    return TraceContextManager.createTraceContext(traceId, spanId);
  }

  /**
   * Format trace context for logging
   *
   * @param traceContext - Trace context to format
   * @returns Formatted string for logging
   */
  static formatTraceContextForLogging(
    traceContext: TraceContext | null
  ): string {
    if (!traceContext) {
      return 'no-trace-context';
    }
    return `${traceContext.traceId}:${traceContext.spanId}`;
  }
}
