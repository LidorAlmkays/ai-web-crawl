# Job 1: Enhanced Error Handling and Logging 🚨 CRITICAL

## Status: ✅ COMPLETED

## Objective

Implement stacked error messages with full context chain and reduce log noise by moving routine operations to debug level. Show the complete error stack with data context while keeping production logs clean and focused on important events.

## Problem Analysis

### Current Issues

1. **Log Spam**: Too many routine operations logged at info level (factory creation, client initialization, etc.)
2. **Missing Error Context**: Error messages don't show the full error chain with data context
3. **Missing UUID Context**: Error messages don't include the task UUID for tracking
4. **Unclear Validation Errors**: DTO validation failures don't show specific field details
5. **No Actionable Guidance**: Errors don't tell you how to fix the issue
6. **Debug vs Production**: No distinction between development and production logging levels

### Example of Current Bad Logging

```
[level:INFO,service:Task Manager,timestamp:2025-08-10T10:46:06.300Z]:WebCrawlTaskManagerService initialized
[level:INFO,service:Task Manager,timestamp:2025-08-10T10:46:06.301Z]:Kafka client created
[level:INFO,service:Task Manager,timestamp:2025-08-10T10:46:06.302Z]:Factory initialized
[level:WARN,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:DTO validation failed
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:Validation failed for NewTaskHandler
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:Error processing message with NewTaskHandler
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.305Z]:Failed to process Kafka message
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.305Z]:Error processing message with TaskStatusRouterHandler
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.305Z]:Failed to process Kafka message
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.305Z]:Error processing Kafka message - offset will not be committed
```

### Desired Stacked Error Message

```
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:Kafka message processing failed - taskId: 051054b7-d89e-440f-b27d-61f091a02e32
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:  └─ NewTaskHandler: DTO validation failed
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:      └─ TaskStatusHeaderDto: field 'task_type', expected: 'web-crawl', received: 'new'
[level:ERROR,service:Task Manager,timestamp:2025-08-10T10:46:06.304Z]:          └─ Action: Update message header to use correct task_type value
```

## Sub-tasks

### 1. Create Stacked Error Handler

**Objective**: Implement error chain with context at each level.

**Implementation**:

- Create `StackedErrorHandler` class in `common/utils/`
- Implement `logStackedError()` method that includes:
  - UUID/taskId
  - Error chain with context at each level
  - Data context for each error level
  - Actionable guidance
- Show full error stack with indentation for clarity

**Files to Modify**:

- `apps/task-manager/src/common/utils/stacked-error-handler.ts` (new)
- `apps/task-manager/src/api/kafka/handlers/base-handler.ts`

### 2. Improve DTO Validation Error Messages

**Objective**: Show specific field failures with reasons and expected values.

**Implementation**:

- Enhance `validateDto()` function in `common/utils/validation.ts`
- Parse validation errors to extract:
  - Field name
  - Current value
  - Expected value/constraints
  - Specific validation rule that failed
- Format error message with actionable guidance

**Files to Modify**:

- `apps/task-manager/src/common/utils/validation.ts`

### 3. Add UUID Tracking to All Messages

**Objective**: Include UUID in every log message for easy tracking.

**Implementation**:

- Modify all handler methods to extract and include UUID
- Add correlation ID generation for message flow tracking
- Ensure UUID is included in all error, warning, and info messages

**Files to Modify**:

- `apps/task-manager/src/api/kafka/handlers/task-status/new-task.handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/complete-task.handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/error-task.handler.ts`

### 4. Implement Log Level Management

**Objective**: Move routine operations to debug level and configure environment-based logging.

**Implementation**:

- Move routine operations to debug level:
  - Factory initialization
  - Client creation
  - Service initialization
  - Internal method calls
- Configure debug mode for development only
- Define important events to log in production:
  - Service startup/shutdown
  - Database connections
  - Kafka connections and topic subscriptions
  - Message processing events (with UUID)
  - Error events with full context

**Files to Modify**:

- `apps/task-manager/src/common/utils/logger.ts`
- `apps/task-manager/src/app.ts`
- `apps/task-manager/src/common/clients/kafka-client.ts`
- `apps/task-manager/src/infrastructure/persistence/postgres/postgres.factory.ts`

### 5. Define Important Events to Log

**Objective**: Establish clear guidelines for what should be logged in production vs development.

**Implementation**:

- **Production Logs (INFO level)**:
  - Service startup and shutdown
  - Database connections established
  - Kafka connections and topic subscriptions
  - Message processing events (with UUID)
  - Error events with full context
- **Development Logs (DEBUG level)**:
  - All routine operations
  - Factory initializations
  - Client creations
  - Internal method calls
  - Detailed validation steps

**Files to Modify**:

- All service and handler files
- Configuration files
- Application startup files

## Success Criteria

- [ ] **Stacked Error Messages**: Show full error chain with context at each level
- [ ] **UUID Included**: Every error message includes the relevant UUID
- [ ] **Specific Validation Details**: Show field name, current value, expected value
- [ ] **Actionable Guidance**: Clear instructions on how to fix the issue
- [ ] **Routine Operations in Debug**: Move factory/client creation to debug level
- [ ] **Important Events in Production**: Only log critical events in production
- [ ] **Debug Mode for Development**: Full logging only in development environment
- [ ] **Easy Debugging**: Root cause can be identified from stacked error messages

## Implementation Steps

### Step 1: Create Stacked Error Handler

1. Create `stacked-error-handler.ts` with error chain logging
2. Implement error context tracking
3. Add UUID extraction utilities

### Step 2: Enhance Validation Error Messages

1. Modify `validateDto()` to parse validation errors
2. Extract field-specific error details
3. Format actionable error messages

### Step 3: Implement Log Level Management

1. Move routine operations to debug level
2. Configure environment-based logging
3. Define important events for production

### Step 4: Update Handlers and Services

1. Replace multiple error logs with stacked error
2. Add UUID tracking to all handlers
3. Move routine operations to debug level

### Step 5: Testing and Validation

1. Test various error scenarios
2. Verify stacked error messages work correctly
3. Validate log levels in different environments

## Files to Create/Modify

### New Files

- `apps/task-manager/src/common/utils/stacked-error-handler.ts`
- `apps/task-manager/src/common/types/error-context.type.ts`

### Modified Files

- `apps/task-manager/src/common/utils/validation.ts`
- `apps/task-manager/src/common/utils/logger.ts`
- `apps/task-manager/src/api/kafka/handlers/base-handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/new-task.handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/complete-task.handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/error-task.handler.ts`
- `apps/task-manager/src/app.ts`
- `apps/task-manager/src/common/clients/kafka-client.ts`
- `apps/task-manager/src/infrastructure/persistence/postgres/postgres.factory.ts`

## Testing Strategy

### Unit Tests

- Test stacked error handler with various error types
- Test validation error parsing
- Test UUID extraction and tracking
- Test log level management

### Integration Tests

- Test complete error flow from Kafka to error message
- Verify stacked error messages work correctly
- Test error message format and content
- Test log levels in different environments

### Manual Testing

- Send invalid Kafka messages and verify error messages
- Check that UUID is included in all error messages
- Verify actionable guidance is provided
- Test log levels in development vs production

## Expected Outcome

After completion, the system will have:

1. **Stacked Error Messages**: Show full error chain with context at each level
2. **Clear Context**: Include UUID, specific field details, and actionable guidance
3. **Actionable Information**: Tell you exactly what needs to be fixed
4. **Trackable**: Include UUID for easy message flow tracking
5. **Clean Production Logs**: Only important events logged in production
6. **Rich Development Logs**: Full debug information in development mode
7. **Environment-Aware**: Different log levels for different environments

## Timeline

**Duration**: 3 days
**Priority**: High (Critical for debugging)

## Dependencies

- None (this is the foundation for other jobs)
