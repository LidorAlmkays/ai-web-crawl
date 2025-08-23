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
  public static createTraceContext(): TraceContext {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('gateway-root-span');
    
    const traceId = span.spanContext().traceId;
    const spanId = span.spanContext().spanId;
    const traceFlags = span.spanContext().traceFlags;
    
    const traceparent = `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;
    
    span.end();
    
    logger.debug('Created new trace context', { traceparent });
    
    return { traceparent };
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
   * Set span status and end it
   */
  public static endSpan(span: Span, status: SpanStatusCode, message?: string): void {
    span.setStatus({ code: status, message });
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
