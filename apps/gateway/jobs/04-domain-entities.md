# Job 4: Domain Entities

## Objective
Create domain entities for web crawl requests with proper validation, status management, and business logic encapsulation.

## Prerequisites
- Job 3: OpenTelemetry Setup completed
- Basic project structure in place
- Configuration management working

## Inputs
- Clean architecture structure
- TypeScript configuration
- Business requirements for web crawl requests

## Detailed Implementation Steps

### Step 1: Create WebCrawlRequest Entity
```typescript
// src/domain/entities/web-crawl-request.entity.ts
export class WebCrawlRequest {
  public readonly id: string;
  public readonly userEmail: string;
  public readonly query: string;
  public readonly originalUrl: string;
  public readonly createdAt: Date;
  public status: WebCrawlRequestStatus;

  // Factory method
  static create(userEmail: string, query: string, originalUrl: string): WebCrawlRequest

  // Status transition methods
  markAsSubmitted(): WebCrawlRequest
  markAsProcessing(): WebCrawlRequest
  markAsCompleted(): WebCrawlRequest
  markAsFailed(): WebCrawlRequest

  // Business logic methods
  isFinal(): boolean
  isInProgress(): boolean
  toJSON(): object
  static fromJSON(data: object): WebCrawlRequest
}
```

### Step 2: Create Status Enum
```typescript
export enum WebCrawlRequestStatus {
  CREATED = 'created',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### Step 3: Add Validation Rules
- Email format validation
- URL format validation
- Query length limits (1-1000 characters)
- Status transition validation

### Step 4: Create Index Export
```typescript
// src/domain/entities/index.ts
export * from './web-crawl-request.entity';
```

## Outputs
- `src/domain/entities/web-crawl-request.entity.ts`
- `src/domain/entities/index.ts`
- Proper business logic encapsulation
- Status management system

## Testing Criteria

### Unit Tests
- [ ] Entity creation with valid data
- [ ] Entity creation with invalid data (should throw)
- [ ] Status transitions work correctly
- [ ] Invalid status transitions are prevented
- [ ] Business logic methods return correct values
- [ ] JSON serialization/deserialization works
- [ ] Immutability constraints are enforced

### Validation Tests
- [ ] Email validation works correctly
- [ ] URL validation works correctly
- [ ] Query length validation works
- [ ] Required fields validation works

### Business Logic Tests
- [ ] `isFinal()` returns true for completed/failed
- [ ] `isInProgress()` returns true for processing
- [ ] Status transitions follow business rules
- [ ] Entity state remains consistent

## Performance Requirements
- Entity creation: < 1ms
- Status transitions: < 0.5ms
- Validation: < 2ms
- JSON operations: < 1ms

## Error Handling
- Invalid email format → throw ValidationError
- Invalid URL format → throw ValidationError
- Empty required fields → throw ValidationError
- Invalid status transitions → throw BusinessLogicError
- Malformed JSON → throw SerializationError

## Success Criteria
- [ ] All entities created correctly
- [ ] All unit tests pass
- [ ] Validation works as expected
- [ ] Status management is robust
- [ ] Performance requirements met
- [ ] Error handling comprehensive
- [ ] Code follows domain-driven design principles
- [ ] No external dependencies in domain layer

## Rollback Plan
If implementation fails:
1. Remove all files created in this job
2. Revert any changes to existing files
3. Document the failure reason
4. Fix issues before proceeding

## Notes
- Keep domain entities pure (no external dependencies)
- Ensure immutability where appropriate
- Follow domain-driven design principles
- Status transitions should be explicit and validated
