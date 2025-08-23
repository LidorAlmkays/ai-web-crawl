import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { configuration } from '../../config';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handling middleware
 * Handles all errors in the application with proper logging and responses
 */
export function errorHandlerMiddleware(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const config = configuration.getConfig();
  
  // Determine if it's an operational error
  const isOperational = error instanceof AppError ? error.isOperational : false;
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  
  // Log the error with appropriate level
  if (statusCode >= 500) {
    logger.error('Server error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      traceContext: (req as any).traceContext?.traceparent,
    });
  } else {
    logger.warn('Client error', {
      error: error.message,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode,
      traceContext: (req as any).traceContext?.traceparent,
    });
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    message: isOperational ? error.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  // Add error details in development mode
  if (config.environment === 'development') {
    errorResponse.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  // Add request ID if available
  if ((req as any).traceContext?.traceparent) {
    errorResponse.requestId = (req as any).traceContext.traceparent;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  logger.warn('Endpoint not found', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
