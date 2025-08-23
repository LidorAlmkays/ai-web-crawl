import { Request, Response, NextFunction } from 'express';
import { validateDto, ValidationResult } from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * Middleware for DTO validation
 * Validates request body against a DTO class using class-validator
 */
export function createValidationMiddleware(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationResult: ValidationResult<any> = await validateDto(dtoClass, req.body);

      if (!validationResult.isValid) {
        logger.warn('Validation failed', {
          endpoint: req.url,
          method: req.method,
          errors: validationResult.errorMessage,
        });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: validationResult.errorMessage,
        });
        return;
      }

      // Store validated data in request for use in handlers
      (req as any).validatedData = validationResult.validatedData;
      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        endpoint: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Validation error',
        error: 'Internal validation error',
      });
    }
  };
}
