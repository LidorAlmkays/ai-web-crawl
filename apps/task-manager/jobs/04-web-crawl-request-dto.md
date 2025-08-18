# Job 04: Web Crawl Request DTOs - Infrastructure Layer

## Status

**NOT_COMPLETED**

## Overview

Create DTOs for web crawl request messages to ensure proper validation and type safety when publishing web crawl requests to Kafka topics. This job focuses on infrastructure-layer DTOs for outbound web crawl requests (publisher side) and aligns with the latest header conventions and topic configuration.

## Objectives

- Create header and body DTOs for web crawl requests
- Implement comprehensive validation using class-validator
- Ensure trace context propagation
- Maintain type safety throughout the workflow
- Align with current topic configuration `kafkaTopicConfig.webCrawlRequest`
- Do not accept client-provided IDs for new task creation anywhere; the outbound request uses the DB-generated `task_id`

## Files to Create/Modify

### New Files

- `src/infrastructure/messaging/kafka/dtos/web-crawl-request.dto.ts` - Web crawl request DTOs (infrastructure layer)
- `src/infrastructure/messaging/kafka/dtos/__tests__/web-crawl-request.dto.spec.ts` - Unit tests

### Files to Modify

- (If present) add barrel export in `src/infrastructure/messaging/kafka/dtos/index.ts`

## Detailed Implementation

### 1. Create Web Crawl Request DTOs

**File**: `src/infrastructure/messaging/kafka/dtos/web-crawl-request.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsUrl, IsOptional, IsUUID, MinLength, MaxLength, IsEmail, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for web crawl request message headers
 * Contains task_id, timestamp, and trace context information.
 * Used for outgoing web crawl requests to Kafka (infrastructure layer).
 */
export class WebCrawlRequestHeaderDto {
  @IsUUID()
  @IsNotEmpty()
  task_id: string;

  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

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
  source?: string = 'task-manager';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string = '1.0.0';
}

/**
 * DTO for web crawl request message body
 * Contains the essential web crawling parameters
 */
export class WebCrawlRequestBodyDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  user_email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  user_query: string;

  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  base_url: string;
}

/**
 * Complete web crawl request message DTO
 * Combines header and body with validation
 */
export class WebCrawlRequestMessageDto {
  @Type(() => WebCrawlRequestHeaderDto)
  @ValidateNested()
  headers: WebCrawlRequestHeaderDto;

  @Type(() => WebCrawlRequestBodyDto)
  @ValidateNested()
  body: WebCrawlRequestBodyDto;
}

// Export type aliases for convenience
export type WebCrawlRequestHeaderDtoType = WebCrawlRequestHeaderDto;
export type WebCrawlRequestBodyDtoType = WebCrawlRequestBodyDto;
export type WebCrawlRequestMessageDtoType = WebCrawlRequestMessageDto;
```

### 2. Add Barrel Export (optional)

**File**: `src/infrastructure/messaging/kafka/dtos/index.ts`

```typescript
export { WebCrawlRequestHeaderDto, WebCrawlRequestBodyDto, WebCrawlRequestMessageDto } from './web-crawl-request.dto';
export type { WebCrawlRequestHeaderDtoType, WebCrawlRequestBodyDtoType, WebCrawlRequestMessageDtoType } from './web-crawl-request.dto';
```

### 3. Create Unit Tests

**File**: `src/infrastructure/messaging/kafka/dtos/__tests__/web-crawl-request.dto.spec.ts`

```typescript
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { WebCrawlRequestHeaderDto, WebCrawlRequestBodyDto, WebCrawlRequestMessageDto } from '../web-crawl-request.dto';

describe('WebCrawlRequest DTOs', () => {
  describe('WebCrawlRequestHeaderDto', () => {
    it('should validate valid header data', async () => {
      const headerData = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: new Date().toISOString(),
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlation_id: 'corr-123',
        source: 'task-manager',
        version: '1.0.0',
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid UUID', async () => {
      const headerData = {
        task_id: 'invalid-uuid',
        timestamp: new Date().toISOString(),
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('WebCrawlRequestBodyDto', () => {
    it('should validate valid body data', async () => {
      const bodyData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(0);
    });
  });

  describe('WebCrawlRequestMessageDto', () => {
    it('should validate complete message', async () => {
      const message = plainToClass(WebCrawlRequestMessageDto, {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date().toISOString(),
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      });

      const errors = await validate(message);
      expect(errors).toHaveLength(0);
    });
  });
});
```

## Potential Issues and Mitigations

### 1. Validation Performance

**Issue**: Complex validation might impact message processing performance
**Mitigation**: Use efficient validation rules and caching where appropriate

### 2. UUID Format Variations

**Issue**: Different UUID formats might be used
**Mitigation**: Support standard UUID format and provide clear error messages

### 3. URL Validation Edge Cases

**Issue**: Complex URLs might fail validation
**Mitigation**: Use robust URL validation and provide fallback options

### 4. Email Validation Strictness

**Issue**: Very strict email validation might reject valid emails
**Mitigation**: Use balanced email validation that catches obvious errors

### 5. Trace Context

**Issue**: Trace context needs to be propagated consistently
**Mitigation**: Carry trace context fields in headers (traceparent, tracestate, correlation_id)

## Success Criteria

- [ ] Web crawl request DTOs validate correctly with class-validator
- [ ] UUID validation works for standard UUID format
- [ ] Email validation catches invalid emails
- [ ] URL validation works for various URL formats
- [ ] Trace context fields are carried in headers (traceparent, tracestate, correlation_id)
- [ ] All unit tests pass
- [ ] Type safety is maintained
- [ ] Error messages are clear and helpful

## Dependencies

- Job 03: Kafka Topic Configuration & Logger Enum
- class-validator library
- class-transformer library
- Existing DTO structure
- TypeScript configuration

## Notes

- Use `kafkaTopicConfig.webCrawlRequest` for the outbound topic when publishing.
- Only use DB-generated `task_id` in outbound headers; never accept a client-provided id for new tasks.
- Infrastructure layer DTOs are independent of API layer DTOs
- Trace context includes standard fields (traceparent, tracestate, correlation_id, source, version)
- Must be completed before Kafka publisher implementation
- Validation should be comprehensive to prevent runtime issues
- API layer DTOs are handled in a separate job (Job 05)
- Clear separation between infrastructure and API layer concerns
