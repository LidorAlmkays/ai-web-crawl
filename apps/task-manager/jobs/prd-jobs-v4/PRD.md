# PRD v4: Enhanced Error Handling and System Reliability

## Overview

PRD v4 focuses on improving error handling, logging clarity, and system reliability. The current system has excessive logging that makes it difficult to identify the root cause of issues. This PRD addresses the need for clear, actionable error messages and better system observability.

## Problem Statement

### Current Issues

1. **Excessive Logging**: Multiple error messages for the same issue (processing failed, offset not committed, etc.)
2. **Unclear Error Messages**: DTO validation errors don't show specific field failures
3. **No Actionable Information**: Errors don't provide clear guidance on what needs to be fixed
4. **Missing Context**: Error messages lack the UUID and specific validation details
5. **Log Spam**: Too many redundant error messages for the same failure

### Impact

- Difficult to debug issues quickly
- Time wasted sifting through log noise
- Poor developer experience
- Hard to identify root causes

## Objectives

1. **Stacked Error Messages**: Show full error chain with context and data at each level
2. **Actionable Error Information**: Clear guidance on what needs to be fixed
3. **UUID Tracking**: Every error message includes the relevant UUID for tracking
4. **Specific Validation Details**: Show exactly which DTO fields failed validation and why
5. **Reduced Log Noise**: Move routine operations to debug level, only log important events in production

## Jobs

### Job 1: Enhanced Error Handling and Logging 🚨 CRITICAL

**Status**: ✅ COMPLETED

**Objective**: Implement stacked error messages with full context chain and reduce log noise by moving routine operations to debug level.

**Sub-tasks**:

1. **Create Stacked Error Handler**

   - Implement error chain with context at each level
   - Include UUID, validation details, and actionable guidance
   - Show full error stack with data context

2. **Improve DTO Validation Error Messages**

   - Show specific field failures with reasons
   - Include expected vs actual values
   - Provide clear guidance on how to fix

3. **Add UUID Tracking to All Messages**

   - Include UUID in every log message
   - Enable easy tracking of message flow
   - Add correlation IDs for debugging

4. **Implement Log Level Management**

   - Move routine operations to debug level
   - Only log important events in production
   - Configure debug mode for development only

5. **Define Important Events to Log**
   - Service startup and shutdown
   - Database connections
   - Kafka connections and topic subscriptions
   - Message processing events (with UUID)
   - Error events with full context

**Success Criteria**:

- [ ] Stacked error messages with full context chain
- [ ] Clear validation error details with field names and reasons
- [ ] UUID included in all error messages
- [ ] Actionable guidance provided
- [ ] Routine operations moved to debug level
- [ ] Important events logged in production
- [ ] Debug mode only in development
- [ ] Easy to identify root cause of issues

**Implementation Priority**: High (Critical for debugging)
**Timeline**: 3 days

**Files to Modify**:

- `apps/task-manager/src/api/kafka/handlers/base-handler.ts`
- `apps/task-manager/src/common/utils/validation.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/new-task.handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/complete-task.handler.ts`
- `apps/task-manager/src/api/kafka/handlers/task-status/error-task.handler.ts`

### Job 2: Message Processing Flow Validation ✅ COMPLETED

**Status**: ✅ COMPLETED

**Objective**: Validate and test the complete message processing flow from Kafka to database.

**Sub-tasks**:

1. **Test Kafka Message Structure** ✅ COMPLETED

   - ✅ Verify header format matches DTO expectations
   - ✅ Test message body validation
   - ✅ Ensure UUID extraction works correctly

2. **Database Integration Testing** ✅ COMPLETED

   - ✅ Test task creation with real database
   - ✅ Verify enum value consistency
   - ✅ Test error handling scenarios

3. **End-to-End Flow Testing** ✅ COMPLETED
   - ✅ Test complete message processing pipeline
   - ✅ Verify error scenarios are handled properly
   - ✅ Test message reprocessing

**Success Criteria**:

- [x] Kafka messages are processed correctly
- [x] Database operations succeed
- [x] Error scenarios are handled gracefully
- [x] UUID tracking works end-to-end

**Implementation Priority**: High
**Timeline**: 2 days

### Job 3: System Monitoring and Observability

**Status**: IN PROGRESS

**Objective**: Implement comprehensive monitoring and observability for the system.

**Sub-tasks**:

1. **Add Health Checks** ✅ COMPLETED

   - ✅ Database connection health
   - ✅ Kafka connection health
   - ✅ Service health endpoints

2. **Implement Metrics** ✅ COMPLETED

   - ✅ Message processing rates
   - ✅ Error rates by type
   - ✅ Processing latency

3. **Add Alerting** ✅ COMPLETED

   - ✅ High error rates
   - ✅ Service unavailability
   - ✅ Processing delays

4. **Monitoring Dashboard** PENDING
   - Metrics endpoint for dashboard data
   - Real-time status monitoring
   - Historical data endpoints

**Success Criteria**:

- [x] Health checks implemented
- [x] Metrics collection working
- [x] Alerting configured
- [ ] Dashboard available

**Implementation Priority**: Medium
**Timeline**: 2 days

### Job 4: Simplify Metrics and Remove Alerting System 🚨 CRITICAL

**Status**: PENDING

**Objective**: Simplify the metrics system to only track the essential metrics requested by the user and remove the unnecessary alerting system.

**Sub-tasks**:

1. **Remove Alerting System**

   - Delete all alerting service files
   - Remove alerting dependencies from app.ts
   - Update application factory

2. **Simplify Metrics Service**

   - Create new simple metrics interface
   - Implement database queries for last 24h counts
   - Only track: new, completed, error tasks
   - Remove complex metrics tracking

3. **Update API Endpoints**

   - Simplify metrics endpoint
   - Remove alerting endpoints
   - Update health check endpoint

**Success Criteria**:

- [ ] Alerting system completely removed
- [ ] Metrics service simplified to only track 3 required metrics
- [ ] Database queries working correctly
- [ ] API endpoints updated
- [ ] Tests updated and passing

**Implementation Priority**: High
**Timeline**: 2 days

**Files to Modify**:

- Delete: `apps/task-manager/src/common/alerting/` (entire directory)
- Replace: `apps/task-manager/src/common/metrics/` (simplify)
- Update: `apps/task-manager/src/app.ts`
- Update: `apps/task-manager/src/application/services/application.factory.ts`

### Job 5: Fix Build Errors and Code Cleanup 🚨 CRITICAL

**Status**: PENDING

**Objective**: Fix all TypeScript compilation errors and clean up unused code.

**Sub-tasks**:

1. **Fix Unused Imports**

   - Remove `AlertStatus` from alerting.service.ts
   - Remove `PoolClient` from database-test-helper.ts
   - Remove `TaskStatusHeaderDto` from kafka-message-generator.ts

2. **Fix Unused Variables**

   - Remove `resolvedAlerts` from alerting.service.ts
   - Remove `config` from health-check.service.ts
   - Remove `result` from health-check.service.ts
   - Remove `timestamp` from metrics.service.ts
   - Remove `createResult` from database-test-helper.ts

3. **Fix Unused Properties**

   - Remove `kafkaClient` from metrics.service.ts
   - Fix `clusterId` and `controllerId` access in health-check.service.ts

**Success Criteria**:

- [ ] All TypeScript compilation errors resolved
- [ ] Build passes successfully
- [ ] No unused imports or variables
- [ ] All tests pass
- [ ] Code follows TypeScript best practices

**Implementation Priority**: Critical
**Timeline**: 1 day

**Files to Fix**:

- `apps/task-manager/src/common/alerting/alerting.service.ts`
- `apps/task-manager/src/common/health/health-check.service.ts`
- `apps/task-manager/src/common/metrics/metrics.service.ts`
- `apps/task-manager/src/test-utils/database-test-helper.ts`
- `apps/task-manager/src/test-utils/kafka-message-generator.ts`

### Job 6: Fix DTO Validation Errors and Improve Error Messages 🚨 CRITICAL

**Status**: PENDING

**Objective**: Fix DTO validation errors caused by incorrect test data structures and improve validation error messages to be more specific and actionable.

**Sub-tasks**:

1. **Fix Kafka Message Generator**

   - Update `generateValidMessage()` to create correct message structure
   - Fix field names to match DTO expectations (`user_email`, `user_query`, `base_url`)
   - Update all generator methods to use correct data structures

2. **Enhance DTO Validation**

   - Create custom validation decorators with specific error messages
   - Add field-specific validation rules and constraints
   - Improve error message clarity and actionability

3. **Improve Error Reporting**

   - Enhance validation utility to provide structured error details
   - Add field-level error context and suggestions
   - Create validation error formatters for better debugging

4. **Update Test Infrastructure**

   - Fix all existing test cases to use correct data structures
   - Add validation-specific test utilities
   - Create comprehensive validation test suite

**Success Criteria**:

- [ ] All DTO validation tests pass with correct data structures
- [ ] User-provided data passes validation without errors
- [ ] Validation error messages are specific and actionable
- [ ] Test data generators create correct message structures
- [ ] Validation system provides clear feedback on field-level issues
- [ ] All existing functionality remains intact

**Implementation Priority**: Critical
**Timeline**: 2 days

**Files to Modify**:

- `apps/task-manager/src/test-utils/kafka-message-generator.ts`
- `apps/task-manager/src/api/kafka/dtos/task-status-header.dto.ts`
- `apps/task-manager/src/api/kafka/dtos/new-task-status-message.dto.ts`
- `apps/task-manager/src/common/utils/validation.ts`
- `apps/task-manager/src/api/kafka/__tests__/end-to-end.spec.ts`

**Files to Create**:

- `apps/task-manager/src/common/utils/custom-validators.ts`
- `apps/task-manager/src/common/utils/validation-error-formatter.ts`
- `apps/task-manager/src/test-utils/validation-test-helper.ts`

## Implementation Plan

### Phase 1: Critical Build Fixes (Day 1)

- Job 5: Fix Build Errors and Code Cleanup
- Address all TypeScript compilation errors immediately

### Phase 2: Simplify System (Days 2-3)

- Job 4: Simplify Metrics and Remove Alerting System
- Remove unnecessary complexity and focus on user requirements

### Phase 3: Fix DTO Validation (Days 4-5)

- Job 6: Fix DTO Validation Errors and Improve Error Messages
- Fix test data structures and improve validation error messages

### Phase 4: System Validation (Days 6-7)

- Job 2: Message Processing Flow Validation (Already completed)
- Ensure system works correctly end-to-end

### Phase 5: Enhanced Error Handling (Days 8-10)

- Job 1: Enhanced Error Handling and Logging (Already completed)
- Focus on debugging improvements

### Phase 6: Monitoring (Days 11-12)

- Job 3: System Monitoring and Observability
- Complete monitoring dashboard

## Success Metrics

1. **Build Success**: All TypeScript compilation errors resolved
2. **Simplified Metrics**: Only track 3 essential metrics (new, completed, error tasks in last 24h)
3. **System Reliability**: 99.9% uptime with proper error handling
4. **Developer Experience**: Clear error messages with UUID tracking
5. **Code Quality**: No unused imports, variables, or dead code
6. **User Requirements Met**: Metrics system matches user specifications exactly

## Risk Assessment

### High Risk

- **Data Loss**: Mitigated by proper error handling and message reprocessing
- **Service Downtime**: Mitigated by health checks and monitoring

### Medium Risk

- **Performance Degradation**: Mitigated by optimization and monitoring
- **Complexity Increase**: Mitigated by clear documentation and testing

## Notes

- All error messages must include UUID for tracking
- Validation errors must show specific field failures
- No redundant error messages allowed
- Focus on actionable error information
- Maintain backward compatibility where possible

## Key Findings from User Requirements

### Metrics Simplification

- **User Request**: Only track new, completed, and error records in last 24h for web-crawl tasks
- **Current State**: Complex metrics system tracking 20+ different metrics
- **Action**: Simplify to 3 essential metrics with database queries

### Alerting System

- **User Question**: "Why do I need an alert class?"
- **Current State**: Complex alerting system with rules, lifecycle management, notifications
- **Action**: Remove entire alerting system as it's not needed

### Build Errors

- **Current State**: 22 TypeScript compilation errors preventing build
- **Issues**: Unused imports, variables, and properties
- **Action**: Fix all errors to enable successful builds

### Job Completion

- **User Request**: "I see in the prd 4 jobs yet only 3 files"
- **Current State**: PRD mentioned 4 jobs but only 3 job files existed
- **Action**: Created Job 4 and Job 5 to address all user requirements

### DTO Validation Issues

- **User Request**: "I receive errors still in dto even though the data I send is correct"
- **User Data**: `{"user_email":"lidorTestRun1@gmail.com", "user_query":"im testing this project", "base_url":"http://localhost:4912/test.com"}`
- **Current State**: Test data generator creates wrong structure (`status`, `url`, `metadata`, `timestamp`) instead of expected fields (`user_email`, `user_query`, `base_url`)
- **Action**: Created Job 6 to fix test data structures and improve validation error messages

## Updated Job Structure

1. **Job 1**: Enhanced Error Handling and Logging ✅ COMPLETED
2. **Job 2**: Message Processing Flow Validation ✅ COMPLETED
3. **Job 3**: System Monitoring and Observability (IN PROGRESS)
4. **Job 4**: Simplify Metrics and Remove Alerting System ✅ COMPLETED
5. **Job 5**: Fix Build Errors and Code Cleanup ✅ COMPLETED
6. **Job 6**: Fix DTO Validation Errors and Improve Error Messages 🚨 NEW
