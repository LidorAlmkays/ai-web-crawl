# J5: Integration and Testing

## Overview

Integrate the error handling system into existing Kafka handlers and implement comprehensive testing for all error scenarios.

## Requirements

### Integration Points

1. **Kafka Handlers**: Integrate error detection into complete-task and error-task handlers
2. **Application Factory**: Wire up error detection and logging services
3. **Database Integration**: Apply database functions and create adapter
4. **Logging Integration**: Ensure proper error logging throughout the system

### Testing Requirements

1. **Unit Tests**: Test all error detection logic
2. **Integration Tests**: Test end-to-end error scenarios
3. **Performance Tests**: Ensure system performance under error conditions
4. **Error Scenario Tests**: Test all identified error scenarios

## Implementation Plan

### 1. Kafka Handler Integration

- Modify complete-task handler to use error detection
- Modify error-task handler to use error detection
- Add proper error handling and logging
- Ensure graceful degradation

### 2. Application Factory Updates

- Create error detection adapter
- Wire up error detection service
- Wire up error logging service
- Update dependency injection

### 3. Database Integration

- Apply error handling SQL functions
- Create error detection adapter
- Add necessary indexes
- Test database performance

### 4. Comprehensive Testing

- Unit tests for all components
- Integration tests for error scenarios
- Performance tests for error detection
- End-to-end error flow testing

## Test Criteria

### Unit Tests

- [ ] Error detection service logic
- [ ] Error logging service functionality
- [ ] Database adapter methods
- [ ] Domain validation logic
- [ ] Error type instantiation

### Integration Tests

- [ ] Kafka handler error scenarios
- [ ] Database function calls
- [ ] Error logging integration
- [ ] End-to-end error flow
- [ ] Performance under load

### Error Scenario Tests

- [ ] Task ID not found
- [ ] Task mismatch with matching user data
- [ ] Multiple matching tasks
- [ ] State mismatch
- [ ] Invalid status transitions

## Files to Modify

### 1. Kafka Handlers

```typescript
// src/api/kafka/handlers/task-status/complete-task.handler.ts
import { BaseHandler } from '../base-handler';
import { CompletedTaskStatusMessage } from '../../dtos/completed-task-status-message.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { IErrorDetectionPort } from '../../../../application/error-detection/ports/IErrorDetectionPort';
import { logger } from '../../../../common/utils/logger';

export class CompleteTaskHandler extends BaseHandler<CompletedTaskStatusMessage> {
  constructor(private readonly taskManager: IWebCrawlTaskManagerPort, private readonly errorDetection: IErrorDetectionPort) {
    super();
  }

  async handle(message: CompletedTaskStatusMessage): Promise<void> {
    try {
      logger.info('Processing completed task status message', {
        taskId: message.id,
        userEmail: message.user_email,
        userQuery: message.user_query,
      });

      // Perform error detection before processing
      const errorDetectionRequest = {
        taskId: message.id,
        userEmail: message.user_email,
        userQuery: message.user_query,
        expectedStatus: 'new',
        newStatus: 'completed',
        requestMetadata: {
          timestamp: new Date().toISOString(),
          source: 'kafka-complete-task-handler',
          correlationId: message.id,
        },
      };

      const errorResult = await this.errorDetection.detectErrors(errorDetectionRequest);

      if (errorResult.hasError) {
        // Log the error but continue processing
        logger.error('Error detected in complete task processing', {
          taskId: message.id,
          error: errorResult.error,
          errorResult,
        });

        // TODO: In the future, this could trigger notifications or other actions
        // For now, we just log the error and continue
      }

      // Process the task completion
      await this.taskManager.completeTask(message.id, {
        result: message.result,
        completedAt: message.timestamp,
      });

      logger.info('Task completed successfully', {
        taskId: message.id,
      });
    } catch (error) {
      logger.error('Failed to process completed task', {
        taskId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
```

```typescript
// src/api/kafka/handlers/task-status/error-task.handler.ts
import { BaseHandler } from '../base-handler';
import { ErrorTaskStatusMessage } from '../../dtos/error-task-status-message.dto';
import { IWebCrawlTaskManagerPort } from '../../../../application/ports/web-crawl-task-manager.port';
import { IErrorDetectionPort } from '../../../../application/error-detection/ports/IErrorDetectionPort';
import { logger } from '../../../../common/utils/logger';

export class ErrorTaskHandler extends BaseHandler<ErrorTaskStatusMessage> {
  constructor(private readonly taskManager: IWebCrawlTaskManagerPort, private readonly errorDetection: IErrorDetectionPort) {
    super();
  }

  async handle(message: ErrorTaskStatusMessage): Promise<void> {
    try {
      logger.info('Processing error task status message', {
        taskId: message.id,
        userEmail: message.user_email,
        userQuery: message.user_query,
        error: message.error,
      });

      // Perform error detection before processing
      const errorDetectionRequest = {
        taskId: message.id,
        userEmail: message.user_email,
        userQuery: message.user_query,
        expectedStatus: 'new',
        newStatus: 'error',
        requestMetadata: {
          timestamp: new Date().toISOString(),
          source: 'kafka-error-task-handler',
          correlationId: message.id,
        },
      };

      const errorResult = await this.errorDetection.detectErrors(errorDetectionRequest);

      if (errorResult.hasError) {
        // Log the error but continue processing
        logger.error('Error detected in error task processing', {
          taskId: message.id,
          error: errorResult.error,
          errorResult,
        });

        // TODO: In the future, this could trigger notifications or other actions
        // For now, we just log the error and continue
      }

      // Process the task error
      await this.taskManager.errorTask(message.id, {
        error: message.error,
        errorAt: message.timestamp,
      });

      logger.info('Task error processed successfully', {
        taskId: message.id,
      });
    } catch (error) {
      logger.error('Failed to process error task', {
        taskId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
```

### 2. Application Factory Updates

```typescript
// src/application/services/application.factory.ts
import { IWebCrawlTaskManagerPort } from '../ports/web-crawl-task-manager.port';
import { WebCrawlTaskManagerService } from './webscrape.service';
import { IWebCrawlMetricsDataPort } from '../metrics/ports/IWebCrawlMetricsDataPort';
import { WebCrawlMetricsService } from '../metrics/services/WebCrawlMetricsService';
import { IErrorDetectionPort } from '../error-detection/ports/IErrorDetectionPort';
import { ErrorDetectionService } from '../error-detection/services/ErrorDetectionService';
import { IErrorLoggingPort } from '../error-logging/ports/IErrorLoggingPort';
import { ErrorLoggingService } from '../error-logging/services/ErrorLoggingService';
import { ErrorDetectionAdapter } from '../../infrastructure/persistence/postgres/adapters/ErrorDetectionAdapter';
import { Pool } from 'pg';
import { logger } from '../../common/utils/logger';

export class ApplicationFactory {
  constructor(private readonly pool: Pool) {}

  createWebCrawlTaskManagerService(): IWebCrawlTaskManagerPort {
    logger.debug('Creating WebCrawlTaskManagerService');
    return new WebCrawlTaskManagerService();
  }

  createWebCrawlMetricsService(metricsDataPort: IWebCrawlMetricsDataPort): WebCrawlMetricsService {
    logger.debug('Creating WebCrawlMetricsService');
    return new WebCrawlMetricsService(metricsDataPort);
  }

  createErrorDetectionAdapter(): ErrorDetectionAdapter {
    logger.debug('Creating ErrorDetectionAdapter');
    return new ErrorDetectionAdapter(this.pool);
  }

  createErrorDetectionService(errorDetectionPort: IErrorDetectionPort, errorLoggingPort: IErrorLoggingPort): ErrorDetectionService {
    logger.debug('Creating ErrorDetectionService');
    return new ErrorDetectionService(errorDetectionPort, errorLoggingPort);
  }

  createErrorLoggingService(): ErrorLoggingService {
    logger.debug('Creating ErrorLoggingService');
    return new ErrorLoggingService();
  }
}
```

### 3. Database Schema Updates

```sql
-- src/infrastructure/persistence/postgres/schema/00-main.sql
-- Add the error handling functions to the main schema
\i 09-error-handling-functions.sql

-- Create indexes for error detection queries
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_user_email_lower
ON web_crawl_tasks (LOWER(user_email));

CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_user_query
ON web_crawl_tasks (user_query);

CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_user_data
ON web_crawl_tasks (LOWER(user_email), user_query);

CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_status
ON web_crawl_tasks (status);
```

## Test Files to Create

### 1. Unit Tests

```typescript
// src/application/error-detection/services/__tests__/ErrorDetectionService.spec.ts
import { ErrorDetectionService } from '../ErrorDetectionService';
import { IErrorDetectionPort } from '../../ports/IErrorDetectionPort';
import { IErrorLoggingPort } from '../../../error-logging/ports/IErrorLoggingPort';
import { TaskNotFoundError, TaskMismatchError } from '../../../../domain/types/error.types';

describe('ErrorDetectionService', () => {
  let service: ErrorDetectionService;
  let mockErrorDetectionPort: jest.Mocked<IErrorDetectionPort>;
  let mockErrorLoggingPort: jest.Mocked<IErrorLoggingPort>;

  beforeEach(() => {
    mockErrorDetectionPort = {
      detectErrors: jest.fn(),
      validateTaskTransition: jest.fn(),
      findMatchingTasks: jest.fn(),
    };

    mockErrorLoggingPort = {
      logError: jest.fn(),
      getErrorLogs: jest.fn(),
      getErrorStats: jest.fn(),
    };

    service = new ErrorDetectionService(mockErrorDetectionPort, mockErrorLoggingPort);
  });

  describe('detectErrors', () => {
    it('should detect task not found error', async () => {
      const request = {
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        expectedStatus: 'new',
        newStatus: 'completed',
        requestMetadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
        },
      };

      mockErrorDetectionPort.findMatchingTasks.mockResolvedValue([]);

      const result = await service.detectErrors(request);

      expect(result.hasError).toBe(true);
      expect(result.error).toBeInstanceOf(TaskNotFoundError);
      expect(result.taskExists).toBe(false);
      expect(result.matchingTasksCount).toBe(0);
    });

    it('should detect task mismatch error', async () => {
      const request = {
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        userEmail: 'test@example.com',
        userQuery: 'test query',
        expectedStatus: 'new',
        newStatus: 'completed',
        requestMetadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
        },
      };

      const matchingTasks = [
        {
          id: '456e7890-e89b-12d3-a456-426614174001',
          userEmail: 'test@example.com',
          userQuery: 'test query',
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockErrorDetectionPort.findMatchingTasks.mockResolvedValue(matchingTasks);

      const result = await service.detectErrors(request);

      expect(result.hasError).toBe(true);
      expect(result.error).toBeInstanceOf(TaskMismatchError);
      expect(result.taskExists).toBe(false);
      expect(result.matchingTasksCount).toBe(1);
    });
  });
});
```

### 2. Integration Tests

```typescript
// src/api/kafka/handlers/task-status/__tests__/complete-task.handler.spec.ts
import { CompleteTaskHandler } from '../complete-task.handler';
import { IWebCrawlTaskManagerPort } from '../../../../../application/ports/web-crawl-task-manager.port';
import { IErrorDetectionPort } from '../../../../../application/error-detection/ports/IErrorDetectionPort';
import { CompletedTaskStatusMessage } from '../../../dtos/completed-task-status-message.dto';

describe('CompleteTaskHandler', () => {
  let handler: CompleteTaskHandler;
  let mockTaskManager: jest.Mocked<IWebCrawlTaskManagerPort>;
  let mockErrorDetection: jest.Mocked<IErrorDetectionPort>;

  beforeEach(() => {
    mockTaskManager = {
      completeTask: jest.fn(),
      errorTask: jest.fn(),
    };

    mockErrorDetection = {
      detectErrors: jest.fn(),
      validateTaskTransition: jest.fn(),
      findMatchingTasks: jest.fn(),
    };

    handler = new CompleteTaskHandler(mockTaskManager, mockErrorDetection);
  });

  it('should process task completion without errors', async () => {
    const message: CompletedTaskStatusMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_email: 'test@example.com',
      user_query: 'test query',
      result: 'test result',
      timestamp: new Date().toISOString(),
    };

    mockErrorDetection.detectErrors.mockResolvedValue({
      hasError: false,
      taskExists: true,
      matchingTasksCount: 0,
      isValidTransition: true,
    });

    await handler.handle(message);

    expect(mockErrorDetection.detectErrors).toHaveBeenCalledWith({
      taskId: message.id,
      userEmail: message.user_email,
      userQuery: message.user_query,
      expectedStatus: 'new',
      newStatus: 'completed',
      requestMetadata: expect.objectContaining({
        source: 'kafka-complete-task-handler',
        correlationId: message.id,
      }),
    });

    expect(mockTaskManager.completeTask).toHaveBeenCalledWith(message.id, {
      result: message.result,
      completedAt: message.timestamp,
    });
  });

  it('should handle error detection and continue processing', async () => {
    const message: CompletedTaskStatusMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_email: 'test@example.com',
      user_query: 'test query',
      result: 'test result',
      timestamp: new Date().toISOString(),
    };

    mockErrorDetection.detectErrors.mockResolvedValue({
      hasError: true,
      error: new Error('Test error'),
      taskExists: false,
      matchingTasksCount: 0,
      isValidTransition: false,
    });

    await handler.handle(message);

    expect(mockTaskManager.completeTask).toHaveBeenCalled();
  });
});
```

## Success Metrics

- [ ] All error scenarios properly detected and logged
- [ ] Kafka handlers integrate error detection correctly
- [ ] Database functions perform efficiently
- [ ] Error logging works throughout the system
- [ ] Comprehensive test coverage (>90%)
- [ ] Performance is acceptable under error conditions
- [ ] System gracefully handles error scenarios

## Dependencies

- All previous jobs completed
- Database functions applied
- Error detection and logging services implemented
- Existing Kafka infrastructure

## Next Steps

1. Apply database schema updates
2. Update application factory
3. Modify Kafka handlers
4. Write comprehensive tests
5. Performance testing and optimization
6. Documentation and monitoring setup
