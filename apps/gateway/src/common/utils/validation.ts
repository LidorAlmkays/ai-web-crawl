import { validate as classValidate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { trace } from '@opentelemetry/api';

/**
 * Result of DTO validation
 */
export interface ValidationResult<T> {
  isValid: boolean;
  validatedData?: T;
  errorMessage?: string;
  errors?: any[];
}

/**
 * Validate a DTO object using class-validator
 * 
 * @param dtoClass - The DTO class to validate against
 * @param data - The data to validate
 * @returns Promise resolving to validation result
 */
export async function validateDto<T extends object>(
  dtoClass: new () => T,
  data: any
): Promise<ValidationResult<T>> {
  const activeSpan = trace.getActiveSpan();
  
  try {
    // Add business attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'business.operation': 'validate_dto',
        'business.entity': dtoClass.name,
        'validation.data_size': JSON.stringify(data).length,
      });
    }

    // Transform plain object to class instance
    const dtoInstance = plainToClass(dtoClass, data);

    // Validate the instance
    const errors = await classValidate(dtoInstance as object);

    if (errors.length > 0) {
      // Add validation error attributes to active span
      if (activeSpan) {
        activeSpan.setAttributes({
          'error.type': 'ValidationError',
          'error.message': `Validation failed for ${dtoClass.name}`,
          'validation.error_count': errors.length,
        });
      }

      const errorMessages = errors.map(error => {
        const constraints = error.constraints ? Object.values(error.constraints) : [];
        return `${error.property}: ${constraints.join(', ')}`;
      });

      return {
        isValid: false,
        errorMessage: errorMessages.join('; '),
        errors,
      };
    }

    // Add validation success event to active span
    if (activeSpan) {
      activeSpan.addEvent('business.validation_successful', {
        dtoName: dtoClass.name,
        'validation.data_size': JSON.stringify(data).length,
      });
    }

    return {
      isValid: true,
      validatedData: dtoInstance,
    };
  } catch (error) {
    // Add validation error attributes to active span
    if (activeSpan) {
      activeSpan.setAttributes({
        'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
        'error.message': error instanceof Error ? error.message : String(error),
        'error.stack': error instanceof Error ? error.stack : undefined,
        'business.operation': 'validate_dto_error',
      });
    }

    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      errors: [error],
    };
  }
}

/**
 * Create validation middleware for Express
 * 
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export function createValidationMiddleware<T extends object>(
  dtoClass: new () => T
) {
  return async (req: any, res: any, next: any) => {
    const activeSpan = trace.getActiveSpan();
    
    try {
      // Add business attributes to active span
      if (activeSpan) {
        activeSpan.setAttributes({
          'business.operation': 'validate_request',
          'business.entity': dtoClass.name,
          'http.method': req.method,
          'http.url': req.url,
        });
      }

      const validationResult = await validateDto(dtoClass, req.body);

      if (!validationResult.isValid) {
        // Add validation error attributes to active span
        if (activeSpan) {
          activeSpan.setAttributes({
            'error.type': 'ValidationError',
            'error.message': validationResult.errorMessage,
            'http.status_code': 400,
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: validationResult.errorMessage,
          errors: validationResult.errors,
        });
      }

      // Add validation success event to active span
      if (activeSpan) {
        activeSpan.addEvent('business.request_validated', {
          dtoName: dtoClass.name,
          'http.method': req.method,
          'http.url': req.url,
        });
      }

      // Replace request body with validated data
      req.body = validationResult.validatedData;
      next();
    } catch (error) {
      // Add validation error attributes to active span
      if (activeSpan) {
        activeSpan.setAttributes({
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
          'error.message': error instanceof Error ? error.message : String(error),
          'error.stack': error instanceof Error ? error.stack : undefined,
          'business.operation': 'validate_request_error',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
