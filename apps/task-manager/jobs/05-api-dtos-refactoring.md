# Job 05: API DTOs Refactoring - API Layer

## Status

**COMPLETED**

## Overview

Refactor the API-layer Kafka DTOs to align with the simplified, web-crawl–focused header model and move all trace context into headers. Remove `task_type` from headers, add trace fields, and split headers by use-case (new-task vs. updates). Update message body DTOs to share a common base and ensure validations are comprehensive and consistent.

## Objectives

- Replace generic task header with web-crawl–specific base header (no `task_type`)
- Add trace context to headers: `traceparent`, `tracestate`, `correlation_id`, `source`, `version`
- Create separate headers for new-task (no id) and updates (has `task_id`)
- Unify message body DTOs via a base (email, query, url) and extend for completed/error
- Remove/replace legacy DTOs to avoid confusion
- Keep `TaskStatus` enum for `status` in headers

## Files to Create/Modify

### New Files

- `src/api/kafka/dtos/base-web-crawl-header.dto.ts` — Base web-crawl header
- `src/api/kafka/dtos/web-crawl-new-task-header.dto.ts` — Header for new-task
- `src/api/kafka/dtos/web-crawl-task-update-header.dto.ts` — Header for updates (completed/error)
- `src/api/kafka/dtos/base-web-crawl-message.dto.ts` — Base body (email/query/url)
- `src/api/kafka/dtos/web-crawl-new-task-message.dto.ts`
- `src/api/kafka/dtos/web-crawl-completed-task-message.dto.ts`
- `src/api/kafka/dtos/web-crawl-error-task-message.dto.ts`
- `src/api/kafka/dtos/__tests__/api-dtos.spec.ts` — Unit tests (ensure `reflect-metadata` imported)

### Files to Remove/Replace

- Remove legacy DTOs after migration:
  - `src/api/kafka/dtos/task-status-header.dto.ts`
  - `src/api/kafka/dtos/new-task-status-message.dto.ts`
  - `src/api/kafka/dtos/completed-task-status-message.dto.ts`
  - `src/api/kafka/dtos/error-task-status-message.dto.ts`
- Update `src/api/kafka/dtos/index.ts` barrel exports

## Detailed Implementation

### 1) Base Web-Crawl Header DTO

```typescript
import { IsOptional, IsString, MaxLength, IsEnum, IsDateString, IsNotEmpty } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

/**
 * Base DTO for all web crawl Kafka message headers
 * Contains common metadata and trace context
 */
export abstract class BaseWebCrawlHeaderDto {
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status!: string;

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

export type BaseWebCrawlHeaderDtoType = BaseWebCrawlHeaderDto;
```

### 2) New-Task Header DTO (no id)

```typescript
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * Header for NEW task messages (no task_id yet)
 */
export class WebCrawlNewTaskHeaderDto extends BaseWebCrawlHeaderDto {}

export type WebCrawlNewTaskHeaderDtoType = WebCrawlNewTaskHeaderDto;
```

### 3) Task-Update Header DTO (has task_id)

```typescript
import { IsNotEmpty, IsUUID } from 'class-validator';
import { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';

/**
 * Header for task update messages (completed/error) — includes task_id
 */
export class WebCrawlTaskUpdateHeaderDto extends BaseWebCrawlHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id!: string;
}

export type WebCrawlTaskUpdateHeaderDtoType = WebCrawlTaskUpdateHeaderDto;
```

### 4) Base Web-Crawl Message DTO (value/body)

```typescript
import { IsString, IsNotEmpty, IsEmail, IsUrl, MinLength, MaxLength } from 'class-validator';

/**
 * Base DTO for Kafka message bodies
 */
export abstract class BaseWebCrawlMessageDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  user_email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query!: string;

  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  base_url!: string;
}

export type BaseWebCrawlMessageDtoType = BaseWebCrawlMessageDto;
```

### 5) Specializations

```typescript
// web-crawl-new-task-message.dto.ts
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';
export class WebCrawlNewTaskMessageDto extends BaseWebCrawlMessageDto {}
export type WebCrawlNewTaskMessageDtoType = WebCrawlNewTaskMessageDto;

// web-crawl-completed-task-message.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';
export class WebCrawlCompletedTaskMessageDto extends BaseWebCrawlMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  crawl_result!: string;
}
export type WebCrawlCompletedTaskMessageDtoType = WebCrawlCompletedTaskMessageDto;

// web-crawl-error-task-message.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';
export class WebCrawlErrorTaskMessageDto extends BaseWebCrawlMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10000)
  error!: string;
}
export type WebCrawlErrorTaskMessageDtoType = WebCrawlErrorTaskMessageDto;
```

### 6) Barrel Exports

```typescript
// src/api/kafka/dtos/index.ts
export { BaseWebCrawlHeaderDto } from './base-web-crawl-header.dto';
export type { BaseWebCrawlHeaderDtoType } from './base-web-crawl-header.dto';
export { WebCrawlNewTaskHeaderDto } from './web-crawl-new-task-header.dto';
export { WebCrawlTaskUpdateHeaderDto } from './web-crawl-task-update-header.dto';
export type { WebCrawlNewTaskHeaderDtoType, WebCrawlTaskUpdateHeaderDtoType } from './web-crawl-new-task-header.dto';
export { BaseWebCrawlMessageDto } from './base-web-crawl-message.dto';
export type { BaseWebCrawlMessageDtoType } from './base-web-crawl-message.dto';
export { WebCrawlNewTaskMessageDto } from './web-crawl-new-task-message.dto';
export { WebCrawlCompletedTaskMessageDto } from './web-crawl-completed-task-message.dto';
export { WebCrawlErrorTaskMessageDto } from './web-crawl-error-task-message.dto';
export type { WebCrawlNewTaskMessageDtoType, WebCrawlCompletedTaskMessageDtoType, WebCrawlErrorTaskMessageDtoType } from './web-crawl-new-task-message.dto';
```

### 7) Unit Tests

```typescript
// src/api/kafka/dtos/__tests__/api-dtos.spec.ts
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BaseWebCrawlHeaderDto, WebCrawlNewTaskHeaderDto, WebCrawlTaskUpdateHeaderDto, BaseWebCrawlMessageDto, WebCrawlNewTaskMessageDto, WebCrawlCompletedTaskMessageDto, WebCrawlErrorTaskMessageDto } from '../index';

// Basic happy-path and negative tests for headers and bodies...
```

## Potential Issues and Mitigations

- Breaking changes: Update all imports/usages systematically
- Field validation: Ensure test coverage for edge cases
- Naming consistency: Use `task_id` in update headers (Job 10 will standardize remaining usages across codebase)

## Success Criteria

- [ ] New header DTOs (base/new/update) compiled with validations
- [ ] Message DTOs refactored with base and specializations
- [ ] Legacy DTOs removed and imports updated
- [ ] All unit tests pass
- [ ] Type safety is maintained; trace context only in headers

## Dependencies

- class-validator, class-transformer
- Existing API Kafka handlers
- TypeScript decorators enabled

## Notes

- API layer should validate incoming Kafka headers with new DTOs
- Keep `TaskStatus` in headers; no `task_type` needed for web crawl
- Trace context stays in headers; message body contains business fields only
- Use `task_id` in update headers (task already exists)
