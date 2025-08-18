# Job 10: Field Name Standardization (id → task_id)

## Status

**COMPLETED**

## Overview

Standardize the field name from `id` to `task_id` in Kafka message headers across all DTOs and ensure proper validation. This job addresses the inconsistency in field naming and prepares the system for consistent task identification.

## Objectives

- Change `id` field to `task_id` in all header DTOs
- Update validation rules for the new field name
- Clean migration - no backward compatibility
- Update all logging and error messages
- Update database schema if needed
- Update all tests to use the new field name
- Fix span ID generation in trace context middleware

## Issues to Address

1. **Field Name Inconsistency**: Currently using `id` in headers, should be `task_id`
2. **Validation**: Need proper validation for `task_id` field
3. **Clean Migration**: No backward compatibility - clean break to `task_id` only
4. **Logging**: Update all log messages to use `taskId` consistently
5. **Database**: Ensure database schema supports the new field name
6. **Span ID Generation**: Fix span ID generation in trace context middleware

## Files to Modify

### DTO Files

- `src/api/kafka/dtos/web-crawl-new-task-header.dto.ts`
- `src/api/kafka/dtos/web-crawl-task-status-header.dto.ts`
- `src/api/kafka/dtos/base-web-crawl-header.dto.ts`

### Handler Files

- `src/api/kafka/handlers/task-status/new-task.handler.ts`
- `src/api/kafka/handlers/task-status/complete-task.handler.ts`
- `src/api/kafka/handlers/task-status/error-task.handler.ts`

### Service Files

- `src/application/services/web-crawl-task-manager.service.ts`

### Repository Files

- `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`

### Test Files

- All test files that reference the `id` field

## Detailed Implementation

### 1. Update Header DTOs

**File**: `src/api/kafka/dtos/base-web-crawl-header.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';

/**
 * Base header DTO for web crawl tasks
 * Contains common fields for all web crawl task headers
 */
export class BaseWebCrawlHeaderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  status: string;

  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  source?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  version?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  correlation_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  traceparent?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tracestate?: string;
}
```

**File**: `src/api/kafka/dtos/web-crawl-new-task-header.dto.ts`

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * Header DTO for new web crawl tasks
 * Extends base header with task_id field
 */
export class WebCrawlNewTaskHeaderDto extends BaseWebCrawlHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id: string;
}
```

**File**: `src/api/kafka/dtos/web-crawl-task-status-header.dto.ts`

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * Header DTO for task status updates (completed/error)
 * Extends base header with task_id field
 */
export class WebCrawlTaskStatusHeaderDto extends BaseWebCrawlHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id: string;
}
```

### 2. Update Handlers to Use New Field Name

**File**: `src/api/kafka/handlers/task-status/new-task.handler.ts`

```typescript
// Update the handle method to use task_id consistently
async handle(headers: WebCrawlNewTaskHeaderDto, message: WebCrawlNewTaskMessageDto): Promise<void> {
  const traceContext = this.extractTraceContext(headers);
  const traceLogger = traceContext ? TraceLoggingUtils.enhanceLoggerWithTrace(this.logger, traceContext) : this.logger;

  // Use task_id only - no backward compatibility
  const taskId = headers.task_id;
  const traceId = traceContext?.traceId || 'unknown';

  if (!taskId) {
    throw new Error('Missing required task_id in headers');
  }

  traceLogger.info('Processing new task creation', {
    taskId,
    traceId,
    userEmail: message.user_email,
    userQuery: message.user_query,
    baseUrl: message.base_url,
    status: headers.status,
    messageTimestamp: headers.timestamp,
  });

  try {
    // Create task with PostgreSQL UUID generation and message timestamp
    const task = await this.taskManagerService.createTask({
      taskId, // Pass the task ID from headers
      userEmail: message.user_email,
      userQuery: message.user_query,
      baseUrl: message.base_url,
      status: headers.status,
      receivedAt: headers.timestamp ? new Date(headers.timestamp) : new Date(),
    });

    traceLogger.info('Task created successfully', {
      taskId: task.id,
      traceId,
      userEmail: task.user_email,
      receivedAt: task.received_at,
    });

    // Publish web crawl request with trace context
    await this.publishWebCrawlRequest(task, traceContext);

    traceLogger.info('New task processing completed', {
      taskId: task.id,
      traceId,
    });
  } catch (error) {
    traceLogger.error('Failed to process new task', {
      error: error.message,
      taskId,
      traceId,
      userEmail: message.user_email,
      baseUrl: message.base_url,
    });
    throw error;
  }
}
```

### 3. Update Service Layer

**File**: `src/application/services/web-crawl-task-manager.service.ts`

```typescript
// Update the createTask method to accept taskId parameter
async createTask(data: {
  taskId?: string; // Optional: if provided, use it; otherwise generate
  userEmail: string;
  userQuery: string;
  baseUrl: string;
  status: string;
  receivedAt?: Date;
}): Promise<WebCrawlTask> {
  const traceLogger = this.getTraceLogger();

  traceLogger.info('Creating web crawl task', {
    providedTaskId: data.taskId,
    userEmail: data.userEmail,
    status: data.status,
  });

  try {
    // Use provided taskId or let PostgreSQL generate one
    const task = await this.taskRepository.create({
      id: data.taskId, // Will be ignored if null/undefined, letting PostgreSQL generate
      user_email: data.userEmail,
      user_query: data.userQuery,
      base_url: data.baseUrl,
      status: data.status,
      received_at: data.receivedAt || new Date(),
    });

    traceLogger.info('Web crawl task created successfully', {
      taskId: task.id,
      userEmail: task.user_email,
      status: task.status,
    });

    return task;
  } catch (error) {
    traceLogger.error('Failed to create web crawl task', {
      error: error.message,
      userEmail: data.userEmail,
      baseUrl: data.baseUrl,
    });
    throw error;
  }
}
```

### 4. Update Repository Layer

**File**: `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`

```typescript
// Update the create method to handle optional taskId
async create(data: {
  id?: string; // Optional: if provided, use it; otherwise let PostgreSQL generate
  user_email: string;
  user_query: string;
  base_url: string;
  status: string;
  received_at: Date;
}): Promise<WebCrawlTask> {
  const traceLogger = this.getTraceLogger();

  traceLogger.info('Creating task in database', {
    providedId: data.id,
    userEmail: data.user_email,
    status: data.status,
  });

  try {
    let query: string;
    let params: any[];

    if (data.id) {
      // Use provided ID
      query = `
        INSERT INTO web_crawl_tasks (id, user_email, user_query, base_url, status, received_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      params = [data.id, data.user_email, data.user_query, data.base_url, data.status, data.received_at];
    } else {
      // Let PostgreSQL generate ID
      query = `
        INSERT INTO web_crawl_tasks (user_email, user_query, base_url, status, received_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      params = [data.user_email, data.user_query, data.base_url, data.status, data.received_at];
    }

    const result = await this.pool.query(query, params);
    const task = result.rows[0];

    traceLogger.info('Task created in database', {
      taskId: task.id,
      userEmail: task.user_email,
      status: task.status,
    });

    return this.mapToEntity(task);
  } catch (error) {
    traceLogger.error('Failed to create task in database', {
      error: error.message,
      userEmail: data.user_email,
      baseUrl: data.base_url,
    });
    throw error;
  }
}
```

### 5. Update Validation

**File**: `src/common/utils/validation.ts`

```typescript
// Add validation for task_id field
export function validateTaskId(taskId: string): boolean {
  if (!taskId) {
    return false;
  }

  // UUID v4 validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(taskId);
}

// Add validation for headers with task_id
export function validateTaskHeaders(headers: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  if (!headers.status) {
    errors.push('Missing required field: status');
  }

  if (!headers.timestamp) {
    errors.push('Missing required field: timestamp');
  }

  // Check for task_id only - no backward compatibility
  if (!headers.task_id) {
    errors.push('Missing required field: task_id');
  } else if (!validateTaskId(headers.task_id)) {
    errors.push('Invalid task_id format: must be a valid UUID v4');
  }

  // Validate timestamp format
  if (headers.timestamp && !isValidISODateString(headers.timestamp)) {
    errors.push('Invalid timestamp format: must be ISO 8601');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidISODateString(dateString: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  return isoRegex.test(dateString) && !isNaN(Date.parse(dateString));
}
```

### 6. Fix Span ID Generation

**File**: `src/common/middleware/trace-context.middleware.ts`

```typescript
// Fix the span ID generation issue
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract existing trace context from headers
    const existingContext = TraceContextExtractor.extractTraceContextFromKafkaHeaders(req.headers);

    let traceContext: TraceContext;

    if (existingContext) {
      // If trace context exists, generate new span ID for this request
      traceContext = TraceContextManager.createTraceContext(
        existingContext.traceId,
        undefined, // Let TraceContextManager generate new span ID automatically
        existingContext.traceFlags
      );
    } else {
      // If no trace context, create completely new trace context
      traceContext = TraceContextManager.createTraceContext();
    }

    // Create trace-aware logger for this request
    const traceLogger = TraceContextExtractor.createTraceLoggerFromHeaders(
      { traceparent: TraceContextManager.formatW3CTraceContext(traceContext.traceId, traceContext.spanId, traceContext.traceFlags) },
      logger
    );

    // Attach trace context and logger to request object
    (req as any).traceContext = traceContext;
    (req as any).traceLogger = traceLogger;

    // Log request with trace context
    traceLogger.info('HTTP request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
    });

    next();
  } catch (error) {
    // Fallback to regular logger if trace context setup fails
    logger.warn('Failed to setup trace context for HTTP request', {
      error: error instanceof Error ? error.message : String(error),
      method: req.method,
      path: req.path,
    });
    next();
  }
}
```

**File**: `src/common/utils/tracing/trace-context.ts`

```typescript
// Ensure createTraceContext properly generates span IDs
static createTraceContext(
  traceId?: string,
  spanId?: string,
  traceFlags: number = 1
): TraceContext {
  const finalTraceId = traceId || this.generateTraceId();
  const finalSpanId = spanId || this.generateSpanId(); // Always generate if not provided

  return {
    traceId: finalTraceId,
    spanId: finalSpanId,
    traceFlags,
  };
}

// Add explicit span ID generation method
static generateSpanId(): string {
  return crypto.randomUUID();
}
```

### 7. Update Logging Messages

**File**: `src/common/utils/logger.ts`

```typescript
// Update logging to consistently use taskId
export function logTaskEvent(logger: ILogger, event: string, taskId: string, additionalData: Record<string, any> = {}): void {
  logger.info(`Task event: ${event}`, {
    taskId,
    ...additionalData,
  });
}

export function logTaskError(logger: ILogger, error: Error, taskId: string, additionalData: Record<string, any> = {}): void {
  logger.error(`Task error: ${error.message}`, {
    taskId,
    error: error.message,
    stack: error.stack,
    ...additionalData,
  });
}
```

## Testing Strategy

### Unit Tests

**File**: `src/api/kafka/dtos/__tests__/web-crawl-new-task-header.dto.spec.ts`

```typescript
import { validate } from 'class-validator';
import { WebCrawlNewTaskHeaderDto } from '../web-crawl-new-task-header.dto';

describe('WebCrawlNewTaskHeaderDto', () => {
  it('should validate with task_id', async () => {
    const dto = new WebCrawlNewTaskHeaderDto();
    dto.status = 'new';
    dto.timestamp = '2024-01-15T10:30:00.000Z';
    dto.task_id = '550e8400-e29b-41d4-a716-446655440000';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation without task_id', async () => {
    const dto = new WebCrawlNewTaskHeaderDto();
    dto.status = 'new';
    dto.timestamp = '2024-01-15T10:30:00.000Z';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with invalid task_id', async () => {
    const dto = new WebCrawlNewTaskHeaderDto();
    dto.status = 'new';
    dto.timestamp = '2024-01-15T10:30:00.000Z';
    dto.task_id = 'invalid-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isUuid).toBeDefined();
  });

  it('should fail validation without task_id or id', async () => {
    const dto = new WebCrawlNewTaskHeaderDto();
    dto.status = 'new';
    dto.timestamp = '2024-01-15T10:30:00.000Z';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

**File**: `src/api/kafka/handlers/task-status/__tests__/new-task.handler.spec.ts`

```typescript
import { NewTaskHandler } from '../new-task.handler';
import { WebCrawlNewTaskHeaderDto, WebCrawlNewTaskMessageDto } from '../../../dtos';

describe('NewTaskHandler', () => {
  let handler: NewTaskHandler;
  let mockTaskManagerService: jest.Mocked<IWebCrawlTaskManagerPort>;
  let mockWebCrawlPublisher: jest.Mocked<WebCrawlRequestPublisher>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockTaskManagerService = {
      createTask: jest.fn(),
    } as any;
    mockWebCrawlPublisher = {
      publish: jest.fn(),
    } as any;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
      child: jest.fn().mockReturnThis(),
    };

    handler = new NewTaskHandler(mockLogger, mockTaskManagerService, mockWebCrawlPublisher);
  });

  it('should handle new task with task_id', async () => {
    const headers: WebCrawlNewTaskHeaderDto = {
      status: 'new',
      timestamp: '2024-01-15T10:30:00.000Z',
      task_id: '550e8400-e29b-41d4-a716-446655440000',
      traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
    };

    const message: WebCrawlNewTaskMessageDto = {
      user_email: 'test@example.com',
      user_query: 'scrape website',
      base_url: 'https://example.com',
    };

    const mockTask = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_email: 'test@example.com',
      status: 'new',
      received_at: new Date('2024-01-15T10:30:00.000Z'),
    };

    mockTaskManagerService.createTask.mockResolvedValue(mockTask);

    await handler.handle(headers, message);

    expect(mockTaskManagerService.createTask).toHaveBeenCalledWith({
      taskId: '550e8400-e29b-41d4-a716-446655440000',
      userEmail: 'test@example.com',
      userQuery: 'scrape website',
      baseUrl: 'https://example.com',
      status: 'new',
      receivedAt: new Date('2024-01-15T10:30:00.000Z'),
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Processing new task creation',
      expect.objectContaining({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        traceId: '1234567890abcdef1234567890abcdef',
      })
    );
  });

  it('should throw error when task_id is not provided', async () => {
    const headers: WebCrawlNewTaskHeaderDto = {
      status: 'new',
      timestamp: '2024-01-15T10:30:00.000Z',
      traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
    };

    const message: WebCrawlNewTaskMessageDto = {
      user_email: 'test@example.com',
      user_query: 'scrape website',
      base_url: 'https://example.com',
    };

    await expect(handler.handle(headers, message)).rejects.toThrow('Missing required task_id in headers');
  });

  it('should throw error when task_id is not provided', async () => {
    const headers: WebCrawlNewTaskHeaderDto = {
      status: 'new',
      timestamp: '2024-01-15T10:30:00.000Z',
      traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
    };

    const message: WebCrawlNewTaskMessageDto = {
      user_email: 'test@example.com',
      user_query: 'scrape website',
      base_url: 'https://example.com',
    };

    await expect(handler.handle(headers, message)).rejects.toThrow('Missing required task_id in headers');
  });
});
```

## Success Criteria

- [ ] All header DTOs use `task_id` as the only field name (no `id` field)
- [ ] All handlers use `taskId` consistently in logging
- [ ] Validation properly checks for `task_id` only
- [ ] Database operations support `task_id` field name
- [ ] All tests pass with new field name
- [ ] Logging uses `traceId` instead of `correlationId`
- [ ] Message timestamp is properly used for `received_at`
- [ ] Span IDs are properly generated for all requests
- [ ] Clean migration with no backward compatibility

## Dependencies

- Job 01 (Trace Logging Utilities) - COMPLETED ✅
- Job 04 (Web Crawl Request DTO) - NOT_COMPLETED
- Job 05 (API DTOs Refactoring) - NOT_COMPLETED
- Job 07 (Update New Task Handler) - NOT_COMPLETED

## Estimated Effort

1.5 days

## Migration Strategy

1. **Phase 1**: Replace `id` field with `task_id` in all DTOs
2. **Phase 2**: Update handlers to use `task_id` only
3. **Phase 3**: Update all logging to use `taskId` consistently
4. **Phase 4**: Update tests to use new field name
5. **Phase 5**: Fix span ID generation in trace context middleware

## Rollback Plan

If issues arise during implementation:

1. Revert to using `id` field only
2. Update handlers to use `id` field
3. Remove `task_id` field from DTOs
4. Update tests to use `id` field
5. Ensure all logging uses `id` field
6. Revert span ID generation changes

