import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { logger } from './logger';
import { getStackedErrorHandler } from './stacked-error-handler';
import { ValidationErrorDetails } from '../types/error-context.type';

/**
 * Enhanced Validation Result Interface
 *
 * Represents the result of a DTO validation operation with detailed error information
 */
export interface ValidationResult<T> {
  isValid: boolean;
  validatedData?: T;
  errorMessage?: string;
  validationDetails?: ValidationErrorDetails[];
  errorContext?: {
    taskId?: string;
    correlationId: string;
    dtoName: string;
  };
}

/**
 * Enhanced Validate DTO
 *
 * Transforms a plain object to a DTO class instance and validates it
 * using class-validator decorators. Provides detailed error information
 * with actionable guidance.
 *
 * @param dtoClass - The DTO class constructor
 * @param data - The plain object data to validate
 * @param taskId - Optional task ID for tracking
 * @returns Promise<ValidationResult<T>> - The validation result
 */
export async function validateDto<T>(
  dtoClass: new () => T,
  data: any,
  taskId?: string
): Promise<ValidationResult<T>> {
  const stackedErrorHandler = getStackedErrorHandler();
  const dtoName = dtoClass.name;

  // Initialize error context
  stackedErrorHandler.initializeContext(taskId);
  const correlationId = stackedErrorHandler.getCorrelationId();

  try {
    // Transform plain object to DTO class instance
    const dtoInstance = plainToClass(dtoClass, data);

    // Validate the instance
    const errors = await validate(dtoInstance as object);

    if (errors.length > 0) {
      // Add validation errors to stacked error handler
      const validationDetails = stackedErrorHandler.addValidationErrors(
        errors,
        dtoName
      );

      // Create detailed error message
      const errorMessages = errors
        .map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints || {}).join(
              ', '
            )}`
        )
        .join('; ');

      // Log validation failure with debug level (routine operation)
      logger.debug('DTO validation failed', {
        dtoName,
        taskId,
        correlationId,
        errorCount: errors.length,
        fields: errors.map((e) => e.property),
      });

      return {
        isValid: false,
        errorMessage: errorMessages,
        validationDetails,
        errorContext: {
          taskId,
          correlationId,
          dtoName,
        },
      };
    }

    // Log successful validation with debug level
    logger.debug('DTO validation successful', {
      dtoName,
      taskId,
      correlationId,
    });

    return {
      isValid: true,
      validatedData: dtoInstance,
      errorContext: {
        taskId,
        correlationId,
        dtoName,
      },
    };
  } catch (error) {
    // Add error context for validation utility errors
    stackedErrorHandler.addErrorContext(
      'VALIDATION',
      'ValidationUtility',
      'validateDto',
      `Validation utility error for ${dtoName}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { dtoName, data },
      undefined,
      undefined,
      'Check validation configuration and input data format'
    );

    logger.error('Validation utility error', {
      dtoName,
      taskId,
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    });

    return {
      isValid: false,
      errorMessage: 'Validation utility error',
      errorContext: {
        taskId,
        correlationId,
        dtoName,
      },
    };
  }
}

/**
 * Validate DTO with stacked error handling
 *
 * Enhanced version that integrates with the stacked error handler
 * for comprehensive error reporting.
 *
 * @param dtoClass - The DTO class constructor
 * @param data - The plain object data to validate
 * @param taskId - Optional task ID for tracking
 * @param component - Component name for error context
 * @returns Promise<ValidationResult<T>> - The validation result
 */
export async function validateDtoWithStackedError<T>(
  dtoClass: new () => T,
  data: any,
  taskId?: string,
  component = 'Unknown'
): Promise<ValidationResult<T>> {
  const result = await validateDto(dtoClass, data, taskId);

  if (!result.isValid && result.validationDetails) {
    const stackedErrorHandler = getStackedErrorHandler();

    // Add component-level error context
    stackedErrorHandler.addErrorContext(
      'VALIDATION',
      component,
      'validateDto',
      `DTO validation failed for ${dtoClass.name}`,
      { dtoName: dtoClass.name, errorCount: result.validationDetails.length },
      undefined,
      undefined,
      'Review validation details and fix data format issues'
    );
  }

  return result;
}
