import { logger } from './logger';
import {
  ErrorContext,
  StackedErrorInfo,
  ErrorLevel,
  ErrorCategory,
  ValidationErrorDetails,
} from '../types/error-context.type';
import { ValidationError } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stacked Error Handler
 *
 * Provides comprehensive error handling with full context chain.
 * Shows the complete error stack with data context and actionable guidance.
 * Includes UUID tracking for easy message flow tracking.
 */
export class StackedErrorHandler {
  private static instance: StackedErrorHandler;
  private errorChain: ErrorContext[] = [];
  private correlationId: string;
  private taskId?: string;

  private constructor() {
    this.correlationId = uuidv4();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): StackedErrorHandler {
    if (!StackedErrorHandler.instance) {
      StackedErrorHandler.instance = new StackedErrorHandler();
    }
    return StackedErrorHandler.instance;
  }

  /**
   * Initialize error context for a new operation
   */
  public initializeContext(taskId?: string, correlationId?: string): void {
    this.errorChain = [];
    this.taskId = taskId;
    this.correlationId = correlationId || uuidv4();
  }

  /**
   * Add error context to the chain
   */
  public addErrorContext(
    level: ErrorLevel,
    component: string,
    operation: string,
    message: string,
    data?: any,
    expectedValue?: any,
    actualValue?: any,
    action?: string
  ): void {
    const errorContext: ErrorContext = {
      level,
      component,
      operation,
      message,
      data,
      expectedValue,
      actualValue,
      action,
      timestamp: new Date().toISOString(),
    };

    this.errorChain.push(errorContext);
  }

  /**
   * Parse validation errors and add to error chain
   */
  public addValidationErrors(
    validationErrors: ValidationError[],
    dtoName: string
  ): ValidationErrorDetails[] {
    const validationDetails: ValidationErrorDetails[] = [];

    for (const error of validationErrors) {
      const constraints = error.constraints
        ? Object.values(error.constraints)
        : [];
      const constraintMessage = constraints.join(', ');

      const validationDetail: ValidationErrorDetails = {
        field: error.property,
        value: error.value,
        expectedValue: this.extractExpectedValue(constraints),
        constraints,
        message: constraintMessage,
        action: this.generateValidationAction(
          error.property,
          constraintMessage
        ),
      };

      validationDetails.push(validationDetail);

      // Add to error chain
      this.addErrorContext(
        'VALIDATION',
        dtoName,
        'validate',
        `Field '${error.property}' validation failed: ${constraintMessage}`,
        { field: error.property, value: error.value },
        validationDetail.expectedValue,
        error.value,
        validationDetail.action
      );
    }

    return validationDetails;
  }

  /**
   * Log the complete stacked error
   */
  public logStackedError(
    rootError: Error,
    handlerName: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): void {
    const stackedErrorInfo: StackedErrorInfo = {
      taskId: this.taskId,
      correlationId: this.correlationId,
      errorChain: this.errorChain,
      rootCause: this.determineRootCause(rootError),
      actionableGuidance: this.generateActionableGuidance(),
      severity,
      timestamp: new Date().toISOString(),
    };

    // Log the main error message
    const mainMessage = this.formatMainErrorMessage(
      stackedErrorInfo,
      handlerName
    );
    logger.error(mainMessage, {
      taskId: this.taskId,
      correlationId: this.correlationId,
      severity,
      errorCategory: this.categorizeError(rootError),
    });

    // Log each level of the error chain with indentation
    this.logErrorChain(stackedErrorInfo);
  }

  /**
   * Format the main error message
   */
  private formatMainErrorMessage(
    stackedErrorInfo: StackedErrorInfo,
    handlerName: string
  ): string {
    const taskIdPart = this.taskId ? ` - taskId: ${this.taskId}` : '';
    return `${handlerName} processing failed${taskIdPart}`;
  }

  /**
   * Log the error chain with indentation
   */
  private logErrorChain(stackedErrorInfo: StackedErrorInfo): void {
    for (let i = 0; i < stackedErrorInfo.errorChain.length; i++) {
      const context = stackedErrorInfo.errorChain[i];
      const indent = '  '.repeat(i + 1);
      const prefix = i === 0 ? '└─' : '  └─';

      let message = `${indent}${prefix} ${context.component}: ${context.message}`;

      // Add field details for validation errors
      if (
        context.level === 'VALIDATION' &&
        context.expectedValue !== undefined
      ) {
        message += `, expected: '${context.expectedValue}', received: '${context.actualValue}'`;
      }

      // Add action if available
      if (context.action) {
        message += `, action: ${context.action}`;
      }

      logger.error(message, {
        taskId: this.taskId,
        correlationId: this.correlationId,
        level: context.level,
        component: context.component,
        operation: context.operation,
        data: context.data,
        expectedValue: context.expectedValue,
        actualValue: context.actualValue,
        action: context.action,
      });
    }
  }

  /**
   * Determine the root cause of the error
   */
  private determineRootCause(error: Error): string {
    if (error.message.includes('validation')) {
      return 'Data validation failed';
    }
    if (
      error.message.includes('database') ||
      error.message.includes('postgres')
    ) {
      return 'Database operation failed';
    }
    if (error.message.includes('kafka')) {
      return 'Kafka operation failed';
    }
    if (error.message.includes('not found')) {
      return 'Resource not found';
    }
    return 'Unknown error occurred';
  }

  /**
   * Generate actionable guidance based on error chain
   */
  private generateActionableGuidance(): string {
    const validationErrors = this.errorChain.filter(
      (ctx) => ctx.level === 'VALIDATION'
    );

    if (validationErrors.length > 0) {
      const lastValidationError = validationErrors[validationErrors.length - 1];
      return (
        lastValidationError.action || 'Check input data format and constraints'
      );
    }

    const databaseErrors = this.errorChain.filter(
      (ctx) => ctx.level === 'DATABASE'
    );
    if (databaseErrors.length > 0) {
      return 'Check database connection and query parameters';
    }

    const kafkaErrors = this.errorChain.filter(
      (ctx) => ctx.level === 'EXTERNAL_SERVICE'
    );
    if (kafkaErrors.length > 0) {
      return 'Check Kafka connection and message format';
    }

    return 'Review error details and check system configuration';
  }

  /**
   * Extract expected value from validation constraints
   */
  private extractExpectedValue(constraints: string[]): any {
    for (const constraint of constraints) {
      if (constraint.includes('should be')) {
        return constraint.split('should be')[1]?.trim().replace(/['"]/g, '');
      }
      if (constraint.includes('must be')) {
        return constraint.split('must be')[1]?.trim().replace(/['"]/g, '');
      }
      if (constraint.includes('expected')) {
        return constraint.split('expected')[1]?.trim().replace(/['"]/g, '');
      }
    }
    return undefined;
  }

  /**
   * Generate actionable guidance for validation errors
   */
  private generateValidationAction(
    field: string,
    constraintMessage: string
  ): string {
    if (constraintMessage.includes('should not be empty')) {
      return `Provide a value for ${field}`;
    }
    if (constraintMessage.includes('should be a string')) {
      return `Ensure ${field} is a text value`;
    }
    if (constraintMessage.includes('should be an email')) {
      return `Provide a valid email address for ${field}`;
    }
    if (constraintMessage.includes('should be a valid enum value')) {
      return `Use a valid enum value for ${field}`;
    }
    if (constraintMessage.includes('should be a valid UUID')) {
      return `Provide a valid UUID for ${field}`;
    }
    if (constraintMessage.includes('length')) {
      return `Check the length requirements for ${field}`;
    }
    return `Review the validation rules for ${field}`;
  }

  /**
   * Categorize error for better handling
   */
  private categorizeError(error: Error): ErrorCategory {
    if (
      error.message.includes('validation') ||
      error.name === 'ValidationError'
    ) {
      return 'VALIDATION_ERROR';
    }
    if (
      error.message.includes('database') ||
      error.message.includes('postgres')
    ) {
      return 'DATABASE_ERROR';
    }
    if (error.message.includes('kafka') || error.name?.includes('Kafka')) {
      return 'KAFKA_ERROR';
    }
    if (error.message.includes('business') || error.message.includes('logic')) {
      return 'BUSINESS_LOGIC_ERROR';
    }
    if (
      error.message.includes('external') ||
      error.message.includes('service')
    ) {
      return 'EXTERNAL_SERVICE_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get current error chain
   */
  public getErrorChain(): ErrorContext[] {
    return [...this.errorChain];
  }

  /**
   * Get correlation ID
   */
  public getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Get task ID
   */
  public getTaskId(): string | undefined {
    return this.taskId;
  }

  /**
   * Clear error context (useful for testing)
   */
  public clearContext(): void {
    this.errorChain = [];
    this.taskId = undefined;
    this.correlationId = uuidv4();
  }
}

// Export convenience function
export const getStackedErrorHandler = (): StackedErrorHandler => {
  return StackedErrorHandler.getInstance();
};
