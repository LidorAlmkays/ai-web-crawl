# J3: Infrastructure Layer Database Queries for Error Detection

## Overview

Implement efficient database queries and functions to detect error scenarios when processing non-existing task IDs with matching user data.

## Requirements

### Database Functions to Create

1. **find_task_by_id**: Check if task exists by ID
2. **find_tasks_by_user_data**: Find tasks with same user email and query
3. **find_matching_tasks**: Find tasks that match user data but different ID
4. **get_task_status**: Get current status of a task
5. **validate_task_transition**: Check if status transition is valid

### Query Performance Requirements

- All queries must use proper indexes
- Queries should be optimized for large datasets
- Support for case-insensitive matching
- Efficient handling of multiple matches

## Implementation Plan

### 1. Database Schema Functions

- Create SQL functions for error detection
- Implement proper indexing strategy
- Add transaction support for data consistency
- Include error handling in SQL functions

### 2. Database Adapter

- Create adapter to call SQL functions
- Implement connection pooling
- Add query timeout handling
- Include retry logic for transient failures

### 3. Query Optimization

- Analyze query performance
- Create necessary indexes
- Optimize for common query patterns
- Add query monitoring and logging

## Test Criteria

### Unit Tests

- [ ] All SQL functions return correct results
- [ ] Database adapter properly calls functions
- [ ] Error handling works for database failures
- [ ] Connection pooling works correctly
- [ ] Query timeouts are handled properly

### Integration Tests

- [ ] Functions work with real database data
- [ ] Performance is acceptable under load
- [ ] Transactions maintain data consistency
- [ ] Indexes improve query performance

### Performance Tests

- [ ] Queries complete within acceptable time limits
- [ ] Memory usage is reasonable
- [ ] Connection pool doesn't exhaust resources
- [ ] Concurrent queries don't cause deadlocks

## Files to Create

### 1. Database Functions

```sql
-- src/infrastructure/persistence/postgres/schema/09-error-handling-functions.sql

-- Function to find task by ID
CREATE OR REPLACE FUNCTION find_task_by_id(task_id UUID)
RETURNS TABLE(
    id UUID,
    user_email VARCHAR(255),
    user_query TEXT,
    status task_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wt.id,
        wt.user_email,
        wt.user_query,
        wt.status,
        wt.created_at,
        wt.updated_at
    FROM web_crawl_tasks wt
    WHERE wt.id = task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find tasks by user data (case-insensitive)
CREATE OR REPLACE FUNCTION find_tasks_by_user_data(
    p_user_email VARCHAR(255),
    p_user_query TEXT
)
RETURNS TABLE(
    id UUID,
    user_email VARCHAR(255),
    user_query TEXT,
    status task_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wt.id,
        wt.user_email,
        wt.user_query,
        wt.status,
        wt.created_at,
        wt.updated_at
    FROM web_crawl_tasks wt
    WHERE LOWER(wt.user_email) = LOWER(p_user_email)
    AND wt.user_query = p_user_query
    ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find matching tasks (same user data, different ID)
CREATE OR REPLACE FUNCTION find_matching_tasks(
    p_task_id UUID,
    p_user_email VARCHAR(255),
    p_user_query TEXT
)
RETURNS TABLE(
    id UUID,
    user_email VARCHAR(255),
    user_query TEXT,
    status task_status,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wt.id,
        wt.user_email,
        wt.user_query,
        wt.status,
        wt.created_at,
        wt.updated_at
    FROM web_crawl_tasks wt
    WHERE wt.id != p_task_id
    AND LOWER(wt.user_email) = LOWER(p_user_email)
    AND wt.user_query = p_user_query
    ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get task status
CREATE OR REPLACE FUNCTION get_task_status(task_id UUID)
RETURNS task_status AS $$
DECLARE
    task_status_val task_status;
BEGIN
    SELECT status INTO task_status_val
    FROM web_crawl_tasks
    WHERE id = task_id;

    RETURN task_status_val;
END;
$$ LANGUAGE plpgsql;

-- Function to validate task status transition
CREATE OR REPLACE FUNCTION validate_task_transition(
    p_task_id UUID,
    p_expected_status task_status,
    p_new_status task_status
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status task_status;
    is_valid BOOLEAN := FALSE;
BEGIN
    -- Get current status
    SELECT status INTO current_status
    FROM web_crawl_tasks
    WHERE id = p_task_id;

    -- If task doesn't exist, return false
    IF current_status IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Validate expected status matches current status
    IF current_status != p_expected_status THEN
        RETURN FALSE;
    END IF;

    -- Validate status transition rules
    CASE current_status
        WHEN 'new' THEN
            -- New tasks can transition to completed or error
            is_valid := p_new_status IN ('completed', 'error');
        WHEN 'completed' THEN
            -- Completed tasks cannot transition
            is_valid := FALSE;
        WHEN 'error' THEN
            -- Error tasks cannot transition
            is_valid := FALSE;
        ELSE
            is_valid := FALSE;
    END CASE;

    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to count matching tasks
CREATE OR REPLACE FUNCTION count_matching_tasks(
    p_user_email VARCHAR(255),
    p_user_query TEXT
)
RETURNS INTEGER AS $$
DECLARE
    match_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO match_count
    FROM web_crawl_tasks wt
    WHERE LOWER(wt.user_email) = LOWER(p_user_email)
    AND wt.user_query = p_user_query;

    RETURN match_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. Database Adapter

```typescript
// src/infrastructure/persistence/postgres/adapters/ErrorDetectionAdapter.ts
import { Pool, PoolClient } from 'pg';
import { logger } from '../../../common/utils/logger';

export interface TaskInfo {
  id: string;
  userEmail: string;
  userQuery: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorDetectionResult {
  taskExists: boolean;
  matchingTasks: TaskInfo[];
  currentStatus?: string;
  isValidTransition: boolean;
}

export class ErrorDetectionAdapter {
  constructor(private readonly pool: Pool) {}

  async findTaskById(taskId: string): Promise<TaskInfo | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM find_task_by_id($1)', [taskId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTaskInfo(result.rows[0]);
    } catch (error) {
      logger.error('Error finding task by ID', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async findTasksByUserData(userEmail: string, userQuery: string): Promise<TaskInfo[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM find_tasks_by_user_data($1, $2)', [userEmail, userQuery]);

      return result.rows.map((row) => this.mapRowToTaskInfo(row));
    } catch (error) {
      logger.error('Error finding tasks by user data', {
        userEmail,
        userQuery,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async findMatchingTasks(taskId: string, userEmail: string, userQuery: string): Promise<TaskInfo[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM find_matching_tasks($1, $2, $3)', [taskId, userEmail, userQuery]);

      return result.rows.map((row) => this.mapRowToTaskInfo(row));
    } catch (error) {
      logger.error('Error finding matching tasks', {
        taskId,
        userEmail,
        userQuery,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getTaskStatus(taskId: string): Promise<string | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT get_task_status($1) as status', [taskId]);

      return result.rows[0]?.status || null;
    } catch (error) {
      logger.error('Error getting task status', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async validateTaskTransition(taskId: string, expectedStatus: string, newStatus: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT validate_task_transition($1, $2::task_status, $3::task_status) as is_valid', [taskId, expectedStatus, newStatus]);

      return result.rows[0]?.is_valid || false;
    } catch (error) {
      logger.error('Error validating task transition', {
        taskId,
        expectedStatus,
        newStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async countMatchingTasks(userEmail: string, userQuery: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT count_matching_tasks($1, $2) as count', [userEmail, userQuery]);

      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      logger.error('Error counting matching tasks', {
        userEmail,
        userQuery,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToTaskInfo(row: any): TaskInfo {
    return {
      id: row.id,
      userEmail: row.user_email,
      userQuery: row.user_query,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

## Success Metrics

- [ ] All database functions properly created and tested
- [ ] Queries perform efficiently with large datasets
- [ ] Proper error handling for database failures
- [ ] Connection pooling works correctly
- [ ] Indexes improve query performance
- [ ] Functions handle edge cases correctly

## Dependencies

- PostgreSQL database
- Existing connection pool configuration
- Existing logging infrastructure

## Next Steps

1. Create database functions
2. Implement database adapter
3. Add necessary indexes
4. Write comprehensive tests
5. Performance testing and optimization
