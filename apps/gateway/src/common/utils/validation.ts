import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { logger } from './logger';

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
  errorMessage?: string;
}

/**
 * Validates a DTO object using class-validator
 * @param dtoClass - The DTO class to validate against
 * @param data - The data to validate
 * @returns Promise<ValidationResult<T>>
 */
export async function validateDto<T>(
  dtoClass: new () => T,
  data: any
): Promise<ValidationResult<T>> {
  try {
    // Transform plain object to class instance
    const dtoInstance = plainToClass(dtoClass, data);

    // Validate the instance
    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      logger.warn('DTO validation failed', {
        dtoClass: dtoClass.name,
        errors: errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value,
        })),
      });

      return {
        isValid: false,
        errors,
        errorMessage: formatValidationErrors(errors),
      };
    }

    return {
      isValid: true,
      data: dtoInstance,
    };
  } catch (error) {
    logger.error('Validation error occurred', { error });
    return {
      isValid: false,
      errorMessage: 'Validation processing error',
    };
  }
}

/**
 * Formats validation errors into a readable string
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
function formatValidationErrors(errors: ValidationError[]): string {
  const errorMessages: string[] = [];

  function extractErrors(errors: ValidationError[], prefix = ''): void {
    for (const error of errors) {
      const propertyPath = prefix
        ? `${prefix}.${error.property}`
        : error.property;

      if (error.constraints) {
        for (const constraint of Object.values(error.constraints)) {
          errorMessages.push(`${propertyPath}: ${constraint}`);
        }
      }

      if (error.children && error.children.length > 0) {
        extractErrors(error.children, propertyPath);
      }
    }
  }

  extractErrors(errors);
  return errorMessages.join(', ');
}

/**
 * Creates a validation middleware for Express
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export function createValidationMiddleware<T>(dtoClass: new () => T) {
  return async (req: any, res: any, next: any) => {
    const validationResult = await validateDto(dtoClass, req.body);

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.errors,
        errorMessage: validationResult.errorMessage,
      });
    }

    // Attach validated data to request
    req.validatedBody = validationResult.data;
    next();
  };
}
