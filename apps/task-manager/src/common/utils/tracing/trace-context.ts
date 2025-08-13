import { SpanContext } from '@opentelemetry/api';

/**
 * Trace context interface representing W3C trace context
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

/**
 * Trace context management utility for W3C trace context standard
 *
 * This class handles the extraction and injection of trace context
 * from various sources (Kafka headers, HTTP headers) following the
 * W3C Trace Context standard.
 *
 * Features:
 * - W3C trace context parsing and formatting
 * - Kafka header extraction and injection
 * - HTTP header extraction and injection
 * - Error handling for invalid trace context
 * - Support for trace state propagation
 */
export class TraceContextManager {
  /**
   * Extract trace context from Kafka message headers (W3C Trace Context)
   *
   * @param headers - Kafka message headers
   * @returns Trace context or null if not found/invalid
   */
  static extractFromKafkaHeaders(
    headers: Record<string, any>
  ): TraceContext | null {
    const traceparent = headers['traceparent'];
    const tracestate = headers['tracestate'];

    if (traceparent) {
      return this.parseW3CTraceContext(traceparent, tracestate);
    }

    return null;
  }

  /**
   * Extract trace context from HTTP headers (for future use)
   *
   * @param headers - HTTP request headers
   * @returns Trace context or null if not found/invalid
   */
  static extractFromHttpHeaders(
    headers: Record<string, any>
  ): TraceContext | null {
    const traceparent = headers['traceparent'];
    const tracestate = headers['tracestate'];

    if (traceparent) {
      return this.parseW3CTraceContext(traceparent, tracestate);
    }

    return null;
  }

  /**
   * Inject trace context into Kafka headers
   *
   * @param existingHeaders - Existing headers to preserve
   * @param traceId - The trace ID
   * @param spanId - The span ID
   * @param traceFlags - The trace flags (default: 1 for sampled)
   * @returns Headers object with trace context
   */
  static injectIntoKafkaHeaders(
    existingHeaders: Record<string, any> = {},
    traceId: string,
    spanId: string,
    traceFlags = 1
  ): Record<string, any> {
    return {
      ...existingHeaders,
      traceparent: this.formatW3CTraceContext(traceId, spanId, traceFlags),
      tracestate: '',
    };
  }

  /**
   * Inject trace context into HTTP headers
   *
   * @param existingHeaders - Existing headers to preserve
   * @param traceId - The trace ID
   * @param spanId - The span ID
   * @param traceFlags - The trace flags (default: 1 for sampled)
   * @returns Headers object with trace context
   */
  static injectIntoHttpHeaders(
    existingHeaders: Record<string, any> = {},
    traceId: string,
    spanId: string,
    traceFlags = 1
  ): Record<string, any> {
    return {
      ...existingHeaders,
      traceparent: this.formatW3CTraceContext(traceId, spanId, traceFlags),
      tracestate: '',
    };
  }

  /**
   * Parse W3C trace context format: 00-<trace-id>-<span-id>-<trace-flags>
   *
   * @param traceparent - The traceparent header value
   * @param tracestate - The tracestate header value (optional)
   * @returns Parsed trace context or null if invalid
   */
  private static parseW3CTraceContext(
    traceparent: string,
    tracestate?: string
  ): TraceContext | null {
    try {
      const parts = traceparent.split('-');

      // Validate format: 00-<trace-id>-<span-id>-<trace-flags>
      if (parts.length !== 4 || parts[0] !== '00') {
        return null;
      }

      const traceId = parts[1];
      const spanId = parts[2];
      const traceFlags = parseInt(parts[3], 16);

      // Validate trace ID (32 hex characters)
      if (!/^[a-f0-9]{32}$/i.test(traceId)) {
        return null;
      }

      // Validate span ID (16 hex characters)
      if (!/^[a-f0-9]{16}$/i.test(spanId)) {
        return null;
      }

      // Validate trace flags (0-255)
      if (isNaN(traceFlags) || traceFlags < 0 || traceFlags > 255) {
        return null;
      }

      return {
        traceId,
        spanId,
        traceFlags,
        traceState: tracestate,
      };
    } catch (error) {
      // Invalid trace context format
      return null;
    }
  }

  /**
   * Format W3C trace context from span context
   *
   * @param context - The span context to format
   * @returns Formatted traceparent string
   */
  static formatW3CTraceContextFromSpanContext(context: SpanContext): string {
    // Use traceFlags from SpanContext, default to 1 (sampled) if not available
    const traceFlags = (context.traceFlags || 1).toString(16).padStart(2, '0');
    return `00-${context.traceId}-${context.spanId}-${traceFlags}`;
  }

  /**
   * Format W3C trace context from trace ID and span ID
   *
   * @param traceId - The trace ID
   * @param spanId - The span ID
   * @param traceFlags - The trace flags (default: 1 for sampled)
   * @returns Formatted traceparent string
   */
  static formatW3CTraceContext(
    traceId: string,
    spanId: string,
    traceFlags = 1
  ): string {
    const flags = traceFlags.toString(16).padStart(2, '0');
    return `00-${traceId}-${spanId}-${flags}`;
  }

  /**
   * Validate trace context format
   *
   * @param context - The trace context or traceparent string to validate
   * @returns True if valid, false otherwise
   */
  static isValidTraceContext(context: TraceContext | string): boolean {
    if (typeof context === 'string') {
      // Validate traceparent string format: 00-<trace-id>-<span-id>-<trace-flags>
      if (
        !context ||
        !/^00-[a-f0-9]{32}-[a-f0-9]{16}-[0-9a-f]{2}$/i.test(context)
      ) {
        return false;
      }
      return true;
    }

    // Validate TraceContext object
    if (!context || !context.traceId || !context.spanId) {
      return false;
    }

    // Validate trace ID (32 hex characters)
    if (!/^[a-f0-9]{32}$/i.test(context.traceId)) {
      return false;
    }

    // Validate span ID (16 hex characters)
    if (!/^[a-f0-9]{16}$/i.test(context.spanId)) {
      return false;
    }

    // Validate trace flags (0-255)
    if (context.traceFlags < 0 || context.traceFlags > 255) {
      return false;
    }

    return true;
  }

  /**
   * Create a new trace context (for testing purposes)
   *
   * @param traceId - The trace ID (optional, will generate if not provided)
   * @param spanId - The span ID (optional, will generate if not provided)
   * @param traceFlags - The trace flags (default: 1 for sampled)
   * @returns A new trace context
   */
  static createTraceContext(
    traceId?: string,
    spanId?: string,
    traceFlags = 1
  ): TraceContext {
    const generatedTraceId = traceId || this.generateTraceId();
    const generatedSpanId = spanId || this.generateSpanId();

    return {
      traceId: generatedTraceId,
      spanId: generatedSpanId,
      traceFlags,
      traceState: '',
    };
  }

  /**
   * Generate a random trace ID (32 hex characters)
   *
   * @returns A random trace ID
   */
  static generateTraceId(): string {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Generate a random span ID (16 hex characters)
   *
   * @returns A random span ID
   */
  static generateSpanId(): string {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Convert trace context to span context (for internal use)
   *
   * @param context - The trace context to convert
   * @returns A span context object
   */
  static toSpanContext(context: TraceContext): SpanContext {
    return {
      traceId: context.traceId,
      spanId: context.spanId,
      traceFlags: context.traceFlags,
      traceState: undefined, // Don't set traceState to avoid serialization issues
    };
  }
}
