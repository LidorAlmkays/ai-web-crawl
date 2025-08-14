# Job 04: Web Crawl Request DTOs - Infrastructure Layer

## Status

**NOT_COMPLETED**

## Overview

Create DTOs for web crawl request messages to ensure proper validation and type safety when publishing web crawl requests to Kafka topics. This job focuses on infrastructure layer DTOs for web crawl requests.

## Objectives

- Create header and body DTOs for web crawl requests
- Implement comprehensive validation using class-validator
- Ensure trace context propagation
- Maintain type safety throughout the workflow

## Files to Create/Modify

### New Files

- `src/api/kafka/dtos/web-crawl-request.dto.ts` - Web crawl request DTOs
- `src/api/kafka/dtos/__tests__/web-crawl-request.dto.spec.ts` - Unit tests

### Files to Modify

- `src/api/kafka/dtos/index.ts` - Export new DTOs

## Detailed Implementation

### 1. Create Web Crawl Request DTOs

**File**: `src/api/kafka/dtos/web-crawl-request.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsUrl, IsOptional, IsUUID, MinLength, MaxLength, IsEmail, Matches, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for web crawl request message headers
 * Contains task_id, timestamp, and trace context information
 * Used for outgoing web crawl requests to Kafka (infrastructure layer)
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
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;
}

/**
 * DTO for web crawl request message body
 * Contains the essential web crawling parameters
 *
 * NOTE: Removed overkill parameters:
 * - description: Not needed for core functionality
 * - priority: Not needed for core functionality
 * - additional_parameters: Not needed for core functionality
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

  /**
   * Validate the complete message
   */
  static validate(message: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Validate headers
      if (!message.headers) {
        errors.push('Headers are required');
      } else {
        const headerErrors = this.validateHeaders(message.headers);
        errors.push(...headerErrors);
      }

      // Validate body
      if (!message.body) {
        errors.push('Body is required');
      } else {
        const bodyErrors = this.validateBody(message.body);
        errors.push(...bodyErrors);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return {
        isValid: false,
        errors,
      };
    }
  }

  /**
   * Validate headers specifically
   */
  private static validateHeaders(headers: any): string[] {
    const errors: string[] = [];

    if (!headers.task_id) {
      errors.push('task_id is required in headers');
    } else if (!this.isValidUUID(headers.task_id)) {
      errors.push('task_id must be a valid UUID');
    }

    if (headers.user_email && !this.isValidEmail(headers.user_email)) {
      errors.push('user_email in headers must be a valid email');
    }

    if (headers.base_url && !this.isValidUrl(headers.base_url)) {
      errors.push('base_url in headers must be a valid URL');
    }

    return errors;
  }

  /**
   * Validate body specifically
   */
  private static validateBody(body: any): string[] {
    const errors: string[] = [];

    if (!body.user_email) {
      errors.push('user_email is required in body');
    } else if (!this.isValidEmail(body.user_email)) {
      errors.push('user_email must be a valid email');
    }

    if (!body.user_query) {
      errors.push('user_query is required in body');
    } else if (body.user_query.length > 1000) {
      errors.push('user_query must not exceed 1000 characters');
    }

    if (!body.base_url) {
      errors.push('base_url is required in body');
    } else if (!this.isValidUrl(body.base_url)) {
      errors.push('base_url must be a valid URL');
    }

    return errors;
  }

  /**
   * Validate UUID format
   */
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a web crawl request message from task data
   */
  static createFromTaskData(
    taskId: string,
    userEmail: string,
    userQuery: string,
    baseUrl: string,
    traceContext?: {
      traceparent?: string;
      tracestate?: string;
      correlationId?: string;
    }
  ): WebCrawlRequestMessageDto {
    return {
      headers: {
        task_id: taskId,
        timestamp: new Date().toISOString(),
        traceparent: traceContext?.traceparent,
        tracestate: traceContext?.tracestate,
        correlation_id: traceContext?.correlationId,
        source: 'task-manager',
        version: '1.0.0',
      },
      body: {
        user_email: userEmail,
        user_query: userQuery,
        base_url: baseUrl,
      },
    };
  }

  /**
   * Extract trace context from message
   */
  static extractTraceContext(message: WebCrawlRequestMessageDto): {
    traceId: string | null;
    spanId: string | null;
    traceparent: string | null;
    tracestate: string | null;
  } {
    const traceparent = message.headers.traceparent;
    let traceId: string | null = null;
    let spanId: string | null = null;

    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length >= 3) {
        traceId = parts[1];
        spanId = parts[2];
      }
    }

    return {
      traceId,
      spanId,
      traceparent: traceparent || null,
      tracestate: message.headers.tracestate || null,
    };
  }
}

// Export type aliases for convenience
export type WebCrawlRequestHeaderDtoType = WebCrawlRequestHeaderDto;
export type WebCrawlRequestBodyDtoType = WebCrawlRequestBodyDto;
export type WebCrawlRequestMessageDtoType = WebCrawlRequestMessageDto;
```

### 2. Update DTOs Index

**File**: `src/api/kafka/dtos/index.ts`

```typescript
// ... existing exports ...

// Web Crawl Request DTOs
export { WebCrawlRequestHeaderDto, WebCrawlRequestBodyDto, WebCrawlRequestMessageDto } from './web-crawl-request.dto';

export type { WebCrawlRequestHeaderDtoType, WebCrawlRequestBodyDtoType, WebCrawlRequestMessageDtoType } from './web-crawl-request.dto';
```

### 3. Create Unit Tests

**File**: `src/api/kafka/dtos/__tests__/web-crawl-request.dto.spec.ts`

```typescript
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { WebCrawlRequestHeaderDto, WebCrawlRequestBodyDto, WebCrawlRequestMessageDto } from '../web-crawl-request.dto';

describe('WebCrawlRequest DTOs', () => {
  describe('WebCrawlRequestHeaderDto', () => {
    it('should validate valid header data', async () => {
      const headerData = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
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
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });

    it('should reject empty task_id', async () => {
      const headerData = {
        task_id: '',
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should accept optional fields', async () => {
      const headerData = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });
  });

  describe('WebCrawlRequestBodyDto', () => {
    it('should validate valid body data', async () => {
      const bodyData = {
        user_email: 'test@example.com',
        user_query: 'Find product information',
        base_url: 'https://example.com',
        description: 'Test description',
        priority: 'high',
        additional_parameters: '{"depth": 2}',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid email', async () => {
      const bodyData = {
        user_email: 'invalid-email',
        user_query: 'Test query',
        base_url: 'https://example.com',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEmail).toBeDefined();
    });

    it('should reject invalid URL', async () => {
      const bodyData = {
        user_email: 'test@example.com',
        user_query: 'Test query',
        base_url: 'invalid-url',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUrl).toBeDefined();
    });

    it('should reject empty user_query', async () => {
      const bodyData = {
        user_email: 'test@example.com',
        user_query: '',
        base_url: 'https://example.com',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should reject user_query that is too long', async () => {
      const bodyData = {
        user_email: 'test@example.com',
        user_query: 'a'.repeat(1001),
        base_url: 'https://example.com',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });
  });

  describe('WebCrawlRequestMessageDto', () => {
    it('should validate complete message', () => {
      const messageData = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message without headers', () => {
      const messageData = {
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Headers are required');
    });

    it('should reject message without body', () => {
      const messageData = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
        },
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Body is required');
    });

    it('should reject message with invalid task_id', () => {
      const messageData = {
        headers: {
          task_id: 'invalid-uuid',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('task_id must be a valid UUID');
    });

    it('should reject message with invalid email', () => {
      const messageData = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
        },
        body: {
          user_email: 'invalid-email',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('user_email must be a valid email');
    });
  });

  describe('WebCrawlRequestMessageDto.createFromTaskData', () => {
    it('should create valid message from task data', () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const userEmail = 'test@example.com';
      const userQuery = 'Find product information';
      const baseUrl = 'https://example.com';
      const traceContext = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlationId: 'corr-123',
      };

      const message = WebCrawlRequestMessageDto.createFromTaskData(taskId, userEmail, userQuery, baseUrl, traceContext);

      expect(message.headers.task_id).toBe(taskId);
      expect(message.headers.traceparent).toBe(traceContext.traceparent);
      expect(message.headers.tracestate).toBe(traceContext.tracestate);
      expect(message.headers.correlation_id).toBe(traceContext.correlationId);
      expect(message.headers.source).toBe('task-manager');
      expect(message.headers.version).toBe('1.0.0');

      expect(message.body.user_email).toBe(userEmail);
      expect(message.body.user_query).toBe(userQuery);
      expect(message.body.base_url).toBe(baseUrl);
    });

    it('should create message without trace context', () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const userEmail = 'test@example.com';
      const userQuery = 'Find product information';
      const baseUrl = 'https://example.com';

      const message = WebCrawlRequestMessageDto.createFromTaskData(taskId, userEmail, userQuery, baseUrl);

      expect(message.headers.task_id).toBe(taskId);
      expect(message.headers.traceparent).toBeUndefined();
      expect(message.headers.tracestate).toBeUndefined();
      expect(message.headers.correlation_id).toBeUndefined();
      expect(message.headers.source).toBe('task-manager');
      expect(message.headers.version).toBe('1.0.0');

      expect(message.body.user_email).toBe(userEmail);
      expect(message.body.user_query).toBe(userQuery);
      expect(message.body.base_url).toBe(baseUrl);
    });
  });

  describe('WebCrawlRequestMessageDto.extractTraceContext', () => {
    it('should extract trace context from message', () => {
      const message: WebCrawlRequestMessageDto = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          tracestate: 'test=value',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const traceContext = WebCrawlRequestMessageDto.extractTraceContext(message);

      expect(traceContext.traceId).toBe('1234567890abcdef1234567890abcdef');
      expect(traceContext.spanId).toBe('1234567890abcdef');
      expect(traceContext.traceparent).toBe('00-1234567890abcdef1234567890abcdef-1234567890abcdef-01');
      expect(traceContext.tracestate).toBe('test=value');
    });

    it('should handle message without trace context', () => {
      const message: WebCrawlRequestMessageDto = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const traceContext = WebCrawlRequestMessageDto.extractTraceContext(message);

      expect(traceContext.traceId).toBeNull();
      expect(traceContext.spanId).toBeNull();
      expect(traceContext.traceparent).toBeNull();
      expect(traceContext.tracestate).toBeNull();
    });

    it('should handle malformed traceparent', () => {
      const message: WebCrawlRequestMessageDto = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          traceparent: 'invalid-format',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const traceContext = WebCrawlRequestMessageDto.extractTraceContext(message);

      expect(traceContext.traceId).toBeNull();
      expect(traceContext.spanId).toBeNull();
      expect(traceContext.traceparent).toBe('invalid-format');
      expect(traceContext.tracestate).toBeNull();
    });

    it('should handle partial trace context', () => {
      const message: WebCrawlRequestMessageDto = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
          // Missing tracestate and correlation_id
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const traceContext = WebCrawlRequestMessageDto.extractTraceContext(message);

      expect(traceContext.traceId).toBe('1234567890abcdef1234567890abcdef');
      expect(traceContext.spanId).toBe('1234567890abcdef');
      expect(traceContext.traceparent).toBe('00-1234567890abcdef1234567890abcdef-1234567890abcdef-01');
      expect(traceContext.tracestate).toBeNull();
      expect(traceContext.correlationId).toBeNull();
    });

    it('should handle empty string values in trace context', () => {
      const message: WebCrawlRequestMessageDto = {
        headers: {
          task_id: '123e4567-e89b-12d3-a456-426614174000',
          traceparent: '',
          tracestate: '',
          correlation_id: '',
        },
        body: {
          user_email: 'test@example.com',
          user_query: 'Find product information',
          base_url: 'https://example.com',
        },
      };

      const traceContext = WebCrawlRequestMessageDto.extractTraceContext(message);

      expect(traceContext.traceId).toBeNull();
      expect(traceContext.spanId).toBeNull();
      expect(traceContext.traceparent).toBe('');
      expect(traceContext.tracestate).toBe('');
      expect(traceContext.correlationId).toBe('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null values in message', () => {
      const messageData = {
        headers: null,
        body: null,
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Headers are required');
      expect(result.errors).toContain('Body is required');
    });

    it('should handle undefined values in message', () => {
      const messageData = {
        headers: undefined,
        body: undefined,
      };

      const result = WebCrawlRequestMessageDto.validate(messageData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Headers are required');
      expect(result.errors).toContain('Body is required');
    });

    it('should handle very long user queries', () => {
      const bodyData = {
        user_email: 'test@example.com',
        user_query: 'a'.repeat(1000), // Exactly at the limit
        base_url: 'https://example.com',
      };

      const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
      const errors = await validate(body);

      expect(errors).toHaveLength(0);
    });

    it('should handle complex URLs', () => {
      const complexUrls = ['https://example.com/path?param=value&other=123', 'https://user:pass@example.com:8080/path#fragment', 'https://subdomain.example.com/path/to/resource', 'https://example.com/path/with/special/chars/!@#$%^&*()'];

      complexUrls.forEach((url) => {
        const bodyData = {
          user_email: 'test@example.com',
          user_query: 'Test query',
          base_url: url,
        };

        const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
        return validate(body).then((errors) => {
          expect(errors).toHaveLength(0);
        });
      });
    });

    it('should handle various email formats', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org', '123@numbers.com', 'user-name@domain.com', 'user_name@domain.com'];

      validEmails.forEach((email) => {
        const bodyData = {
          user_email: email,
          user_query: 'Test query',
          base_url: 'https://example.com',
        };

        const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
        return validate(body).then((errors) => {
          expect(errors).toHaveLength(0);
        });
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = ['invalid-email', '@example.com', 'user@', 'user@.com', 'user..name@example.com', 'user@example..com', 'user name@example.com', 'user@example com'];

      invalidEmails.forEach((email) => {
        const bodyData = {
          user_email: email,
          user_query: 'Test query',
          base_url: 'https://example.com',
        };

        const body = plainToClass(WebCrawlRequestBodyDto, bodyData);
        return validate(body).then((errors) => {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].constraints?.isEmail).toBeDefined();
        });
      });
    });

    it('should handle timestamp validation', async () => {
      const headerData = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-12-01T10:30:00.000Z',
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid timestamp format', async () => {
      const headerData = {
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: 'invalid-date',
      };

      const header = plainToClass(WebCrawlRequestHeaderDto, headerData);
      const errors = await validate(header);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isDateString).toBeDefined();
    });

    it('should handle createFromTaskData with all optional parameters', () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const userEmail = 'test@example.com';
      const userQuery = 'Find product information';
      const baseUrl = 'https://example.com';
      const traceContext = {
        traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
        tracestate: 'test=value',
        correlationId: 'corr-123',
      };

      const message = WebCrawlRequestMessageDto.createFromTaskData(taskId, userEmail, userQuery, baseUrl, traceContext);

      // Verify timestamp is set
      expect(message.headers.timestamp).toBeDefined();
      expect(new Date(message.headers.timestamp).getTime()).toBeGreaterThan(0);

      // Verify all other fields
      expect(message.headers.task_id).toBe(taskId);
      expect(message.headers.traceparent).toBe(traceContext.traceparent);
      expect(message.headers.tracestate).toBe(traceContext.tracestate);
      expect(message.headers.correlation_id).toBe(traceContext.correlationId);
      expect(message.headers.source).toBe('task-manager');
      expect(message.headers.version).toBe('1.0.0');

      expect(message.body.user_email).toBe(userEmail);
      expect(message.body.user_query).toBe(userQuery);
      expect(message.body.base_url).toBe(baseUrl);
    });

    it('should handle createFromTaskData with minimal parameters', () => {
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const userEmail = 'test@example.com';
      const userQuery = 'Find product information';
      const baseUrl = 'https://example.com';

      const message = WebCrawlRequestMessageDto.createFromTaskData(taskId, userEmail, userQuery, baseUrl);

      // Verify timestamp is set
      expect(message.headers.timestamp).toBeDefined();
      expect(new Date(message.headers.timestamp).getTime()).toBeGreaterThan(0);

      // Verify required fields
      expect(message.headers.task_id).toBe(taskId);
      expect(message.headers.source).toBe('task-manager');
      expect(message.headers.version).toBe('1.0.0');

      expect(message.body.user_email).toBe(userEmail);
      expect(message.body.user_query).toBe(userQuery);
      expect(message.body.base_url).toBe(baseUrl);

      // Verify optional fields are undefined
      expect(message.headers.traceparent).toBeUndefined();
      expect(message.headers.tracestate).toBeUndefined();
      expect(message.headers.correlation_id).toBeUndefined();
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle rapid message creation', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const message = WebCrawlRequestMessageDto.createFromTaskData(`123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`, `user${i}@example.com`, `Query ${i}`, 'https://example.com');

        expect(message.headers.task_id).toBeDefined();
        expect(message.body.user_email).toBeDefined();
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent validation', async () => {
      const validationPromises = Array.from({ length: 100 }, (_, i) => {
        const messageData = {
          headers: {
            task_id: `123e4567-e89b-12d3-a456-426614174${i.toString().padStart(3, '0')}`,
            timestamp: new Date().toISOString(),
          },
          body: {
            user_email: `user${i}@example.com`,
            user_query: `Query ${i}`,
            base_url: 'https://example.com',
          },
        };

        return WebCrawlRequestMessageDto.validate(messageData);
      });

      const results = await Promise.all(validationPromises);

      results.forEach((result) => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
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

### 5. Trace Context Extraction Failures

**Issue**: Malformed trace context might cause extraction failures
**Mitigation**: Graceful handling of malformed trace context

## Success Criteria

- [ ] Web crawl request DTOs validate correctly with class-validator
- [ ] UUID validation works for standard UUID format
- [ ] Email validation catches invalid emails
- [ ] URL validation works for various URL formats
- [ ] Trace context extraction handles edge cases
- [ ] All unit tests pass
- [ ] Type safety is maintained
- [ ] Error messages are clear and helpful

## Dependencies

- Job 03: Kafka Topic Configuration & Logger Enum
- class-validator library
- class-transformer library
- Existing DTO structure
- TypeScript configuration

## Estimated Effort

- **Development**: 1 day
- **Testing**: 0.5 day
- **Total**: 1.5 days

## Notes

- This job provides the foundation for web crawl request DTOs (infrastructure layer)
- Infrastructure layer DTOs are independent of API layer DTOs
- Simplified DTO structure removes unnecessary complexity
- Trace context includes all standard fields (traceparent, tracestate, correlation_id, source, version)
- Removed overkill parameters: description, priority, additional_parameters
- Must be completed before Kafka publisher implementation
- Validation should be comprehensive to prevent runtime issues
- Trace context propagation is essential for observability
- API layer DTOs are handled in a separate job (Job 05)
- Clear separation between infrastructure and API layer concerns
