# J2: Domain Layer Error Types and Validation Logic

## Overview

Define comprehensive error types and validation logic for handling non-existing task processing scenarios in the domain layer.

## Requirements

### Error Types to Define

1. **TaskNotFoundError**: Task ID doesn't exist in database
2. **TaskMismatchError**: Task ID doesn't exist but matching user data found
3. **MultipleTaskMatchError**: Multiple tasks with same user data exist
4. **StateMismatchError**: Task exists but in unexpected state
5. **ValidationError**: General validation failures

### Validation Rules

- Task ID must be valid UUID format
- User email must be valid email format
- User query must not be empty
- Task status must be valid enum value
- Matching logic must be case-insensitive for email

## Implementation Plan

### 1. Error Type Definitions

- Create comprehensive error type hierarchy
- Include error codes, messages, and context
- Support internationalization for error messages
- Include severity levels for different error types

### 2. Validation Logic

- Implement business rules for task existence
- Create matching logic for user data
- Define state transition validation
- Add input sanitization and validation

### 3. Error Context

- Structured error context with relevant data
- Include request metadata (timestamp, source, etc.)
- Support for nested error contexts
- Audit trail for error scenarios

## Test Criteria

### Unit Tests

- [ ] All error types properly defined and instantiated
- [ ] Validation logic correctly identifies error scenarios
- [ ] Error context contains all required information
- [ ] Error messages are clear and actionable
- [ ] UUID validation works correctly
- [ ] Email validation works correctly
- [ ] Case-insensitive matching works correctly

### Integration Tests

- [ ] Error types integrate with logging system
- [ ] Validation logic works with real database data
- [ ] Error context serialization/deserialization
- [ ] Error type inheritance and polymorphism

## Files to Create

### 1. Error Types

```typescript
// src/domain/types/error.types.ts
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCode {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_MISMATCH = 'TASK_MISMATCH',
  MULTIPLE_TASK_MATCH = 'MULTIPLE_TASK_MATCH',
  STATE_MISMATCH = 'STATE_MISMATCH',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ErrorContext {
  taskId?: string;
  userEmail?: string;
  userQuery?: string;
  expectedStatus?: string;
  actualStatus?: string;
  matchingTasks?: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  requestMetadata: {
    timestamp: string;
    source: string;
    correlationId?: string;
  };
}

export class TaskProcessingError extends Error {
  constructor(public readonly code: ErrorCode, public readonly message: string, public readonly severity: ErrorSeverity, public readonly context: ErrorContext) {
    super(message);
    this.name = 'TaskProcessingError';
  }
}

export class TaskNotFoundError extends TaskProcessingError {
  constructor(context: ErrorContext) {
    super(ErrorCode.TASK_NOT_FOUND, `Task with ID ${context.taskId} not found`, ErrorSeverity.MEDIUM, context);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskMismatchError extends TaskProcessingError {
  constructor(context: ErrorContext) {
    super(ErrorCode.TASK_MISMATCH, `Task ID ${context.taskId} not found, but found matching task with same user data`, ErrorSeverity.HIGH, context);
    this.name = 'TaskMismatchError';
  }
}

export class MultipleTaskMatchError extends TaskProcessingError {
  constructor(context: ErrorContext) {
    super(ErrorCode.MULTIPLE_TASK_MATCH, `Multiple tasks found with same user data`, ErrorSeverity.HIGH, context);
    this.name = 'MultipleTaskMatchError';
  }
}

export class StateMismatchError extends TaskProcessingError {
  constructor(context: ErrorContext) {
    super(ErrorCode.STATE_MISMATCH, `Task exists but in unexpected state. Expected: ${context.expectedStatus}, Actual: ${context.actualStatus}`, ErrorSeverity.MEDIUM, context);
    this.name = 'StateMismatchError';
  }
}
```

### 2. Validation Logic

```typescript
// src/domain/entities/error-context.entity.ts
export class ErrorContextEntity {
  constructor(
    public readonly taskId: string,
    public readonly userEmail: string,
    public readonly userQuery: string,
    public readonly expectedStatus: string,
    public readonly requestMetadata: {
      timestamp: string;
      source: string;
      correlationId?: string;
    }
  ) {}

  static validateTaskId(taskId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(taskId);
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateQuery(query: string): boolean {
    return query && query.trim().length > 0;
  }

  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static normalizeQuery(query: string): string {
    return query.trim();
  }
}
```

## Success Metrics

- [ ] All error types properly defined and tested
- [ ] Validation logic covers all edge cases
- [ ] Error context contains comprehensive information
- [ ] Error messages are clear and actionable
- [ ] Performance impact of validation is minimal
- [ ] Error type hierarchy is extensible

## Dependencies

- No external dependencies
- Uses existing domain types and enums
- Integrates with existing validation utilities

## Next Steps

1. Implement error type definitions
2. Create validation logic
3. Write comprehensive tests
4. Integrate with existing domain entities
