# Job J5: DTO Validation Standardization

**Status**: ⏳ Pending  
**Priority**: 🟡 Medium  
**Dependencies**: J2 (Logger Core Enrichment)  
**Estimated Time**: 2-3 hours

## Summary
Add consistent W3C trace header validation across all Kafka DTOs following repository validation rules.

## Files to Modify
1. **`src/api/kafka/dtos/headers/base-web-crawl-header.dto.ts`**
2. **`src/api/kafka/dtos/headers/web-crawl-new-task-header.dto.ts`**
3. **`src/api/kafka/dtos/headers/web-crawl-task-update-header.dto.ts`**

## Detailed Changes

### J5.1: Update Base Header DTO
**File**: `src/api/kafka/dtos/headers/base-web-crawl-header.dto.ts`  
**Changes**:
```typescript
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class BaseWebCrawlHeaderDto {
  @IsOptional()
  @IsString()
  @Matches(/^00-[a-f0-9]{32}-[a-f0-9]{16}-[0-9a-f]{2}$/i, {
    message: 'traceparent must be in W3C format: 00-<traceId>-<spanId>-<flags>'
  })
  traceparent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512, {
    message: 'tracestate must not exceed 512 characters'
  })
  tracestate?: string;

  // ... existing fields
}
```

### J5.2: Update Derived Header DTOs
**Files**: 
- `src/api/kafka/dtos/headers/web-crawl-new-task-header.dto.ts`
- `src/api/kafka/dtos/headers/web-crawl-task-update-header.dto.ts`

**Changes**: Ensure they extend the updated base DTO and inherit validation.

## Benefits
- **Consistent validation**: All DTOs follow the same validation rules
- **W3C compliance**: Proper format validation for trace headers
- **Error handling**: Clear error messages for invalid formats
- **Optional support**: Trace headers are optional but validated when present

## Tests
- [ ] Update DTO validation tests
- [ ] Test optional trace header acceptance
- [ ] Test invalid format rejection
- [ ] Test W3C format validation

## Checklist
- [ ] Update base header DTO with validation decorators
- [ ] Add W3C format validation for traceparent
- [ ] Add length validation for tracestate
- [ ] Ensure derived DTOs inherit validation
- [ ] Update DTO validation tests
- [ ] Test valid and invalid trace header formats
- [ ] Update status to ✅ Completed

## Notes
- This job depends on J2 (logger enrichment) for trace context
- W3C format validation ensures proper trace header structure
- Optional validation allows backward compatibility
- Clear error messages help with debugging
