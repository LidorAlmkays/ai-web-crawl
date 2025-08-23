import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { TraceContext } from '../types/trace-context.type';
import { logger } from './logger';

/**
 * Utility class for managing trace context
 */
export class TraceContextUtils {
  private static readonly TRACEPARENT_REGEX = /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/;
  private static readonly TRACESTATE_REGEX = /^[a-z0-9_-]+=[a-z0-9_-]+(,[a-z0-9_-]+=[a-z0-9_-]+)*$/;

  /**
   * Create a new trace context for the gateway service
   * Gateway acts as the trace parent for all web crawl requests
   */
  public static createTraceContext(): { traceContext: TraceContext; rootSpan: Span } {
    const tracer = trace.getTracer('gateway-service');
    const rootSpan = tracer.startSpan('gateway-root-span');
    
    const traceId = rootSpan.spanContext().traceId;
    const spanId = rootSpan.spanContext().spanId;
    const traceFlags = rootSpan.spanContext().traceFlags;
    
    const traceparent = `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
    
    const traceContext = { traceparent };
    
    logger.debug('Created new trace context', { traceparent });
    
    return { traceContext, rootSpan };
  }

  /**
   * Extract trace context from HTTP headers
   */
  public static extractFromHeaders(headers: Record<string, string>): TraceContext | null {
    const traceparent = headers['traceparent'] || headers['x-traceparent'];
    const tracestate = headers['tracestate'] || headers['x-tracestate'];
    
    if (!traceparent) {
      return null;
    }
    
    if (!this.isValidTraceparent(traceparent)) {
      logger.warn('Invalid traceparent format', { traceparent });
      return null;
    }
    
    if (tracestate && !this.isValidTracestate(tracestate)) {
      logger.warn('Invalid tracestate format', { tracestate });
      return null;
    }
    
    return { traceparent, tracestate };
  }

  /**
   * Inject trace context into HTTP headers
   */
  public static injectIntoHeaders(context: TraceContext, headers: Record<string, string>): void {
    headers['traceparent'] = context.traceparent;
    if (context.tracestate) {
      headers['tracestate'] = context.tracestate;
    }
  }

  /**
   * Inject trace context into Kafka headers
   */
  public static injectIntoKafkaHeaders(context: TraceContext, headers: Record<string, Buffer>): void {
    headers['traceparent'] = Buffer.from(context.traceparent);
    if (context.tracestate) {
      headers['tracestate'] = Buffer.from(context.tracestate);
    }
  }

  /**
   * Extract trace context from Kafka headers
   */
  public static extractFromKafkaHeaders(headers: Record<string, Buffer>): TraceContext | null {
    const traceparentBuffer = headers['traceparent'];
    const tracestateBuffer = headers['tracestate'];
    
    if (!traceparentBuffer) {
      return null;
    }
    
    const traceparent = traceparentBuffer.toString();
    const tracestate = tracestateBuffer ? tracestateBuffer.toString() : undefined;
    
    if (!this.isValidTraceparent(traceparent)) {
      logger.warn('Invalid traceparent format in Kafka headers', { traceparent });
      return null;
    }
    
    if (tracestate && !this.isValidTracestate(tracestate)) {
      logger.warn('Invalid tracestate format in Kafka headers', { tracestate });
      return null;
    }
    
    return { traceparent, tracestate };
  }

  /**
   * Validate traceparent format
   */
  private static isValidTraceparent(traceparent: string): boolean {
    return this.TRACEPARENT_REGEX.test(traceparent);
  }

  /**
   * Validate tracestate format
   */
  private static isValidTracestate(tracestate: string): boolean {
    return this.TRACESTATE_REGEX.test(tracestate);
  }

  /**
   * Get current active span context
   */
  public static getCurrentSpanContext(): any {
    return trace.getActiveSpan()?.spanContext();
  }

  /**
   * Create a child span with trace context
   */
  public static createChildSpan(name: string, attributes?: Record<string, any>): Span {
    const tracer = trace.getTracer('gateway-service');
    const parentSpan = trace.getActiveSpan();
    
    const span = tracer.startSpan(name, {
      attributes: {
        'service.name': 'gateway',
        'service.version': '1.0.0',
        ...attributes,
      },
    }, parentSpan ? trace.setSpan(context.active(), parentSpan) : undefined);
    
    return span;
  }

  /**
   * Create a child span with explicit parent span
   */
  public static createChildSpanWithParent(name: string, parentSpan: Span, attributes?: Record<string, any>): Span {
    const tracer = trace.getTracer('gateway-service');
    
    const span = tracer.startSpan(name, {
      attributes: {
        'service.name': 'gateway',
        'service.version': '1.0.0',
        ...attributes,
      },
    }, trace.setSpan(context.active(), parentSpan));
    
    return span;
  }

  /**
   * Execute a function within a span context
   */
  public static async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createChildSpan(name, attributes);
    
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Execute a function within a span context with explicit parent
   */
  public static async withSpanWithParent<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    parentSpan: Span,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createChildSpanWithParent(name, parentSpan, attributes);
    
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Set span status and end it
   */
  public static endSpan(span: Span, status: SpanStatusCode, message?: string): void {
    // Explicitly set the status before ending
    span.setStatus({ code: status, message: message || '' });
    span.end();
  }

  /**
   * Record exception in span
   */
  public static recordException(span: Span, error: Error): void {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
}
