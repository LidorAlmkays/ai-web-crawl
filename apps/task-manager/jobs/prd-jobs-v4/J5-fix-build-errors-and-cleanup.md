# Job 5: Fix Build Errors and Code Cleanup

## Overview

This job addresses all TypeScript compilation errors by removing unused imports, variables, and properties. It also cleans up the codebase to ensure it builds successfully and follows best practices.

## Problem Statement

### Current Build Errors

The build is failing with 22 TypeScript errors:

1. **Unused Imports (TS6133)**:

   - `AlertStatus` in alerting.service.ts
   - `PoolClient` in database-test-helper.ts
   - `TaskStatusHeaderDto` in kafka-message-generator.ts

2. **Unused Variables (TS6133)**:

   - `resolvedAlerts` in alerting.service.ts
   - `config` in health-check.service.ts
   - `result` in health-check.service.ts
   - `timestamp` in metrics.service.ts
   - `createResult` in database-test-helper.ts

3. **Unused Properties (TS6138)**:

   - `kafkaClient` in metrics.service.ts

4. **Missing Properties (TS2339)**:
   - `clusterId` and `controllerId` in health-check.service.ts

## Objectives

1. **Fix All Build Errors**: Remove all unused imports, variables, and properties
2. **Clean Up Code**: Remove dead code and unused functionality
3. **Improve Code Quality**: Ensure code follows TypeScript best practices
4. **Maintain Functionality**: Ensure fixes don't break existing functionality

## Implementation Plan

### Phase 1: Fix Alerting Service

**File**: `apps/task-manager/src/common/alerting/alerting.service.ts`

**Issues to Fix**:

- Remove unused `AlertStatus` import
- Remove unused `resolvedAlerts` variable

**Changes**:

```typescript
// Remove this import
// import { AlertStatus } from './alerting.interface';

// Remove or use the resolvedAlerts variable
// const resolvedAlerts = this.alertHistory.filter(...);
```

### Phase 2: Fix Health Check Service

**File**: `apps/task-manager/src/common/health/health-check.service.ts`

**Issues to Fix**:

- Remove unused `config` property
- Remove unused `result` variable
- Fix missing `clusterId` and `controllerId` properties

**Changes**:

```typescript
// Remove unused config property
// private readonly config: HealthCheckConfig;

// Remove unused result variable
// const result = await client.query('SELECT 1 as health_check');

// Fix Kafka metadata properties
// Check if properties exist before accessing
const clusterId = metadata.clusterId || 'unknown';
const controllerId = metadata.controllerId || 'unknown';
```

### Phase 3: Fix Metrics Service

**File**: `apps/task-manager/src/common/metrics/metrics.service.ts`

**Issues to Fix**:

- Remove unused `kafkaClient` parameter
- Remove unused `timestamp` variable

**Changes**:

```typescript
// Remove kafkaClient parameter
constructor(
  private readonly databasePool: Pool,
  // private readonly kafkaClient: Kafka, // Remove this
  config?: Partial<MetricsConfig>
) {

// Remove unused timestamp variable
// const timestamp = new Date().toISOString();
```

### Phase 4: Fix Test Utilities

**File**: `apps/task-manager/src/test-utils/database-test-helper.ts`

**Issues to Fix**:

- Remove unused `PoolClient` import
- Remove unused `createResult` variable

**Changes**:

```typescript
// Remove unused import
// import { Pool, PoolClient } from 'pg';
import { Pool } from 'pg';

// Remove unused variable or use it
// const createResult = await this.pool.query(...);
await this.pool.query(...);
```

**File**: `apps/task-manager/src/test-utils/kafka-message-generator.ts`

**Issues to Fix**:

- Remove unused `TaskStatusHeaderDto` import

**Changes**:

```typescript
// Remove unused import
// import { TaskStatusHeaderDto } from '../api/kafka/dtos/task-status-header.dto';
```

### Phase 5: Update Dependencies

**Files to Update**:

- `apps/task-manager/src/app.ts` - Remove alerting service if not needed
- `apps/task-manager/src/application/services/application.factory.ts` - Update service dependencies

## Success Criteria

- [ ] All TypeScript compilation errors resolved
- [ ] Build passes successfully
- [ ] No unused imports or variables
- [ ] All tests pass
- [ ] Code follows TypeScript best practices
- [ ] No functionality broken

## Implementation Priority: Critical

**Timeline**: 1 day

## Files to Modify

### Files to Fix:

1. `apps/task-manager/src/common/alerting/alerting.service.ts`
2. `apps/task-manager/src/common/health/health-check.service.ts`
3. `apps/task-manager/src/common/metrics/metrics.service.ts`
4. `apps/task-manager/src/test-utils/database-test-helper.ts`
5. `apps/task-manager/src/test-utils/kafka-message-generator.ts`

### Files to Update:

1. `apps/task-manager/src/app.ts`
2. `apps/task-manager/src/application/services/application.factory.ts`

## Testing Strategy

1. **Build Test**: Run `nx run task-manager:build:production`
2. **Type Check**: Run `nx run task-manager:typecheck`
3. **Unit Tests**: Run `nx run task-manager:test`
4. **Integration Tests**: Run end-to-end tests

## Risk Assessment

### Low Risk

- Removing unused code doesn't affect functionality
- TypeScript errors are straightforward to fix
- No business logic changes

### Mitigation

- Test thoroughly after each fix
- Keep backups of files before changes
- Run tests after each modification

## Code Quality Improvements

1. **ESLint Rules**: Add rules to catch unused imports/variables
2. **Pre-commit Hooks**: Add TypeScript checking to pre-commit
3. **CI/CD**: Add build checks to CI pipeline
4. **Documentation**: Update code comments where needed
