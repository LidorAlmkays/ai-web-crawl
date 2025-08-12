# Job 3: Update Enum Values

**Status**: ✅ COMPLETED

## Objective

Align the application's `TaskStatus` enum values with the database's `task_status` enum to resolve enum mismatch errors.

## Problem Analysis

Current issue identified from error logs:

- `"invalid input value for enum task_status: \"new\""` (code `22P02`)

This indicates a mismatch between the application's enum values and the database's enum definition.

## Root Cause

The application is using enum values that don't exist in the PostgreSQL `task_status` enum type.

### Database Enum Definition

```sql
CREATE TYPE task_status AS ENUM (
  'not_completed',
  'completed_success',
  'completed_error'
);
```

### Current Application Enum (Incorrect)

```typescript
export enum TaskStatus {
  NEW = 'new', // ❌ Not in database
  IN_PROGRESS = 'in_progress', // ❌ Not in database
  COMPLETED = 'completed', // ❌ Not in database
  ERROR = 'error', // ❌ Not in database
}
```

## Solution

### 1. Update TaskStatus Enum

**File**: `src/common/enums/task-status.enum.ts`

```typescript
/**
 * Task status enum that matches the database task_status enum
 * Database enum: 'not_completed', 'completed_success', 'completed_error'
 */
export enum TaskStatus {
  NOT_COMPLETED = 'not_completed',
  COMPLETED_SUCCESS = 'completed_success',
  COMPLETED_ERROR = 'completed_error',
}
```

### 2. Update Entity

**File**: `src/domain/entities/web-crawl-task.entity.ts`

```typescript
import { TaskStatus } from '../../common/enums/task-status.enum';

export class WebCrawlTask {
  constructor(public readonly id: string, public readonly userEmail: string, public readonly url: string, public readonly status: TaskStatus, public readonly result?: any, public readonly createdAt: Date = new Date(), public readonly updatedAt: Date = new Date()) {}

  // Update any methods that use status
  isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED_SUCCESS || this.status === TaskStatus.COMPLETED_ERROR;
  }

  isSuccessful(): boolean {
    return this.status === TaskStatus.COMPLETED_SUCCESS;
  }

  isError(): boolean {
    return this.status === TaskStatus.COMPLETED_ERROR;
  }

  isPending(): boolean {
    return this.status === TaskStatus.NOT_COMPLETED;
  }
}
```

### 3. Update DTOs

**File**: `src/api/kafka/dtos/completed-task-status-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class CompletedTaskStatusMessageDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsObject()
  result?: any;

  @IsString()
  @IsNotEmpty()
  completedAt: string;
}

export type CompletedTaskStatusMessageDtoType = CompletedTaskStatusMessageDto;
```

**File**: `src/api/kafka/dtos/error-task-status-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class ErrorTaskStatusMessageDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsString()
  @IsNotEmpty()
  errorAt: string;
}

export type ErrorTaskStatusMessageDtoType = ErrorTaskStatusMessageDto;
```

**File**: `src/api/kafka/dtos/new-task-status-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class NewTaskStatusMessageDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsString()
  @IsNotEmpty()
  createdAt: string;
}

export type NewTaskStatusMessageDtoType = NewTaskStatusMessageDto;
```

### 4. Update Kafka Handlers

**File**: `src/api/kafka/handlers/task-status/new-task.handler.ts`

```typescript
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { NewTaskStatusMessageDto } from '../../dtos/new-task-status-message.dto';

export class NewTaskHandler {
  async handle(message: NewTaskStatusMessageDto): Promise<void> {
    // Ensure status is NOT_COMPLETED for new tasks
    if (message.status !== TaskStatus.NOT_COMPLETED) {
      throw new Error(`Invalid status for new task: ${message.status}`);
    }

    // Handle new task logic
    this.logger.info('Processing new task', { taskId: message.taskId, status: message.status });
  }
}
```

**File**: `src/api/kafka/handlers/task-status/complete-task.handler.ts`

```typescript
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { CompletedTaskStatusMessageDto } from '../../dtos/completed-task-status-message.dto';

export class CompleteTaskHandler {
  async handle(message: CompletedTaskStatusMessageDto): Promise<void> {
    // Ensure status is COMPLETED_SUCCESS for completed tasks
    if (message.status !== TaskStatus.COMPLETED_SUCCESS) {
      throw new Error(`Invalid status for completed task: ${message.status}`);
    }

    // Handle completed task logic
    this.logger.info('Processing completed task', { taskId: message.taskId, status: message.status });
  }
}
```

**File**: `src/api/kafka/handlers/task-status/error-task.handler.ts`

```typescript
import { TaskStatus } from '../../../../common/enums/task-status.enum';
import { ErrorTaskStatusMessageDto } from '../../dtos/error-task-status-message.dto';

export class ErrorTaskHandler {
  async handle(message: ErrorTaskStatusMessageDto): Promise<void> {
    // Ensure status is COMPLETED_ERROR for error tasks
    if (message.status !== TaskStatus.COMPLETED_ERROR) {
      throw new Error(`Invalid status for error task: ${message.status}`);
    }

    // Handle error task logic
    this.logger.error('Processing error task', {
      taskId: message.taskId,
      status: message.status,
      errorMessage: message.errorMessage,
    });
  }
}
```

### 5. Update Service Layer

**File**: `src/application/services/web-crawl-task-manager.service.ts`

```typescript
import { TaskStatus } from '../../common/enums/task-status.enum';

export class WebCrawlTaskManagerService {
  async createTask(userEmail: string, url: string): Promise<WebCrawlTask> {
    const task = new WebCrawlTask(
      generateId(),
      userEmail,
      url,
      TaskStatus.NOT_COMPLETED, // Use correct enum value
      undefined,
      new Date(),
      new Date()
    );

    return await this.repository.createWebCrawlTask(task);
  }

  async markTaskAsCompleted(taskId: string, result: any): Promise<WebCrawlTask> {
    const task = await this.repository.findWebCrawlTaskById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updatedTask = new WebCrawlTask(
      task.id,
      task.userEmail,
      task.url,
      TaskStatus.COMPLETED_SUCCESS, // Use correct enum value
      result,
      task.createdAt,
      new Date()
    );

    return await this.repository.updateWebCrawlTask(taskId, updatedTask);
  }

  async markTaskAsError(taskId: string, errorMessage: string): Promise<WebCrawlTask> {
    const task = await this.repository.findWebCrawlTaskById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updatedTask = new WebCrawlTask(
      task.id,
      task.userEmail,
      task.url,
      TaskStatus.COMPLETED_ERROR, // Use correct enum value
      { error: errorMessage },
      task.createdAt,
      new Date()
    );

    return await this.repository.updateWebCrawlTask(taskId, updatedTask);
  }
}
```

### 6. Update Tests

**File**: `src/infrastructure/persistence/postgres/__tests__/web-crawl-task.repository.adapter.spec.ts`

```typescript
import { TaskStatus } from '../../../../common/enums/task-status.enum';

describe('WebCrawlTaskRepositoryAdapter', () => {
  describe('createWebCrawlTask', () => {
    it('should create task with NOT_COMPLETED status', async () => {
      const task = await repository.createWebCrawlTask(
        'test@example.com',
        'https://example.com',
        TaskStatus.NOT_COMPLETED, // Use correct enum value
        new Date(),
        new Date()
      );

      expect(task.status).toBe(TaskStatus.NOT_COMPLETED);
    });
  });

  describe('updateWebCrawlTask', () => {
    it('should update task to COMPLETED_SUCCESS', async () => {
      const updatedTask = await repository.updateWebCrawlTask(taskId, {
        status: TaskStatus.COMPLETED_SUCCESS, // Use correct enum value
        result: { data: 'test' },
      });

      expect(updatedTask?.status).toBe(TaskStatus.COMPLETED_SUCCESS);
    });

    it('should update task to COMPLETED_ERROR', async () => {
      const updatedTask = await repository.updateWebCrawlTask(taskId, {
        status: TaskStatus.COMPLETED_ERROR, // Use correct enum value
        result: { error: 'test error' },
      });

      expect(updatedTask?.status).toBe(TaskStatus.COMPLETED_ERROR);
    });
  });
});
```

### 7. Update Validation

**File**: `src/common/utils/validation.ts`

```typescript
import { TaskStatus } from '../enums/task-status.enum';

export function validateTaskStatus(status: string): boolean {
  return Object.values(TaskStatus).includes(status as TaskStatus);
}

export function getValidTaskStatuses(): string[] {
  return Object.values(TaskStatus);
}
```

## Implementation Steps

### Step 1: Update Enum Definition

1. Update `TaskStatus` enum to match database values
2. Add JSDoc comments explaining the mapping
3. Export the enum for use throughout the application

### Step 2: Update All References

1. Update entity classes
2. Update DTOs with proper validation
3. Update service layer methods
4. Update Kafka handlers
5. Update repository adapter

### Step 3: Update Tests

1. Update unit tests to use correct enum values
2. Update integration tests
3. Add validation tests for enum values
4. Test error scenarios with invalid enum values

### Step 4: Validation

1. Test task creation with correct enum values
2. Test task status transitions
3. Test error handling for invalid enum values
4. Verify database operations work correctly

## Success Criteria

- [ ] No "invalid enum value" errors in logs
- [ ] All enum values match database definition
- [ ] Task creation works with correct status values
- [ ] Task status transitions work correctly
- [ ] All tests pass with updated enum values
- [ ] Validation prevents invalid enum values
- [ ] Backward compatibility maintained where possible

## Testing Strategy

### Unit Tests

- Test enum value validation
- Test entity methods with correct enum values
- Test service layer with correct enum values
- Test DTO validation

### Integration Tests

- Test database operations with correct enum values
- Test Kafka message handling
- Test end-to-end task lifecycle

### Error Tests

- Test with invalid enum values
- Test enum value validation
- Test error handling for mismatched values

## Example Test Cases

```typescript
describe('TaskStatus Enum', () => {
  it('should have correct values matching database', () => {
    expect(TaskStatus.NOT_COMPLETED).toBe('not_completed');
    expect(TaskStatus.COMPLETED_SUCCESS).toBe('completed_success');
    expect(TaskStatus.COMPLETED_ERROR).toBe('completed_error');
  });

  it('should validate correct enum values', () => {
    expect(validateTaskStatus('not_completed')).toBe(true);
    expect(validateTaskStatus('completed_success')).toBe(true);
    expect(validateTaskStatus('completed_error')).toBe(true);
    expect(validateTaskStatus('invalid')).toBe(false);
  });
});
```

## Dependencies

- Database schema with correct enum definition
- Updated repository adapter (from J1)
- Logger implementation for error logging

## Risks and Mitigation

### Risks

1. **Breaking Changes**: Enum value changes might break existing code
2. **Data Migration**: Existing data might have incorrect enum values
3. **Validation Errors**: New validation might reject existing data

### Mitigation

1. **Comprehensive Testing**: Test all code paths with new enum values
2. **Data Migration**: Script to update existing data if needed
3. **Gradual Rollout**: Deploy changes incrementally
4. **Rollback Plan**: Ability to revert to previous enum values
