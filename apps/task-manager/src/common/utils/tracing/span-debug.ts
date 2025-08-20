import { SpanStatusCode } from '@opentelemetry/api';

/**
 * SpanDebugger - Development utility for debugging OpenTelemetry spans
 * 
 * This utility provides console output of span details in a format similar to
 * OTEL documentation examples. It's only enabled in development environments.
 */
export class SpanDebugger {
  private static isEnabled = false;

  /**
   * Enable span debugging in development environment
   */
  static enable(): void {
    if (process.env.NODE_ENV === 'production') {
      console.log('SpanDebugger: Disabled in production environment');
      return;
    }

    if (this.isEnabled) {
      console.log('SpanDebugger: Already enabled');
      return;
    }

    this.isEnabled = true;
    console.log('SpanDebugger: Enabled for development debugging');

    // Note: The OTEL API doesn't provide direct span end event listeners
    // This is a simplified implementation that can be enhanced with
    // custom span processors if needed
  }

  /**
   * Print span details in OTEL format
   * 
   * @param span - The span to debug
   */
  static printSpan(span: any): void {
    if (!this.isEnabled || process.env.NODE_ENV === 'production') {
      return;
    }

    try {
      const spanCtx = span.spanContext();
      const parentSpanId = this.getParentSpanId(span);
      
      const spanInfo = {
        resource: {
          attributes: {
            'service.name': 'task-manager',
            'service.version': process.env.npm_package_version || '1.0.0',
            'service.environment': process.env.NODE_ENV || 'development'
          }
        },
        traceId: spanCtx.traceId,
        parentId: parentSpanId,
        traceState: spanCtx.traceState?.serialize(),
        name: span.name,
        id: spanCtx.spanId,
        kind: span.kind,
        timestamp: this.getTimestamp(span),
        duration: this.getDuration(span),
        attributes: span.attributes,
        status: { 
          code: span.status?.code || SpanStatusCode.UNSET 
        },
        events: span.events || [],
        links: span.links || []
      };

      console.log('🔍 Span Debug:', JSON.stringify(spanInfo, null, 2));
    } catch (error) {
      console.warn('SpanDebugger: Failed to print span details:', error);
    }
  }

  /**
   * Get parent span ID from span
   */
  private static getParentSpanId(span: any): string | undefined {
    // Try different ways to get parent span ID
    if (span.parentSpanId) {
      return span.parentSpanId;
    }
    
    if (span.links && span.links.length > 0) {
      return span.links[0].context?.spanId;
    }
    
    if (span.parent && span.parent.spanContext) {
      return span.parent.spanContext().spanId;
    }
    
    return undefined;
  }

  /**
   * Get span timestamp in microseconds
   */
  private static getTimestamp(span: any): number {
    if (span.startTime) {
      if (Array.isArray(span.startTime)) {
        return span.startTime[0] * 1000000 + span.startTime[1] / 1000;
      }
      return span.startTime * 1000000;
    }
    return Date.now() * 1000; // Fallback to current time in microseconds
  }

  /**
   * Get span duration in microseconds
   */
  private static getDuration(span: any): number {
    if (span.startTime && span.endTime) {
      let startTime: number;
      let endTime: number;
      
      if (Array.isArray(span.startTime) && Array.isArray(span.endTime)) {
        startTime = span.startTime[0] * 1000000 + span.startTime[1] / 1000;
        endTime = span.endTime[0] * 1000000 + span.endTime[1] / 1000;
      } else {
        startTime = span.startTime * 1000000;
        endTime = span.endTime * 1000000;
      }
      
      return endTime - startTime;
    }
    return 0;
  }

  /**
   * Disable span debugging
   */
  static disable(): void {
    this.isEnabled = false;
    console.log('SpanDebugger: Disabled');
  }

  /**
   * Check if span debugging is enabled
   */
  static isDebugEnabled(): boolean {
    return this.isEnabled && process.env.NODE_ENV !== 'production';
  }
}
