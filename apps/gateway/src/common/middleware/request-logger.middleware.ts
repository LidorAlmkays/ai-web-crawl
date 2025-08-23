import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Request logging middleware
 * Logs incoming requests and responses with structured data
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = (req as any).traceContext?.traceparent || 'unknown';

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    headers: {
      host: req.get('Host'),
      referer: req.get('Referer'),
      accept: req.get('Accept'),
    },
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;
    const responseSize = chunk ? chunk.length : 0;

    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize,
      contentType: res.get('Content-Type'),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Performance monitoring middleware
 * Logs slow requests for performance analysis
 */
export function performanceMonitorMiddleware(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = (req as any).traceContext?.traceparent || 'unknown';

    // Override res.end to check performance
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const duration = Date.now() - startTime;

      // Log slow requests
      if (duration > thresholdMs) {
        logger.warn('Slow request detected', {
          requestId,
          method: req.method,
          url: req.url,
          duration,
          threshold: thresholdMs,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
      }

      // Call original end method
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}
