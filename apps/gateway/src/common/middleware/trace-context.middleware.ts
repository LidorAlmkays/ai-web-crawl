import { Request, Response, NextFunction } from 'express';
import { TraceContextUtils } from '../utils/trace-context.utils';
import { logger } from '../utils/logger';

/**
 * Middleware for extracting and managing trace context
 * Extracts trace context from request headers and creates new context if needed
 */
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract trace context from headers
    const traceContext = TraceContextUtils.extractFromHeaders(req.headers as Record<string, string>);

    if (traceContext) {
      // Use existing trace context
      (req as any).traceContext = traceContext;
      logger.debug('Extracted existing trace context', {
        traceparent: traceContext.traceparent,
        tracestate: traceContext.tracestate,
      });
    } else {
      // Create new trace context for gateway (trace parent)
      const newTraceContext = TraceContextUtils.createTraceContext();
      (req as any).traceContext = newTraceContext;
      logger.debug('Created new trace context', {
        traceparent: newTraceContext.traceparent,
      });
    }

    next();
  } catch (error) {
    logger.error('Trace context middleware error', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
}
