# Job 9: API DTOs

## Objective
Create DTOs with comprehensive validation for REST API using class-validator decorators, ensuring type safety and data integrity for all request/response objects.

## Prerequisites
- Job 8: Metrics implementation completed
- Application services available
- class-validator and class-transformer configured

## Inputs
- DTO validation rules from repository guidelines
- Business validation requirements
- REST API specifications

## Detailed Implementation Steps

### Step 1: Create Web Crawl Request DTO
```typescript
// src/api/rest/dtos/web-crawl-request.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for web crawl request
 * Validates incoming web crawl request data
 */
export class WebCrawlRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  userEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  query: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(2048)
  originalUrl: string;
}

export type WebCrawlRequestDtoType = WebCrawlRequestDto;
```

### Step 2: Create Web Crawl Response DTO
```typescript
// src/api/rest/dtos/web-crawl-response.dto.ts
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for web crawl response
 * Response sent back to the client after processing a web crawl request
 */
export class WebCrawlResponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  status: string;
}

export type WebCrawlResponseDtoType = WebCrawlResponseDto;
```

### Step 3: Create Error Response DTO
```typescript
// src/api/rest/dtos/error-response.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';

export class ErrorResponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  error: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  details?: string[];

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  path: string;
}
```

### Step 4: Create Health Check DTO
```typescript
// src/api/rest/dtos/health-check.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';

export class HealthCheckResponseDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsOptional()
  @IsObject()
  checks?: Record<string, any>;
}
```

### Step 5: Update Validation Utilities
```typescript
// src/common/utils/validation.ts
// Ensure reflect-metadata is imported
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export async function validateDto<T>(
  dtoClass: new () => T,
  data: any
): Promise<ValidationResult<T>> {
  const dto = plainToClass(dtoClass, data);
  const errors = await validate(dto as object);
  
  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      Object.values(error.constraints || {}).join(', ')
    );
    
    return {
      isValid: false,
      data: null,
      errors: errors,
      errorMessage: errorMessages.join('; ')
    };
  }
  
  return {
    isValid: true,
    data: dto,
    errors: [],
    errorMessage: null
  };
}

export function createValidationMiddleware<T>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await validateDto(dtoClass, req.body);
    
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: result.errorMessage,
        details: result.errors
      });
    }
    
    req.body = result.data;
    next();
  };
}
```

### Step 6: Create Index Export
```typescript
// src/api/rest/dtos/index.ts
export * from './web-crawl-request.dto';
export * from './web-crawl-response.dto';
export * from './error-response.dto';
export * from './health-check.dto';
```

## Outputs
- `src/api/rest/dtos/web-crawl-request.dto.ts`
- `src/api/rest/dtos/web-crawl-response.dto.ts`
- `src/api/rest/dtos/error-response.dto.ts`
- `src/api/rest/dtos/health-check.dto.ts`
- `src/api/rest/dtos/index.ts`
- Updated validation utilities
- Comprehensive input validation

## Testing Criteria

### Validation Tests
- [ ] Valid email formats pass validation
- [ ] Invalid email formats fail validation
- [ ] Valid URLs pass validation
- [ ] Invalid URLs fail validation
- [ ] Query length limits enforced
- [ ] Required fields validation works
- [ ] Empty/null values handled correctly

### DTO Tests
- [ ] DTO creation with valid data
- [ ] DTO creation with invalid data
- [ ] Type conversion works correctly
- [ ] Decorator functionality works
- [ ] Error message formatting
- [ ] Class transformation works

### Middleware Tests
- [ ] Validation middleware integration
- [ ] Error response format
- [ ] Valid request passthrough
- [ ] Invalid request rejection
- [ ] Performance under load

### Error Handling Tests
- [ ] Validation error messages are clear
- [ ] Multiple validation errors handled
- [ ] Error response structure correct
- [ ] HTTP status codes appropriate

## Performance Requirements
- Validation time: < 5ms per request
- Memory usage: < 1MB per validation
- Concurrent validation support
- No memory leaks in validation

## Error Handling
- Invalid email → 400 with specific message
- Invalid URL → 400 with specific message
- Missing required fields → 400 with field list
- Query too long → 400 with length limits
- Malformed JSON → 400 with parse error

## Success Criteria
- [ ] All DTOs created with proper validation
- [ ] class-validator decorators working
- [ ] Validation middleware functional
- [ ] Error responses properly formatted
- [ ] Performance requirements met
- [ ] All validation tests pass
- [ ] Type safety maintained
- [ ] Integration with handlers works

## Rollback Plan
If implementation fails:
1. Disable validation middleware
2. Use simple type checking
3. Document validation issues
4. Fix decorator configuration

## Notes
- Ensure reflect-metadata is imported first
- Use consistent validation messages
- Follow repository DTO validation rules
- Add JSDoc for complex validation rules
- Test edge cases thoroughly
- Ensure TypeScript compatibility
- Consider internationalization for error messages
- Performance test validation under load
