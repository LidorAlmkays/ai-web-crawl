import { StackedErrorHandler } from '../stacked-error-handler';
import { ValidationError } from 'class-validator';

// Mock logger to capture log calls
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logDebug: jest.fn(),
    logSuccess: jest.fn(),
  },
}));

// Import the mocked logger
import { logger } from '../logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('StackedErrorHandler', () => {
  let handler: StackedErrorHandler;

  beforeEach(() => {
    handler = StackedErrorHandler.getInstance();
    handler.clearContext(); // Reset for each test
    jest.clearAllMocks();
  });

  describe('initializeContext', () => {
    it('should initialize context with taskId and correlationId', () => {
      const taskId = 'test-task-id';
      const correlationId = 'test-correlation-id';

      handler.initializeContext(taskId, correlationId);

      expect(handler.getTaskId()).toBe(taskId);
      expect(handler.getCorrelationId()).toBe(correlationId);
    });

    it('should generate new correlationId if not provided', () => {
      const taskId = 'test-task-id';

      handler.initializeContext(taskId);

      expect(handler.getTaskId()).toBe(taskId);
      expect(handler.getCorrelationId()).toBeDefined();
      expect(handler.getCorrelationId()).not.toBe('test-correlation-id');
    });
  });

  describe('addErrorContext', () => {
    it('should add error context to the chain', () => {
      handler.initializeContext('test-task-id');

      handler.addErrorContext(
        'VALIDATION',
        'TestComponent',
        'validate',
        'Field validation failed',
        { field: 'test' },
        'expected-value',
        'actual-value',
        'Fix the field value'
      );

      const errorChain = handler.getErrorChain();
      expect(errorChain).toHaveLength(1);
      expect(errorChain[0]).toEqual({
        level: 'VALIDATION',
        component: 'TestComponent',
        operation: 'validate',
        message: 'Field validation failed',
        data: { field: 'test' },
        expectedValue: 'expected-value',
        actualValue: 'actual-value',
        action: 'Fix the field value',
        timestamp: expect.any(String),
      });
    });
  });

  describe('addValidationErrors', () => {
    it('should parse validation errors and add to error chain', () => {
      handler.initializeContext('test-task-id');

      const mockValidationError = new ValidationError();
      mockValidationError.property = 'email';
      mockValidationError.value = 'invalid-email';
      mockValidationError.constraints = {
        isEmail: 'email must be an email',
      };

      const validationDetails = handler.addValidationErrors(
        [mockValidationError],
        'TestDto'
      );

      expect(validationDetails).toHaveLength(1);
      expect(validationDetails[0]).toEqual({
        field: 'email',
        value: 'invalid-email',
        expectedValue: 'an email',
        constraints: ['email must be an email'],
        message: 'email must be an email',
        action: 'Review the validation rules for email',
      });

      const errorChain = handler.getErrorChain();
      expect(errorChain).toHaveLength(1);
      expect(errorChain[0].level).toBe('VALIDATION');
      expect(errorChain[0].component).toBe('TestDto');
    });
  });

  describe('logStackedError', () => {
    it('should log main error message and error chain', () => {
      handler.initializeContext('test-task-id', 'test-correlation-id');

      handler.addErrorContext(
        'VALIDATION',
        'TestDto',
        'validate',
        'Field validation failed',
        { field: 'test' },
        'expected-value',
        'actual-value',
        'Fix the field value'
      );

      const error = new Error('Validation failed');
      handler.logStackedError(error, 'TestHandler', 'MEDIUM');

      // Check that main error message was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TestHandler processing failed - taskId: test-task-id',
        expect.objectContaining({
          taskId: 'test-task-id',
          correlationId: 'test-correlation-id',
          severity: 'MEDIUM',
          errorCategory: 'UNKNOWN_ERROR',
        })
      );

      // Check that error chain was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('└─ TestDto: Field validation failed'),
        expect.objectContaining({
          taskId: 'test-task-id',
          correlationId: 'test-correlation-id',
          level: 'VALIDATION',
          component: 'TestDto',
          operation: 'validate',
          expectedValue: 'expected-value',
          actualValue: 'actual-value',
          action: 'Fix the field value',
        })
      );
    });

    it('should include field details for validation errors', () => {
      handler.initializeContext('test-task-id');

      const mockValidationError = new ValidationError();
      mockValidationError.property = 'task_type';
      mockValidationError.value = 'new';
      mockValidationError.constraints = {
        isEnum: 'task_type must be a valid enum value',
      };

      handler.addValidationErrors([mockValidationError], 'TaskStatusHeaderDto');

      const error = new Error('DTO validation failed');
      handler.logStackedError(error, 'NewTaskHandler', 'MEDIUM');

      // Check that field details are included in the error message
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "expected: 'a valid enum value', received: 'new'"
        ),
        expect.any(Object)
      );
    });
  });

  describe('error categorization', () => {
    it('should categorize validation errors correctly', () => {
      handler.initializeContext('test-task-id');

      const validationError = new Error('validation failed');
      validationError.name = 'ValidationError';

      handler.logStackedError(validationError, 'TestHandler', 'MEDIUM');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorCategory: 'VALIDATION_ERROR',
        })
      );
    });

    it('should categorize database errors correctly', () => {
      handler.initializeContext('test-task-id');

      const dbError = new Error('database connection failed');

      handler.logStackedError(dbError, 'TestHandler', 'HIGH');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorCategory: 'DATABASE_ERROR',
        })
      );
    });
  });
});
