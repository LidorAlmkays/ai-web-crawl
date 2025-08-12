# J1: Error Handling Architecture for Non-Existing Task Processing

## Overview

Implement comprehensive error handling for cases where a request to update a task status (error or complete) is made for a non-existing task ID, but there exists a task with the same user email and user query in a different state.

## Problem Statement

When the system receives a request to update a task status (error or complete) for a task ID that doesn't exist, but there's a task in the database with the same user email and user query in a different state, we need to:

1. Detect this scenario
2. Log appropriate error messages
3. Prepare for future notification mechanisms (Kafka topic TBD)

## Business Requirements

### Core Requirements

- **Detection**: Identify when a task ID doesn't exist but matching user data exists
- **Logging**: Log detailed error information in the application layer
- **Extensibility**: Design for future notification mechanisms (Kafka, webhooks, etc.)
- **Data Integrity**: Ensure no data corruption or unintended updates

### Error Scenarios to Handle

1. **Task ID Not Found**: Requested task ID doesn't exist in database
2. **Matching User Data Found**: Task with same user_email and user_query exists but different ID
3. **State Mismatch**: Existing task is in a different state than expected
4. **Multiple Matches**: Multiple tasks with same user data exist

## Technical Architecture

### 1. Domain Layer

- **Error Types**: Define specific error types for different scenarios
- **Validation Logic**: Business rules for task existence and matching
- **Error Context**: Structured error information

### 2. Application Layer

- **Error Detection Service**: Core logic for identifying error scenarios
- **Error Logging Service**: Centralized error logging with context
- **Notification Port**: Interface for future notification mechanisms
- **Error Handling Strategy**: Retry, fail-fast, or graceful degradation

### 3. Infrastructure Layer

- **Database Queries**: Efficient queries to find matching tasks
- **Error Repository**: Store error events for analysis
- **Notification Adapters**: Future implementations for different notification channels

### 4. API Layer

- **Error Response Format**: Consistent error response structure
- **HTTP Status Codes**: Appropriate status codes for different error types
- **Error Context**: Include relevant information in error responses

## Implementation Plan

### Phase 1: Core Error Detection

1. **Domain Types**: Define error types and validation rules
2. **Database Queries**: Implement queries to find matching tasks
3. **Application Service**: Core error detection logic
4. **Error Logging**: Structured logging with context

### Phase 2: Error Handling Integration

1. **API Integration**: Integrate error handling into existing endpoints
2. **Response Formatting**: Consistent error response structure
3. **Testing**: Comprehensive test coverage for error scenarios

### Phase 3: Future Extensibility

1. **Notification Port**: Define interface for future notification mechanisms
2. **Configuration**: Make error handling configurable
3. **Monitoring**: Add metrics for error scenarios

## Test Criteria

### Unit Tests

- [ ] Error detection logic for non-existing task IDs
- [ ] Matching logic for user email and query
- [ ] Error logging with proper context
- [ ] Database query efficiency

### Integration Tests

- [ ] End-to-end error scenario handling
- [ ] API response format validation
- [ ] Error logging verification
- [ ] Database transaction integrity

### Performance Tests

- [ ] Error detection query performance
- [ ] Logging performance under load
- [ ] Memory usage during error scenarios

## Success Metrics

- [ ] All error scenarios properly detected and logged
- [ ] No false positives in error detection
- [ ] Consistent error response format
- [ ] Extensible architecture for future notification mechanisms
- [ ] Comprehensive test coverage (>90%)

## Files to Create/Modify

### New Files

- `src/domain/types/error.types.ts` - Error type definitions
- `src/domain/entities/error-context.entity.ts` - Error context entity
- `src/application/error-detection/ports/IErrorDetectionPort.ts` - Error detection port
- `src/application/error-detection/services/ErrorDetectionService.ts` - Core error detection logic
- `src/application/error-logging/ports/IErrorLoggingPort.ts` - Error logging port
- `src/application/error-logging/services/ErrorLoggingService.ts` - Error logging service
- `src/infrastructure/persistence/postgres/schema/09-error-handling-functions.sql` - Database functions
- `src/infrastructure/persistence/postgres/adapters/ErrorDetectionAdapter.ts` - Database adapter

### Modified Files

- `src/application/services/webscrape.service.ts` - Integrate error detection
- `src/api/kafka/handlers/task-status/complete-task.handler.ts` - Add error handling
- `src/api/kafka/handlers/task-status/error-task.handler.ts` - Add error handling
- `src/application/services/application.factory.ts` - Wire up error services

## Dependencies

- No new external dependencies required
- Uses existing logging infrastructure
- Leverages existing database connection pool
- Integrates with current Kafka message processing

## Risk Assessment

- **Low Risk**: Core error detection logic
- **Medium Risk**: Database query performance with large datasets
- **Low Risk**: Integration with existing services
- **Low Risk**: Future notification mechanism extensibility

## Next Steps

1. Review and approve this architecture
2. Begin implementation with Phase 1
3. Create detailed sub-jobs for each phase
4. Set up testing framework for error scenarios
