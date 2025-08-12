# Job 4: Simplify Metrics and Remove Alerting System

## Overview

This job simplifies the metrics system to only track the essential metrics requested by the user: new, completed, and error records in the last 24 hours for web-crawl tasks. It also removes the unnecessary alerting system that adds complexity without providing value.

## Problem Statement

### Current Issues

1. **Over-complex Metrics**: The current metrics service tracks too many metrics including:

   - Message processing rates
   - Error rates by type
   - Processing latency
   - Resource usage
   - Kafka metrics
   - Database metrics
   - Historical data

2. **Unnecessary Alerting**: The alerting system is complex and not needed:

   - Multiple alert rules
   - Alert lifecycle management
   - Notification channels
   - Alert history tracking
   - Cooldown periods

3. **Build Errors**: Multiple unused imports and variables causing TypeScript compilation errors

### User Requirements

The user only wants to track:

- How many records are NEW in the last 24h
- How many records are COMPLETED in the last 24h
- How many records are ERROR in the last 24h
- For web-crawl task-status only

## Objectives

1. **Simplify Metrics**: Create a minimal metrics service that only tracks the 3 required metrics
2. **Remove Alerting**: Completely remove the alerting system and its dependencies
3. **Fix Build Errors**: Clean up all unused imports and variables
4. **Database Integration**: Use database queries to get the actual counts from the last 24 hours

## Implementation Plan

### Phase 1: Remove Alerting System

**Files to Delete:**

- `apps/task-manager/src/common/alerting/alerting.service.ts`
- `apps/task-manager/src/common/alerting/alerting.interface.ts`
- `apps/task-manager/src/common/alerting/alert.rules.ts`
- `apps/task-manager/src/common/alerting/__tests__/alerting.service.spec.ts`

**Files to Update:**

- `apps/task-manager/src/app.ts` - Remove alerting service initialization
- `apps/task-manager/src/application/services/application.factory.ts` - Remove alerting dependencies

### Phase 2: Simplify Metrics Service

**New Metrics Interface:**

```typescript
export interface SimpleMetrics {
  newTasks24h: number;
  completedTasks24h: number;
  errorTasks24h: number;
  lastUpdated: string;
}

export interface ISimpleMetricsService {
  getMetrics(): Promise<SimpleMetrics>;
  refreshMetrics(): Promise<void>;
}
```

**New Metrics Service:**

```typescript
export class SimpleMetricsService implements ISimpleMetricsService {
  private metrics: SimpleMetrics = {
    newTasks24h: 0,
    completedTasks24h: 0,
    errorTasks24h: 0,
    lastUpdated: new Date().toISOString(),
  };

  async getMetrics(): Promise<SimpleMetrics> {
    await this.refreshMetrics();
    return this.metrics;
  }

  async refreshMetrics(): Promise<void> {
    // Query database for last 24h counts
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
      FROM web_crawl_tasks 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const result = await this.databasePool.query(query);
    const row = result.rows[0];

    this.metrics = {
      newTasks24h: parseInt(row.new_count) || 0,
      completedTasks24h: parseInt(row.completed_count) || 0,
      errorTasks24h: parseInt(row.error_count) || 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
```

**Files to Replace:**

- `apps/task-manager/src/common/metrics/metrics.service.ts` → `apps/task-manager/src/common/metrics/simple-metrics.service.ts`
- `apps/task-manager/src/common/metrics/metrics.interface.ts` → `apps/task-manager/src/common/metrics/simple-metrics.interface.ts`
- `apps/task-manager/src/common/metrics/__tests__/metrics.service.spec.ts` → `apps/task-manager/src/common/metrics/__tests__/simple-metrics.service.spec.ts`

### Phase 3: Fix Build Errors

**Files to Fix:**

1. `apps/task-manager/src/common/alerting/alerting.service.ts` - Remove unused imports
2. `apps/task-manager/src/common/health/health-check.service.ts` - Fix unused variables and properties
3. `apps/task-manager/src/common/metrics/metrics.service.ts` - Remove unused kafkaClient parameter
4. `apps/task-manager/src/test-utils/database-test-helper.ts` - Remove unused imports and variables
5. `apps/task-manager/src/test-utils/kafka-message-generator.ts` - Remove unused TaskStatusHeaderDto import

### Phase 4: Update Application Factory

**Update application.factory.ts:**

```typescript
// Remove alerting service
// Remove complex metrics service
// Add simple metrics service
```

### Phase 5: Update API Endpoints

**Update health check endpoint:**

```typescript
// Remove alerting metrics
// Add simple metrics endpoint
GET /api/metrics
{
  "newTasks24h": 15,
  "completedTasks24h": 12,
  "errorTasks24h": 3,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## Success Criteria

- [ ] Alerting system completely removed
- [ ] Metrics service simplified to only track 3 required metrics
- [ ] All build errors fixed
- [ ] Database queries working correctly
- [ ] API endpoints updated
- [ ] Tests updated and passing
- [ ] No unused imports or variables

## Implementation Priority: High

**Timeline**: 2 days

## Files to Modify

### Files to Delete:

- `apps/task-manager/src/common/alerting/alerting.service.ts`
- `apps/task-manager/src/common/alerting/alerting.interface.ts`
- `apps/task-manager/src/common/alerting/alert.rules.ts`
- `apps/task-manager/src/common/alerting/__tests__/alerting.service.spec.ts`

### Files to Replace:

- `apps/task-manager/src/common/metrics/metrics.service.ts`
- `apps/task-manager/src/common/metrics/metrics.interface.ts`
- `apps/task-manager/src/common/metrics/__tests__/metrics.service.spec.ts`

### Files to Update:

- `apps/task-manager/src/app.ts`
- `apps/task-manager/src/application/services/application.factory.ts`
- `apps/task-manager/src/api/rest/health-check.router.ts`
- `apps/task-manager/src/common/health/health-check.service.ts`
- `apps/task-manager/src/test-utils/database-test-helper.ts`
- `apps/task-manager/src/test-utils/kafka-message-generator.ts`

## Testing Strategy

1. **Unit Tests**: Test simplified metrics service
2. **Integration Tests**: Test database queries
3. **API Tests**: Test metrics endpoint
4. **Build Tests**: Ensure no TypeScript errors

## Risk Assessment

### Low Risk

- Removing unused code reduces complexity
- Simplified metrics are easier to maintain
- Database queries are straightforward

### Mitigation

- Keep backup of old metrics service during transition
- Test thoroughly before removing old code
- Ensure database queries are optimized
