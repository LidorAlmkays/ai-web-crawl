import { trace, Span, SpanStatusCode, SpanContext } from '@opentelemetry/api';

/**
 * Centralized trace management utility for the task-manager service
 *
 * This class provides a singleton pattern for managing traces across the application,
 * supporting both single-service tracing and distributed tracing scenarios.
 *
 * Features:
 * - Singleton pattern for consistent trace management
 * - Span creation with attributes
 * - Child span creation for distributed tracing
 * - Operation tracing with automatic error handling
 * - Performance optimized for high-volume operations
 */
export class TraceManager {
  private static instance: TraceManager;
  private tracer = trace.getTracer('task-manager');

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of TraceManager
   */
  static getInstance(): TraceManager {
    if (!TraceManager.instance) {
      TraceManager.instance = new TraceManager();
    }
    return TraceManager.instance;
  }

  /**
   * Create a new span with optional attributes
   *
   * @param name - The name of the span
   * @param attributes - Optional attributes to add to the span
   * @returns The created span
   */
  createSpan(name: string, attributes?: Record<string, any>): Span {
    return this.tracer.startSpan(name, { attributes });
  }

  /**
   * Create a child span of an existing trace context (for distributed tracing)
   *
   * @param name - The name of the span
   * @param parentContext - The parent span context
   * @param attributes - Optional attributes to add to the span
   * @returns The created child span
   */
  createChildSpan(
    name: string,
    parentContext: SpanContext,
    attributes?: Record<string, any>
  ): Span {
    return this.tracer.startSpan(name, {
      attributes,
      links: [{ context: parentContext }],
    });
  }

  /**
   * Trace an operation with automatic error handling and span management
   *
   * @param name - The name of the operation span
   * @param operation - The async operation to trace
   * @param attributes - Optional attributes to add to the span
   * @returns The result of the operation
   */
  async traceOperation<T>(
    name: string,
    operation: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Trace an operation with existing context (for distributed tracing)
   *
   * @param name - The name of the operation span
   * @param parentContext - The parent span context
   * @param operation - The async operation to trace
   * @param attributes - Optional attributes to add to the span
   * @returns The result of the operation
   */
  async traceOperationWithContext<T>(
    name: string,
    parentContext: SpanContext,
    operation: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createChildSpan(name, parentContext, attributes);

    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get the current active span context
   *
   * @returns The current active span context or null if no active span
   */
  getCurrentContext(): SpanContext | null {
    const activeSpan = trace.getActiveSpan();
    return activeSpan
      ? {
          traceId: activeSpan.spanContext().traceId,
          spanId: activeSpan.spanContext().spanId,
          traceFlags: activeSpan.spanContext().traceFlags,
          traceState: activeSpan.spanContext().traceState,
        }
      : null;
  }

  /**
   * Add an event to the current active span
   *
   * @param name - The name of the event
   * @param attributes - Optional attributes for the event
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Set attributes on the current active span
   *
   * @param attributes - The attributes to set
   */
  setAttributes(attributes: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }
}
