# Job 05: API DTOs Refactoring - API Layer

## Status

**NOT_COMPLETED**

## Overview

Refactor existing API DTOs to improve naming, structure, and add trace context to headers. This job focuses on API layer DTOs for Kafka message handling.

## Objectives

- Create base web crawl header DTO with proper naming
- Refactor existing API DTOs with better structure
- Add trace context to headers only
- Update message DTOs with correct fields
- Improve naming conventions

## Files to Create/Modify

### New Files

- `src/api/kafka/dtos/base-web-crawl-header.dto.ts` - Base header for web crawl tasks
- `src/api/kafka/dtos/web-crawl-new-task-header.dto.ts` - Header for new task messages
- `src/api/kafka/dtos/web-crawl-task-update-header.dto.ts` - Header for task updates (completed/error)

### Files to Modify

- `src/api/kafka/dtos/task-status-header.dto.ts` - Remove (replaced by new structure)
- `src/api/kafka/dtos/new-task-status-message.dto.ts` - Remove (replaced by new structure)
- `src/api/kafka/dtos/completed-task-status-message.dto.ts` - Remove (replaced by new structure)
- `src/api/kafka/dtos/error-task-status-message.dto.ts` - Remove (replaced by new structure)
- `src/api/kafka/dtos/index.ts` - Update exports

## Detailed Implementation

### 1. Create Base Web Crawl Header DTO

**File**: `src/api/kafka/dtos/base-web-crawl-header.dto.ts`

```typescript
import { IsOptional, IsString, MaxLength, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

/**
 * Base DTO for all web crawl Kafka message headers
 * Contains common trace context and metadata fields
 * All web crawl header DTOs should extend this base class
 *
 * NOTE: task_type removed - web crawl tasks only, different task types use different topics
 */
export abstract class BaseWebCrawlHeaderDto {
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status!: string; // Always present in all web crawl headers

  @IsDateString()
  @IsNotEmpty()
  timestamp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  traceparent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tracestate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  correlation_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;
}

// Export type alias for the class
export type BaseWebCrawlHeaderDtoType = BaseWebCrawlHeaderDto;
```

### 2. Create Web Crawl New Task Header DTO

**File**: `src/api/kafka/dtos/web-crawl-new-task-header.dto.ts`

```typescript
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * DTO for new web crawl task message headers
 * Contains metadata for new task creation messages
 * Extends BaseWebCrawlHeaderDto to include trace context
 *
 * NOTE: This DTO is used in Kafka message headers for new task messages
 * The message body/value is defined in NewTaskStatusMessageDto
 * No task_id - task not created yet
 */
export class WebCrawlNewTaskHeaderDto extends BaseWebCrawlHeaderDto {
  // No additional fields needed for new task headers
  // All trace context and common fields are inherited from BaseWebCrawlHeaderDto
  // status will be 'NEW' for new tasks
}

// Export type alias for the class
export type WebCrawlNewTaskHeaderDtoType = WebCrawlNewTaskHeaderDto;
```

### 3. Create Web Crawl Task Update Header DTO

**File**: `src/api/kafka/dtos/web-crawl-task-update-header.dto.ts`

```typescript
import { IsNotEmpty, IsUUID } from 'class-validator';
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * DTO for web crawl task update message headers
 * Contains metadata for task update messages (completed, error, etc.)
 * Extends BaseWebCrawlHeaderDto to include trace context
 *
 * NOTE: This DTO is used in Kafka message headers for task updates
 * The message body/value is defined in CompletedTaskStatusMessageDto or ErrorTaskStatusMessageDto
 * Has task_id - task already exists
 */
export class WebCrawlTaskUpdateHeaderDto extends BaseWebCrawlHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id!: string; // Present for completed/error tasks (task already exists)
}

// Export type alias for the class
export type WebCrawlTaskUpdateHeaderDtoType = WebCrawlTaskUpdateHeaderDto;
```

### 4. Create Base Web Crawl Message DTO

**File**: `src/api/kafka/dtos/base-web-crawl-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsEmail, IsUrl, MinLength, MaxLength } from 'class-validator';

/**
 * Base DTO for all web crawl message bodies
 * Contains common fields shared across all web crawl messages
 * All web crawl message DTOs should extend this base class
 *
 * IMPORTANT: This DTO represents the common VALUE/BODY fields of Kafka messages
 * Trace context is handled in the headers, not in the message body
 */
export abstract class BaseWebCrawlMessageDto {
  @IsEmail()
  @IsNotEmpty()
  user_email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query!: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  base_url!: string;
}

// Export type alias for the class
export type BaseWebCrawlMessageDtoType = BaseWebCrawlMessageDto;
```

### 5. Create Web Crawl New Task Message DTO

**File**: `src/api/kafka/dtos/web-crawl-new-task-message.dto.ts`

```typescript
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';

/**
 * DTO for validating new web crawl task message body
 * Contains the data needed to create a new task
 *
 * IMPORTANT: This DTO represents the VALUE/BODY of the Kafka message
 * The message HEADERS are defined in WebCrawlNewTaskHeaderDto
 * Trace context is handled in the headers, not in the message body
 */
export class WebCrawlNewTaskMessageDto extends BaseWebCrawlMessageDto {
  // No additional fields needed for new task messages
  // All common fields are inherited from BaseWebCrawlMessageDto
}

// Export type alias for the class
export type WebCrawlNewTaskMessageDtoType = WebCrawlNewTaskMessageDto;
```

### 6. Create Web Crawl Completed Task Message DTO

**File**: `src/api/kafka/dtos/web-crawl-completed-task-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';

/**
 * DTO for validating completed web crawl task message body
 * Contains the data for completed task results
 *
 * IMPORTANT: This DTO represents the VALUE/BODY of the Kafka message
 * The message HEADERS are defined in WebCrawlTaskUpdateHeaderDto
 * Trace context is handled in the headers, not in the message body
 */
export class WebCrawlCompletedTaskMessageDto extends BaseWebCrawlMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  crawl_result!: string; // The result of the web crawl operation
}

// Export type alias for the class
export type WebCrawlCompletedTaskMessageDtoType = WebCrawlCompletedTaskMessageDto;
```

### 7. Create Web Crawl Error Task Message DTO

**File**: `src/api/kafka/dtos/web-crawl-error-task-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';

/**
 * DTO for validating error web crawl task message body
 * Contains the data for task errors
 *
 * IMPORTANT: This DTO represents the VALUE/BODY of the Kafka message
 * The message HEADERS are defined in WebCrawlTaskUpdateHeaderDto
 * Trace context is handled in the headers, not in the message body
 */
export class WebCrawlErrorTaskMessageDto extends BaseWebCrawlMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  error!: string; // The error message from the failed web crawl operation
}

// Export type alias for the class
export type WebCrawlErrorTaskMessageDtoType = WebCrawlErrorTaskMessageDto;
```

### 8. Update DTOs Index

**File**: `src/api/kafka/dtos/index.ts`

```typescript
// ... existing exports ...

// Base Web Crawl Header DTO
export { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';
export type { BaseWebCrawlHeaderDtoType } from './base-web-crawl-header.dto';

// Web Crawl Header DTOs
export { WebCrawlNewTaskHeaderDto } from './web-crawl-new-task-header.dto';
export { WebCrawlTaskUpdateHeaderDto } from './web-crawl-task-update-header.dto';
export type { WebCrawlNewTaskHeaderDtoType, WebCrawlTaskUpdateHeaderDtoType } from './web-crawl-new-task-header.dto';

// Base Web Crawl Message DTO
export { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';
export type { BaseWebCrawlMessageDtoType } from './base-web-crawl-message.dto';

// Web Crawl Message DTOs
export { WebCrawlNewTaskMessageDto } from './web-crawl-new-task-message.dto';
export { WebCrawlCompletedTaskMessageDto } from './web-crawl-completed-task-message.dto';
export { WebCrawlErrorTaskMessageDto } from './web-crawl-error-task-message.dto';
export type { WebCrawlNewTaskMessageDtoType, WebCrawlCompletedTaskMessageDtoType, WebCrawlErrorTaskMessageDtoType } from './web-crawl-new-task-message.dto';

// Remove old exports
// export { TaskStatusHeaderDto } from './task-status-header.dto';
// export type { TaskStatusHeaderDtoType } from './task-status-header.dto';
// export { NewTaskStatusMessageDto } from './new-task-status-message.dto';
// export type { NewTaskStatusMessageDtoType } from './new-task-status-message.dto';
// export { CompletedTaskStatusMessageDto } from './completed-task-status-message.dto';
// export type { CompletedTaskStatusMessageDtoType } from './completed-task-status-message.dto';
// export { ErrorTaskStatusMessageDto } from './error-task-status-message.dto';
// export type { ErrorTaskStatusMessageDtoType } from './error-task-status-message.dto';
```

### 9. Create Unit Tests

**File**: `src/api/kafka/dtos/__tests__/api-dtos.spec.ts`

```typescript
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BaseWebCrawlHeaderDto, WebCrawlNewTaskHeaderDto, WebCrawlTaskUpdateHeaderDto, BaseWebCrawlMessageDto, WebCrawlNewTaskMessageDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../index';

describe('API DTOs', () => {
  describe('BaseWebCrawlHeaderDto', () => {
    it('should validate valid base header data', async () => {
      const headerData = {
        status: 'NEW',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'task-manager',
        version: '1.0.0',
      };

      const header = plainToClass(BaseWebCrawlHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing status', async () => {
      const headerData = {
        timestamp: new Date().toISOString(),
      };

      const header = plainToClass(BaseWebCrawlHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('WebCrawlNewTaskHeaderDto', () => {
    it('should validate valid new task header data', async () => {
      const headerData = {
        status: 'NEW',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      const header = plainToClass(WebCrawlNewTaskHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });
  });

  describe('WebCrawlTaskUpdateHeaderDto', () => {
    it('should validate valid task update header data', async () => {
      const headerData = {
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      const header = plainToClass(WebCrawlTaskUpdateHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing task_id', async () => {
      const headerData = {
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      };

      const header = plainToClass(WebCrawlTaskUpdateHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('BaseWebCrawlMessageDto', () => {
    it('should validate valid base message data', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(BaseWebCrawlMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing user_email', async () => {
      const messageData = {
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(BaseWebCrawlMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('WebCrawlNewTaskMessageDto', () => {
    it('should validate valid new task message data', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlNewTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });
  });

  describe('WebCrawlCompletedTaskMessageDto', () => {
    it('should validate valid completed task message data', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        crawl_result: 'Product found successfully',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlCompletedTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing crawl_result', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlCompletedTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('WebCrawlErrorTaskMessageDto', () => {
    it('should validate valid error task message data', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        error: 'Network timeout occurred',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlErrorTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });

    it('should reject missing error', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlErrorTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should handle long error messages', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        error: 'a'.repeat(500), // Long error message
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlErrorTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });

    it('should reject empty error message', async () => {
      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        error: '',
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlErrorTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });
  });

  describe('Inheritance and Base Classes', () => {
    it('should properly inherit from BaseWebCrawlHeaderDto', () => {
      const newTaskHeader = new NewTaskHeaderDto();
      const taskUpdateHeader = new TaskUpdateHeaderDto();

      // Both should have base header properties
      expect(newTaskHeader).toHaveProperty('status');
      expect(newTaskHeader).toHaveProperty('timestamp');
      expect(newTaskHeader).toHaveProperty('traceparent');
      expect(newTaskHeader).toHaveProperty('tracestate');
      expect(newTaskHeader).toHaveProperty('correlation_id');
      expect(newTaskHeader).toHaveProperty('source');
      expect(newTaskHeader).toHaveProperty('version');

      expect(taskUpdateHeader).toHaveProperty('status');
      expect(taskUpdateHeader).toHaveProperty('timestamp');
      expect(taskUpdateHeader).toHaveProperty('traceparent');
      expect(taskUpdateHeader).toHaveProperty('tracestate');
      expect(taskUpdateHeader).toHaveProperty('correlation_id');
      expect(taskUpdateHeader).toHaveProperty('source');
      expect(taskUpdateHeader).toHaveProperty('version');
      expect(taskUpdateHeader).toHaveProperty('task_id');
    });

    it('should properly inherit from BaseWebCrawlMessageDto', () => {
      const newTaskMessage = new WebCrawlNewTaskMessageDto();
      const completedTaskMessage = new WebCrawlCompletedTaskMessageDto();
      const errorTaskMessage = new WebCrawlErrorTaskMessageDto();

      // All should have base message properties
      expect(newTaskMessage).toHaveProperty('user_email');
      expect(newTaskMessage).toHaveProperty('user_query');
      expect(newTaskMessage).toHaveProperty('base_url');

      expect(completedTaskMessage).toHaveProperty('user_email');
      expect(completedTaskMessage).toHaveProperty('user_query');
      expect(completedTaskMessage).toHaveProperty('base_url');
      expect(completedTaskMessage).toHaveProperty('crawl_result');

      expect(errorTaskMessage).toHaveProperty('user_email');
      expect(errorTaskMessage).toHaveProperty('user_query');
      expect(errorTaskMessage).toHaveProperty('base_url');
      expect(errorTaskMessage).toHaveProperty('error');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle various status values in headers', async () => {
      const validStatuses = ['new', 'completed', 'error'];

      for (const status of validStatuses) {
        const headerData = {
          status,
          timestamp: new Date().toISOString(),
          task_id: '123e4567-e89b-12d3-a456-426614174000',
        };

        const header = plainToClass(TaskUpdateHeaderDto, headerData);
        const errors = await validate(header);

        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid status values', async () => {
      const invalidStatuses = ['pending', 'processing', 'unknown', ''];

      for (const status of invalidStatuses) {
        const headerData = {
          status,
          timestamp: new Date().toISOString(),
          task_id: '123e4567-e89b-12d3-a456-426614174000',
        };

        const header = plainToClass(TaskUpdateHeaderDto, headerData);
        const errors = await validate(header);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.isEnum).toBeDefined();
      }
    });

    it('should handle complex crawl results', async () => {
      const complexResults = ['Product found: iPhone 15 Pro Max - $999', 'Multiple products found: [{"id": 1, "name": "Product 1"}, {"id": 2, "name": "Product 2"}]', 'No products found for the given criteria', 'Search completed successfully with 0 results'];

      for (const result of complexResults) {
        const messageData = {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          crawl_result: result,
          base_url: 'https://example.com',
        };

        const message = plainToClass(WebCrawlCompletedTaskMessageDto, messageData);
        const errors = await validate(message);

        expect(errors).toHaveLength(0);
      }
    });

    it('should handle various error types', async () => {
      const errorTypes = ['Network timeout occurred', 'HTTP 404: Page not found', 'HTTP 500: Internal server error', 'Invalid URL format', 'SSL certificate error', 'Rate limiting exceeded', 'Robot.txt disallowed access', 'JavaScript execution failed', 'Content extraction failed'];

      for (const error of errorTypes) {
        const messageData = {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          error,
          base_url: 'https://example.com',
        };

        const message = plainToClass(WebCrawlErrorTaskMessageDto, messageData);
        const errors = await validate(message);

        expect(errors).toHaveLength(0);
      }
    });

    it('should handle missing optional fields gracefully', async () => {
      const headerData = {
        status: 'new',
        timestamp: new Date().toISOString(),
        // Missing optional trace context fields
      };

      const header = plainToClass(NewTaskHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should validate trace context fields when provided', async () => {
      const headerData = {
        status: 'completed',
        timestamp: new Date().toISOString(),
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'task-manager',
        version: '1.0.0',
      };

      const header = plainToClass(TaskUpdateHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Type Safety and Compilation', () => {
    it('should maintain type safety with inheritance', () => {
      // These should compile without errors
      const newTaskHeader: NewTaskHeaderDto = {
        status: 'new',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      const taskUpdateHeader: TaskUpdateHeaderDto = {
        status: 'completed',
        timestamp: new Date().toISOString(),
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
      };

      expect(newTaskHeader.status).toBe('new');
      expect(taskUpdateHeader.task_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should prevent invalid property access', () => {
      const newTaskHeader = new NewTaskHeaderDto();

      // This should not have task_id property
      expect(newTaskHeader).not.toHaveProperty('task_id');

      const taskUpdateHeader = new TaskUpdateHeaderDto();

      // This should have task_id property
      expect(taskUpdateHeader).toHaveProperty('task_id');
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle rapid validation', async () => {
      const validationPromises = Array.from({ length: 100 }, (_, i) => {
        const headerData = {
          status: 'new',
          timestamp: new Date().toISOString(),
          traceparent: `00-1234567890abcdef1234567890abcdef-1234567890abcdef-0${i % 2}`,
        };

        const header = plainToClass(NewTaskHeaderDto, headerData);
        return validate(header);
      });

      const results = await Promise.all(validationPromises);

      results.forEach((errors) => {
        expect(errors).toHaveLength(0);
      });
    });

    it('should handle large message content', async () => {
      const largeResult = 'a'.repeat(10000); // 10KB result

      const messageData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        crawl_result: largeResult,
        base_url: 'https://example.com',
      };

      const message = plainToClass(WebCrawlCompletedTaskMessageDto, messageData);
      const errors = await validate(message);

      expect(errors).toHaveLength(0);
    });
  });
});
```

## Potential Issues and Mitigations

### 1. Breaking Changes

**Issue**: Renaming DTOs and changing structure might break existing code
**Mitigation**: Update all imports and usages systematically

### 2. Field Validation

**Issue**: New fields in message DTOs might need different validation rules
**Mitigation**: Test all validation scenarios thoroughly

### 3. Naming Consistency

**Issue**: New naming might not be consistent across the codebase
**Mitigation**: Review and update all related files

## Success Criteria

- [ ] All new DTOs validate correctly with class-validator
- [ ] Base web crawl header DTO created with proper structure
- [ ] New task header DTO extends base header correctly
- [ ] Task update header DTO extends base header with task_id
- [ ] Base web crawl message DTO created with common fields
- [ ] New task message DTO extends base message correctly
- [ ] Completed task message DTO extends base message with crawl_result
- [ ] Error task message DTO extends base message with error
- [ ] All old DTOs removed or deprecated
- [ ] Clear separation between headers and message bodies
- [ ] All unit tests pass
- [ ] Type safety is maintained
- [ ] Error messages are clear and helpful

## Dependencies

- class-validator library
- class-transformer library
- Existing DTO structure
- TypeScript configuration

## Estimated Effort

- **Development**: 1 day
- **Testing**: 0.5 day
- **Total**: 1.5 days

## Notes

- This job refactors API layer DTOs for better structure and naming
- Base header contains common fields: status, timestamp, trace context
- New task headers: No task_id (task not created yet)
- Task update headers: Has task_id (for completed/error tasks)
- Base message contains common fields: user_email, user_query, base_url
- New task messages: No additional fields (inherits from base)
- Completed task messages: Adds crawl_result field
- Error task messages: Adds error field
- Removed task_type - web crawl tasks only, different task types use different topics
- Clear separation: Headers contain metadata + trace context, Bodies contain business data
- Must be completed after Job 04 (web crawl request DTOs)
- Validation should be comprehensive to prevent runtime issues
