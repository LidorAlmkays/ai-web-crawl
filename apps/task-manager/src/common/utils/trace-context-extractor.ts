import { logger } from './logger';

/**
 * Simple trace context information extracted from Kafka headers
 */
export interface ExtractedTraceContext {
  traceId: string;
  spanId: string;
  traceparent: string;
  tracestate?: string;
}

/**
 * Extract trace context from Kafka message headers
 * This is a passive extraction that doesn't interfere with the consumer flow
 */
export function extractTraceContextFromHeaders(headers: any): ExtractedTraceContext | null {
  try {
    const traceparentBuffer = headers['traceparent'];
    const tracestateBuffer = headers['tracestate'];
    
    if (!traceparentBuffer) {
      return null;
    }

    const traceparent = traceparentBuffer.toString();
    const tracestate = tracestateBuffer?.toString();

    // Simple validation - check if it looks like a valid traceparent
    if (!traceparent.match(/^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/)) {
      logger.warn('Invalid traceparent format', { traceparent });
      return null;
    }

    // Parse the traceparent header (format: version-traceid-spanid-traceflags)
    const parts = traceparent.split('-');
    if (parts.length !== 4) {
      logger.warn('Invalid traceparent format - wrong number of parts', { traceparent });
      return null;
    }

    const [, traceId, spanId] = parts;

    return {
      traceId,
      spanId,
      traceparent,
      tracestate,
    };
  } catch (error) {
    logger.error('Error extracting trace context from headers', { 
      error: error instanceof Error ? error.message : String(error),
      headers: Object.keys(headers)
    });
    return null;
  }
}

/**
 * Create a trace context object for logging purposes
 */
export function createTraceContextForLogging(extractedContext: ExtractedTraceContext | null) {
  if (!extractedContext) {
    return {};
  }

  return {
    traceId: extractedContext.traceId,
    spanId: extractedContext.spanId,
    traceparent: extractedContext.traceparent,
    tracestate: extractedContext.tracestate,
  };
}
