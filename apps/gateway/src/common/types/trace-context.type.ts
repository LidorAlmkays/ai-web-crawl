/**
 * W3C Trace Context interface for propagating trace information
 * Follows the W3C Trace Context specification
 */
export interface TraceContext {
  /** W3C traceparent format: 00-<32hex>-<16hex>-<2hex> */
  traceparent: string;
  /** W3C tracestate format: key1=value1,key2=value2 */
  tracestate?: string;
}

/**
 * Extended trace context with additional metadata
 */
export interface ExtendedTraceContext extends TraceContext {
  /** Service name that generated the trace */
  serviceName: string;
  /** Operation name */
  operationName: string;
  /** Additional attributes */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Trace context extractor interface
 */
export interface TraceContextExtractor {
  extractTraceContext(): TraceContext;
}

/**
 * Trace context injector interface
 */
export interface TraceContextInjector {
  injectTraceContext(context: TraceContext, carrier: any): void;
}

/**
 * Trace context manager interface
 */
export interface TraceContextManager {
  createTraceContext(): TraceContext;
  extractTraceContext(carrier: any): TraceContext;
  injectTraceContext(context: TraceContext, carrier: any): void;
  getCurrentTraceContext(): TraceContext | null;
}
