# J4: Application Layer Error Detection Service

## Overview

Implement the core error detection service in the application layer that orchestrates the detection and handling of error scenarios when processing non-existing task IDs with matching user data.

## Requirements

### Core Functionality

1. **Error Detection Logic**: Identify different error scenarios
2. **Business Rule Validation**: Apply business rules for task processing
3. **Error Context Building**: Create comprehensive error context
4. **Error Logging Integration**: Log errors with proper context
5. **Future Notification Preparation**: Prepare for future notification mechanisms

### Error Scenarios to Handle

1. **Task ID Not Found**: Requested task ID doesn't exist
2. **Task Mismatch**: Task ID doesn't exist but matching user data found
3. **Multiple Matches**: Multiple tasks with same user data exist
4. **State Mismatch**: Task exists but in unexpected state
5. **Invalid Transitions**: Invalid status transitions

## Implementation Plan

### 1. Error Detection Service

- Core logic for detecting error scenarios
- Integration with domain validation
- Business rule enforcement
- Error context creation

### 2. Error Logging Service

- Centralized error logging
- Structured error information
- Severity-based logging
- Audit trail maintenance

### 3. Notification Port

- Interface for future notification mechanisms
- Extensible design for different channels
- Configuration-based notification rules

## Test Criteria

### Unit Tests

- [ ] Error detection logic correctly identifies all scenarios
- [ ] Business rules are properly enforced
- [ ] Error context contains all required information
- [ ] Error logging works correctly
- [ ] Service handles edge cases properly

### Integration Tests

- [ ] Service integrates with database adapter
- [ ] Error logging integrates with logging system
- [ ] Service works with real data scenarios
- [ ] Performance is acceptable under load

### Error Scenario Tests

- [ ] Task ID not found scenario
- [ ] Task mismatch scenario
- [ ] Multiple matches scenario
- [ ] State mismatch scenario
- [ ] Invalid transition scenario

## Files to Create

### 1. Error Detection Port

```typescript
// src/application/error-detection/ports/IErrorDetectionPort.ts
import { ErrorContext, TaskProcessingError } from '../../../domain/types/error.types';

export interface ErrorDetectionRequest {
  taskId: string;
  userEmail: string;
  userQuery: string;
  expectedStatus: string;
  newStatus: string;
  requestMetadata: {
    timestamp: string;
    source: string;
    correlationId?: string;
  };
}

export interface ErrorDetectionResponse {
  hasError: boolean;
  error?: TaskProcessingError;
  taskExists: boolean;
  matchingTasksCount: number;
  currentStatus?: string;
  isValidTransition: boolean;
}

export interface IErrorDetectionPort {
  detectErrors(request: ErrorDetectionRequest): Promise<ErrorDetectionResponse>;
  validateTaskTransition(taskId: string, expectedStatus: string, newStatus: string): Promise<boolean>;
  findMatchingTasks(taskId: string, userEmail: string, userQuery: string): Promise<any[]>;
}
```

### 2. Error Detection Service

```typescript
// src/application/error-detection/services/ErrorDetectionService.ts
import { IErrorDetectionPort } from '../ports/IErrorDetectionPort';
import { IErrorLoggingPort } from '../../error-logging/ports/IErrorLoggingPort';
import { ErrorDetectionRequest, ErrorDetectionResponse } from '../ports/IErrorDetectionPort';
import { TaskNotFoundError, TaskMismatchError, MultipleTaskMatchError, StateMismatchError, ErrorContext, ErrorSeverity } from '../../../domain/types/error.types';
import { ErrorContextEntity } from '../../../domain/entities/error-context.entity';
import { logger } from '../../../common/utils/logger';

export class ErrorDetectionService implements IErrorDetectionPort {
  constructor(private readonly errorDetectionPort: IErrorDetectionPort, private readonly errorLoggingPort: IErrorLoggingPort) {}

  async detectErrors(request: ErrorDetectionRequest): Promise<ErrorDetectionResponse> {
    try {
      // Validate input
      this.validateRequest(request);

      // Check if task exists
      const taskExists = await this.checkTaskExists(request.taskId);

      if (!taskExists) {
        // Task doesn't exist - check for matching tasks
        const matchingTasks = await this.findMatchingTasks(request.taskId, request.userEmail, request.userQuery);

        if (matchingTasks.length > 0) {
          // Found matching tasks - this is a mismatch error
          const error = this.createTaskMismatchError(request, matchingTasks);
          await this.logError(error);

          return {
            hasError: true,
            error,
            taskExists: false,
            matchingTasksCount: matchingTasks.length,
            isValidTransition: false,
          };
        } else {
          // No matching tasks - simple not found error
          const error = this.createTaskNotFoundError(request);
          await this.logError(error);

          return {
            hasError: true,
            error,
            taskExists: false,
            matchingTasksCount: 0,
            isValidTransition: false,
          };
        }
      } else {
        // Task exists - validate transition
        const isValidTransition = await this.validateTaskTransition(request.taskId, request.expectedStatus, request.newStatus);

        if (!isValidTransition) {
          const currentStatus = await this.getCurrentStatus(request.taskId);
          const error = this.createStateMismatchError(request, currentStatus);
          await this.logError(error);

          return {
            hasError: true,
            error,
            taskExists: true,
            matchingTasksCount: 0,
            currentStatus,
            isValidTransition: false,
          };
        }

        // No errors detected
        return {
          hasError: false,
          taskExists: true,
          matchingTasksCount: 0,
          isValidTransition: true,
        };
      }
    } catch (error) {
      logger.error('Error in error detection service', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async validateTaskTransition(taskId: string, expectedStatus: string, newStatus: string): Promise<boolean> {
    return this.errorDetectionPort.validateTaskTransition(taskId, expectedStatus, newStatus);
  }

  async findMatchingTasks(taskId: string, userEmail: string, userQuery: string): Promise<any[]> {
    return this.errorDetectionPort.findMatchingTasks(taskId, userEmail, userQuery);
  }

  private validateRequest(request: ErrorDetectionRequest): void {
    if (!ErrorContextEntity.validateTaskId(request.taskId)) {
      throw new Error('Invalid task ID format');
    }

    if (!ErrorContextEntity.validateEmail(request.userEmail)) {
      throw new Error('Invalid email format');
    }

    if (!ErrorContextEntity.validateQuery(request.userQuery)) {
      throw new Error('Invalid user query');
    }
  }

  private async checkTaskExists(taskId: string): Promise<boolean> {
    const task = await this.errorDetectionPort.findMatchingTasks(taskId, '', '');
    return task.length > 0;
  }

  private async getCurrentStatus(taskId: string): Promise<string | undefined> {
    // This would need to be implemented in the infrastructure layer
    // For now, return undefined
    return undefined;
  }

  private createTaskNotFoundError(request: ErrorDetectionRequest): TaskNotFoundError {
    const context: ErrorContext = {
      taskId: request.taskId,
      userEmail: request.userEmail,
      userQuery: request.userQuery,
      expectedStatus: request.expectedStatus,
      requestMetadata: request.requestMetadata,
    };

    return new TaskNotFoundError(context);
  }

  private createTaskMismatchError(request: ErrorDetectionRequest, matchingTasks: any[]): TaskMismatchError {
    const context: ErrorContext = {
      taskId: request.taskId,
      userEmail: request.userEmail,
      userQuery: request.userQuery,
      expectedStatus: request.expectedStatus,
      matchingTasks: matchingTasks.map((task) => ({
        id: task.id,
        status: task.status,
        createdAt: task.createdAt,
      })),
      requestMetadata: request.requestMetadata,
    };

    return new TaskMismatchError(context);
  }

  private createStateMismatchError(request: ErrorDetectionRequest, currentStatus?: string): StateMismatchError {
    const context: ErrorContext = {
      taskId: request.taskId,
      userEmail: request.userEmail,
      userQuery: request.userQuery,
      expectedStatus: request.expectedStatus,
      actualStatus: currentStatus,
      requestMetadata: request.requestMetadata,
    };

    return new StateMismatchError(context);
  }

  private async logError(error: any): Promise<void> {
    await this.errorLoggingPort.logError(error);
  }
}
```

### 3. Error Logging Port

```typescript
// src/application/error-logging/ports/IErrorLoggingPort.ts
import { TaskProcessingError } from '../../../domain/types/error.types';

export interface ErrorLogEntry {
  id: string;
  error: TaskProcessingError;
  timestamp: string;
  source: string;
  correlationId?: string;
}

export interface IErrorLoggingPort {
  logError(error: TaskProcessingError): Promise<void>;
  getErrorLogs(filters?: { severity?: string; code?: string; startDate?: string; endDate?: string }): Promise<ErrorLogEntry[]>;
  getErrorStats(): Promise<{
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsByCode: Record<string, number>;
  }>;
}
```

### 4. Error Logging Service

```typescript
// src/application/error-logging/services/ErrorLoggingService.ts
import { IErrorLoggingPort } from '../ports/IErrorLoggingPort';
import { TaskProcessingError } from '../../../domain/types/error.types';
import { logger } from '../../../common/utils/logger';

export class ErrorLoggingService implements IErrorLoggingPort {
  async logError(error: TaskProcessingError): Promise<void> {
    try {
      // Log to application logger
      logger.error('Task processing error detected', {
        errorCode: error.code,
        errorMessage: error.message,
        severity: error.severity,
        context: error.context,
        timestamp: new Date().toISOString(),
      });

      // TODO: In the future, this could also:
      // - Store in database for analysis
      // - Send to external monitoring systems
      // - Trigger alerts based on severity
      // - Send to Kafka topic for further processing
    } catch (loggingError) {
      // Fallback logging if error logging fails
      console.error('Failed to log error:', {
        originalError: error,
        loggingError: loggingError instanceof Error ? loggingError.message : 'Unknown error',
      });
    }
  }

  async getErrorLogs(filters?: { severity?: string; code?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    // TODO: Implement when database storage is added
    return [];
  }

  async getErrorStats(): Promise<{
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsByCode: Record<string, number>;
  }> {
    // TODO: Implement when database storage is added
    return {
      totalErrors: 0,
      errorsBySeverity: {},
      errorsByCode: {},
    };
  }
}
```

## Success Metrics

- [ ] All error scenarios properly detected
- [ ] Business rules correctly enforced
- [ ] Error context contains comprehensive information
- [ ] Error logging works correctly
- [ ] Service handles edge cases properly
- [ ] Performance is acceptable under load
- [ ] Architecture is extensible for future features

## Dependencies

- Domain layer error types
- Infrastructure layer database adapter
- Existing logging infrastructure
- Application factory for dependency injection

## Next Steps

1. Implement error detection service
2. Create error logging service
3. Define notification port interface
4. Write comprehensive tests
5. Integrate with existing services
