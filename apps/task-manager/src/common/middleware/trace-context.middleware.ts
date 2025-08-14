import { Request, Response, NextFunction } from 'express';
import {
  TraceContextManager,
  TraceContext,
} from '../utils/tracing/trace-context';
import { TraceContextExtractor } from '../utils/tracing/trace-context-extractor';
import { logger } from '../utils/logger';

/**
 * Middleware to handle trace context for HTTP requests
 *
 * This middleware:
 * 1. Extracts existing trace context from request headers (if present)
 * 2. Generates new span ID for the current request
 * 3. Creates trace-aware logger for the request
 * 4. Attaches trace context to request object for downstream use
 */
export function traceContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract existing trace context from headers
    const existingContext =
      TraceContextExtractor.extractTraceContextFromKafkaHeaders(req.headers);

    let traceContext: TraceContext;

    if (existingContext) {
      // If trace context exists, generate new span ID for this request
      traceContext = TraceContextManager.createTraceContext(
        existingContext.traceId,
        undefined, // Generate new span ID
        existingContext.traceFlags
      );
    } else {
      // If no trace context, create completely new trace context
      traceContext = TraceContextManager.createTraceContext();
    }

    // Create trace-aware logger for this request
    const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
      {
        traceparent: TraceContextManager.formatW3CTraceContext(
          traceContext.traceId,
          traceContext.spanId,
          traceContext.traceFlags
        ),
      },
      logger
    );

    // Attach trace context and logger to request object
    (req as any).traceContext = traceContext;
    (req as any).traceLogger = traceLogger;

    // Log request with trace context
    traceLogger.info('HTTP request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
    });

    next();
  } catch (error) {
    // Fallback to regular logger if trace context setup fails
    logger.warn('Failed to setup trace context for HTTP request', {
      error: error instanceof Error ? error.message : String(error),
      method: req.method,
      path: req.path,
    });
    next();
  }
}
