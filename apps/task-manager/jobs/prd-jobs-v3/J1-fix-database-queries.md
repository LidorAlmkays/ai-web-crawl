# Job 1: Fix Database Queries

**Status**: ✅ COMPLETED

## Objective

Fix database query failures by updating the repository adapter to use stored procedures correctly and ensure proper parameter binding.

## Problem Analysis

Current issues identified from error logs:

1. **Parameter Binding Errors**: `"there is no parameter $1"` (code `42P02`)
2. **Syntax Errors**: `"syntax error at or near \"$1\""` (code `42601`)
3. **Incorrect Query Patterns**: Using direct SQL INSERT instead of stored procedure calls

## Root Cause

The `web-crawl-task.repository.adapter.ts` is attempting to use direct SQL statements with `$1` parameters, but PostgreSQL expects stored procedure calls using `SELECT function_name($1, $2, ...)` syntax.

## Solution

### 1. Update Repository Adapter

**File**: `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`

#### Current Problematic Code:

```typescript
// Current implementation uses direct SQL with $1 parameters
const result = await this.client.query('INSERT INTO web_crawl_tasks (user_email, url, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userEmail, url, status, createdAt, updatedAt]);
```

#### Fixed Implementation:

```typescript
// Use stored procedure calls
const result = await this.client.query('SELECT * FROM create_web_crawl_task($1, $2, $3, $4, $5)', [userEmail, url, status, createdAt, updatedAt]);
```

### 2. Fix All Repository Methods

#### Method 1: createWebCrawlTask

```typescript
async createWebCrawlTask(
  userEmail: string,
  url: string,
  status: TaskStatus,
  createdAt: Date,
  updatedAt: Date
): Promise<WebCrawlTask> {
  try {
    const result = await this.client.query(
      'SELECT * FROM create_web_crawl_task($1, $2, $3, $4, $5)',
      [userEmail, url, status, createdAt, updatedAt]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create web crawl task');
    }

    return this.mapRowToEntity(result.rows[0]);
  } catch (error) {
    this.logger.error('Error creating web crawl task', { error, userEmail, url, status });
    throw error;
  }
}
```

#### Method 2: updateWebCrawlTask

```typescript
async updateWebCrawlTask(
  id: string,
  updates: Partial<WebCrawlTask>
): Promise<WebCrawlTask | null> {
  try {
    const result = await this.client.query(
      'SELECT * FROM update_web_crawl_task($1, $2, $3, $4, $5, $6)',
      [
        id,
        updates.userEmail || null,
        updates.url || null,
        updates.status || null,
        updates.result || null,
        new Date() // updated_at
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  } catch (error) {
    this.logger.error('Error updating web crawl task', { error, id, updates });
    throw error;
  }
}
```

### 3. Verify Stored Procedures

Ensure the following stored procedures exist in the database:

#### create_web_crawl_task Procedure

```sql
CREATE OR REPLACE FUNCTION create_web_crawl_task(
  p_user_email VARCHAR(255),
  p_url TEXT,
  p_status task_status,
  p_created_at TIMESTAMP,
  p_updated_at TIMESTAMP
) RETURNS TABLE (
  id UUID,
  user_email VARCHAR(255),
  url TEXT,
  status task_status,
  result JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO web_crawl_tasks (user_email, url, status, created_at, updated_at)
  VALUES (p_user_email, p_url, p_status, p_created_at, p_updated_at)
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

#### update_web_crawl_task Procedure

```sql
CREATE OR REPLACE FUNCTION update_web_crawl_task(
  p_id UUID,
  p_user_email VARCHAR(255) DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_status task_status DEFAULT NULL,
  p_result JSONB DEFAULT NULL,
  p_updated_at TIMESTAMP DEFAULT NOW()
) RETURNS TABLE (
  id UUID,
  user_email VARCHAR(255),
  url TEXT,
  status task_status,
  result JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  UPDATE web_crawl_tasks
  SET
    user_email = COALESCE(p_user_email, user_email),
    url = COALESCE(p_url, url),
    status = COALESCE(p_status, status),
    result = COALESCE(p_result, result),
    updated_at = p_updated_at
  WHERE id = p_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
```

### 4. Update Query Functions

Ensure all query functions use proper parameter binding:

#### find_web_crawl_task_by_id

```typescript
async findWebCrawlTaskById(id: string): Promise<WebCrawlTask | null> {
  try {
    const result = await this.client.query(
      'SELECT * FROM find_web_crawl_task_by_id($1)',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  } catch (error) {
    this.logger.error('Error finding web crawl task by id', { error, id });
    throw error;
  }
}
```

#### find_web_crawl_tasks_by_status

```typescript
async findWebCrawlTasksByStatus(status: TaskStatus): Promise<WebCrawlTask[]> {
  try {
    const result = await this.client.query(
      'SELECT * FROM find_web_crawl_tasks_by_status($1)',
      [status]
    );

    return result.rows.map(row => this.mapRowToEntity(row));
  } catch (error) {
    this.logger.error('Error finding web crawl tasks by status', { error, status });
    throw error;
  }
}
```

#### find_web_crawl_tasks_by_user_email

```typescript
async findWebCrawlTasksByUserEmail(userEmail: string): Promise<WebCrawlTask[]> {
  try {
    const result = await this.client.query(
      'SELECT * FROM find_web_crawl_tasks_by_user_email($1)',
      [userEmail]
    );

    return result.rows.map(row => this.mapRowToEntity(row));
  } catch (error) {
    this.logger.error('Error finding web crawl tasks by user email', { error, userEmail });
    throw error;
  }
}
```

#### find_all_web_crawl_tasks

```typescript
async findAllWebCrawlTasks(): Promise<WebCrawlTask[]> {
  try {
    const result = await this.client.query('SELECT * FROM find_all_web_crawl_tasks()');
    return result.rows.map(row => this.mapRowToEntity(row));
  } catch (error) {
    this.logger.error('Error finding all web crawl tasks', { error });
    throw error;
  }
}
```

### 5. Update Count Functions

#### count_web_crawl_tasks_by_status

```typescript
async countWebCrawlTasksByStatus(status: TaskStatus): Promise<number> {
  try {
    const result = await this.client.query(
      'SELECT * FROM count_web_crawl_tasks_by_status($1)',
      [status]
    );

    return parseInt(result.rows[0].count);
  } catch (error) {
    this.logger.error('Error counting web crawl tasks by status', { error, status });
    throw error;
  }
}
```

#### count_all_web_crawl_tasks

```typescript
async countAllWebCrawlTasks(): Promise<number> {
  try {
    const result = await this.client.query('SELECT * FROM count_all_web_crawl_tasks()');
    return parseInt(result.rows[0].count);
  } catch (error) {
    this.logger.error('Error counting all web crawl tasks', { error });
    throw error;
  }
}
```

## Implementation Steps

### Step 1: Verify Database Schema

1. Check that all stored procedures exist
2. Verify function signatures match expected parameters
3. Test stored procedures manually in database

### Step 2: Update Repository Adapter

1. Replace direct SQL INSERT with stored procedure calls
2. Replace direct SQL UPDATE with stored procedure calls
3. Update all query methods to use proper parameter binding
4. Add comprehensive error handling

### Step 3: Update Error Handling

1. Add detailed logging for database operations
2. Implement proper error propagation
3. Add validation for stored procedure results

### Step 4: Testing

1. Unit tests for all repository methods
2. Integration tests with actual database
3. Error scenario testing
4. Performance testing

## Success Criteria

- [ ] All database queries work without parameter binding errors
- [ ] Stored procedures are called correctly
- [ ] No syntax errors in SQL queries
- [ ] Proper error handling and logging
- [ ] All CRUD operations function correctly
- [ ] Performance is maintained or improved
- [ ] Backward compatibility is preserved

## Testing Strategy

### Unit Tests

- Test each repository method individually
- Mock database client for isolated testing
- Test error scenarios and edge cases

### Integration Tests

- Test with actual PostgreSQL database
- Test stored procedure calls
- Test parameter binding
- Test error handling

### Error Scenario Tests

- Test with invalid parameters
- Test with missing stored procedures
- Test with database connection issues
- Test with malformed data

### Performance Tests

- Test query execution time
- Test with large datasets
- Test concurrent operations

## Example Test Cases

```typescript
describe('WebCrawlTaskRepositoryAdapter', () => {
  describe('createWebCrawlTask', () => {
    it('should create task using stored procedure', async () => {
      const task = await repository.createWebCrawlTask('test@example.com', 'https://example.com', TaskStatus.NOT_COMPLETED, new Date(), new Date());

      expect(task).toBeDefined();
      expect(task.userEmail).toBe('test@example.com');
    });

    it('should handle database errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

## Dependencies

- PostgreSQL database with stored procedures
- Existing database schema
- Logger implementation for error logging

## Risks and Mitigation

### Risks

1. **Stored Procedure Mismatch**: Function signatures might not match
2. **Performance Impact**: Stored procedures might be slower
3. **Data Loss**: Incorrect updates might corrupt data

### Mitigation

1. **Thorough Testing**: Test all stored procedures before deployment
2. **Performance Monitoring**: Monitor query performance
3. **Backup Strategy**: Database backups before changes
4. **Rollback Plan**: Ability to revert to previous implementation
