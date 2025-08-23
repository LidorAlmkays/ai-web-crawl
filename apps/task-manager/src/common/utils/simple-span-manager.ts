import { trace, context, SpanStatusCode, SpanKind, propagation } from '@opentelemetry/api';
import { logger } from './logger';

/**
 * Simple span manager for task-manager
 * Creates spans that properly continue trace context from Kafka messages
 */
export class SimpleSpanManager {
  /**
   * Create a span that continues the trace context from Kafka headers
   * Creates spans as siblings to continue the trace, not as children
   */
  static createSpanFromTraceContext(
    spanName: string,
    traceContext: any,
    attributes: Record<string, any> = {}
  ): any {
    if (!traceContext?.traceparent) {
      logger.debug('No trace context provided, creating new span');
      return trace.getTracer('task-manager').startSpan(spanName, {
        kind: SpanKind.INTERNAL,
        attributes,
      });
    }

    try {
      // Create a carrier with the trace context
      const carrier = {
        traceparent: traceContext.traceparent,
      };

      // Extract the context from the carrier
      const extractedContext = propagation.extract(context.active(), carrier);

      // Create a span in the extracted context (this will be a sibling, not child)
      const span = trace.getTracer('task-manager').startSpan(spanName, {
        kind: SpanKind.INTERNAL,
        attributes,
      }, extractedContext);

      logger.debug('Created span from trace context', {
        spanName,
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
      });

      return span;
    } catch (error) {
      logger.error('Error creating span from trace context', {
        error: error instanceof Error ? error.message : String(error),
        traceContext,
      });
      
      // Fallback to creating a new span
      return trace.getTracer('task-manager').startSpan(spanName, {
        kind: SpanKind.INTERNAL,
        attributes,
      });
    }
  }

  /**
   * Create a span that continues the trace context from Kafka headers
   * and makes it the active span for nested operations
   */
  static createActiveSpanFromTraceContext(
    spanName: string,
    traceContext: any,
    attributes: Record<string, any> = {}
  ): any {
    const span = this.createSpanFromTraceContext(spanName, traceContext, attributes);
    
    // Make this span the active span so child spans will be nested under it
    trace.setSpan(context.active(), span);
    
    return span;
  }

  /**
   * Create a child span with explicit parent span
   */
  static createChildSpanWithParent(
    spanName: string,
    parentSpan: any,
    attributes: Record<string, any> = {}
  ): any {
    const tracer = trace.getTracer('task-manager');
    
    // Create a context with the parent span
    const parentContext = trace.setSpan(context.active(), parentSpan);
    
    // Create the child span in the parent context
    const span = tracer.startSpan(spanName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'service.name': 'task-manager',
        'service.version': '1.0.0',
        ...attributes,
      },
    }, parentContext);
    
    return span;
  }

  /**
   * Execute a function within a span context (withSpan pattern)
   */
  static async withSpan<T>(
    spanName: string,
    fn: (span: any) => Promise<T>,
    traceContext: any,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    const span = this.createSpanFromTraceContext(spanName, traceContext, attributes);
    
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
  static async withSpanWithParent<T>(
    spanName: string,
    fn: (span: any) => Promise<T>,
    parentSpan: any,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    const span = this.createChildSpanWithParent(spanName, parentSpan, attributes);
    
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
   * End a span with success status
   */
  static endSpan(span: any): void {
    if (span) {
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    }
  }

  /**
   * End a span with error status
   */
  static endSpanWithError(span: any, error: Error): void {
    if (span) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      span.end();
    }
  }

  /**
   * Add event to span
   */
  static addEvent(span: any, eventName: string, attributes: Record<string, any> = {}): void {
    if (span) {
      span.addEvent(eventName, attributes);
    }
  }

  /**
   * Add attributes to span
   */
  static addAttributes(span: any, attributes: Record<string, any>): void {
    if (span) {
      span.setAttributes(attributes);
    }
  }
}
