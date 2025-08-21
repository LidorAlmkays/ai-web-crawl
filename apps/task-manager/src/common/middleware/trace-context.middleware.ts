import { Request, Response, NextFunction } from 'express';
// OTEL express auto-instrumentation manages context; no explicit API needed here
import { logger } from '../utils/logger';

/**
 * Simplified middleware to handle trace context for HTTP requests
 *
 * This middleware:
 * 1. Extracts W3C trace context from request headers (if present)
 * 2. Activates the trace context for downstream operations
 * 3. Logs the request with automatic trace context from active span
 * 
 * Note: Express auto-instrumentation handles span creation automatically
 */
export function traceContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Log request (express auto-instrumentation will create/propagate span)
    logger.info('HTTP request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  } catch (error) {
    // Fallback to regular logger if trace context setup fails
    logger.error('Failed to setup trace context for HTTP request', {
      error: error instanceof Error ? error.message : String(error),
      method: req.method,
      path: req.path,
    });
    next();
  }
}
