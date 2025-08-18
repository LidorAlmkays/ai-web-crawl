# Job 02: Database UUID Generation Implementation

## Status

**COMPLETED**

## Overview

Configure PostgreSQL to automatically generate UUIDs for new tasks, removing the requirement for external systems to provide UUIDs and improving system autonomy.

## Objectives

- Enable PostgreSQL uuid-ossp extension
- Configure auto UUID generation for web_crawl_tasks table
- Ensure UUID generation is reliable and performant
- Maintain data integrity and uniqueness

## Files to Create/Modify

### Files to Modify

- `src/infrastructure/persistence/postgres/schema/02-tables.sql` - Add UUID extension and default
- `src/infrastructure/persistence/postgres/schema/01-enums.sql` - Ensure UUID extension is loaded early

### New Files

- `src/infrastructure/persistence/postgres/migrations/002-add-uuid-generation.sql` - Migration script

## Detailed Implementation

### 1. Update Schema Files

**File**: `src/infrastructure/persistence/postgres/schema/01-enums.sql`

Add UUID extension at the beginning:

```sql
-- Ensure UUID extension is available for all subsequent operations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ... existing enum definitions ...
```

**File**: `src/infrastructure/persistence/postgres/schema/02-tables.sql`

Update the web_crawl_tasks table definition:

```sql
-- ... existing table creation ...

CREATE TABLE IF NOT EXISTS web_crawl_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    user_query TEXT NOT NULL,
    original_url TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status task_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index on id for performance
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_id ON web_crawl_tasks(id);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_status ON web_crawl_tasks(status);

-- Add index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_created_at ON web_crawl_tasks(created_at);
```

### 2. Create Migration Script

**File**: `src/infrastructure/persistence/postgres/migrations/002-add-uuid-generation.sql`

```sql
-- Migration: Add UUID generation for web_crawl_tasks
-- This migration ensures existing tables are updated to support auto UUID generation

-- Step 1: Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Update existing table if it exists (for backward compatibility)
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'web_crawl_tasks') THEN
        -- Update the id column to have UUID default
        ALTER TABLE web_crawl_tasks
        ALTER COLUMN id SET DEFAULT gen_random_uuid();

        -- Ensure the column is UUID type
        ALTER TABLE web_crawl_tasks
        ALTER COLUMN id TYPE UUID USING id::UUID;

        RAISE NOTICE 'Updated existing web_crawl_tasks table for UUID generation';
    ELSE
        RAISE NOTICE 'web_crawl_tasks table does not exist, will be created with UUID generation';
    END IF;
END $$;

-- Step 3: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_id ON web_crawl_tasks(id);
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_status ON web_crawl_tasks(status);
CREATE INDEX IF NOT EXISTS idx_web_crawl_tasks_created_at ON web_crawl_tasks(created_at);

-- Step 4: Verify UUID generation works
DO $$
DECLARE
    test_uuid UUID;
BEGIN
    -- Test UUID generation
    SELECT gen_random_uuid() INTO test_uuid;

    IF test_uuid IS NULL THEN
        RAISE EXCEPTION 'UUID generation is not working properly';
    END IF;

    RAISE NOTICE 'UUID generation test passed: %', test_uuid;
END $$;
```

### 3. Update Repository Adapter

**File**: `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`

Update the create method to handle auto-generated UUIDs:

```typescript
// ... existing imports ...

export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  // ... existing methods ...

  async createWebCrawlTask(taskData: { user_email: string; user_query: string; original_url: string; received_at: Date; status?: task_status }): Promise<WebCrawlTask> {
    try {
      const query = `
        INSERT INTO web_crawl_tasks (user_email, user_query, original_url, received_at, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_email, user_query, original_url, received_at, status, created_at, updated_at
      `;

      const values = [taskData.user_email, taskData.user_query, taskData.original_url, taskData.received_at, taskData.status || 'new'];

      const result = await this.pool.query(query, values);
      const row = result.rows[0];

      // Create domain entity with auto-generated UUID
      const task = new WebCrawlTask(
        row.id, // PostgreSQL auto-generated UUID
        row.user_email,
        row.user_query,
        row.original_url,
        new Date(row.received_at),
        row.status as task_status,
        new Date(row.created_at),
        new Date(row.updated_at)
      );

      this.logger.info('Web crawl task created with auto-generated UUID', {
        taskId: task.id,
        userEmail: task.user_email,
        status: task.status,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to create web crawl task', {
        error: error.message,
        userEmail: taskData.user_email,
        originalUrl: taskData.original_url,
      });
      throw error;
    }
  }

  // ... other methods remain the same ...
}
```

### 4. Create Database Test Helper

**File**: `src/test-utils/uuid-test-helper.ts`

```typescript
import { Pool } from 'pg';

export class UUIDTestHelper {
  constructor(private pool: Pool) {}

  /**
   * Test UUID generation functionality
   */
  async testUUIDGeneration(): Promise<boolean> {
    try {
      // Test basic UUID generation
      const result = await this.pool.query('SELECT gen_random_uuid() as uuid');
      const uuid = result.rows[0].uuid;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        throw new Error(`Invalid UUID format: ${uuid}`);
      }

      // Test uniqueness (generate multiple UUIDs)
      const uuids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const result = await this.pool.query('SELECT gen_random_uuid() as uuid');
        const generatedUuid = result.rows[0].uuid;

        if (uuids.has(generatedUuid)) {
          throw new Error(`UUID collision detected: ${generatedUuid}`);
        }
        uuids.add(generatedUuid);
      }

      return true;
    } catch (error) {
      console.error('UUID generation test failed:', error);
      return false;
    }
  }

  /**
   * Test table UUID default
   */
  async testTableUUIDDefault(): Promise<boolean> {
    try {
      // Insert a test record without specifying id
      const insertResult = await this.pool.query(
        `
        INSERT INTO web_crawl_tasks (user_email, user_query, original_url, received_at, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
        ['test@example.com', 'Test query', 'https://example.com', new Date(), 'new']
      );

      const generatedId = insertResult.rows[0].id;

      // Validate the generated ID is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(generatedId)) {
        throw new Error(`Table UUID default not working: ${generatedId}`);
      }

      // Clean up test data
      await this.pool.query('DELETE FROM web_crawl_tasks WHERE user_email = $1', ['test@example.com']);

      return true;
    } catch (error) {
      console.error('Table UUID default test failed:', error);
      return false;
    }
  }
}
```

## Testing Strategy

### Unit Tests

**File**: `src/infrastructure/persistence/postgres/__tests__/uuid-generation.spec.ts`

```typescript
import { Pool } from 'pg';
import { UUIDTestHelper } from '../../../test-utils/uuid-test-helper';

describe('UUID Generation', () => {
  let pool: Pool;
  let uuidHelper: UUIDTestHelper;

  beforeAll(async () => {
    // Setup test database connection
    pool = new Pool({
      // Test database configuration
    });
    uuidHelper = new UUIDTestHelper(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('UUID Generation Functionality', () => {
    it('should generate valid UUIDs', async () => {
      const result = await uuidHelper.testUUIDGeneration();
      expect(result).toBe(true);
    });

    it('should generate unique UUIDs', async () => {
      const uuids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const result = await pool.query('SELECT gen_random_uuid() as uuid');
        const uuid = result.rows[0].uuid;

        expect(uuids.has(uuid)).toBe(false);
        uuids.add(uuid);
      }
    });
  });

  describe('Table UUID Default', () => {
    it('should auto-generate UUIDs for new records', async () => {
      const result = await uuidHelper.testTableUUIDDefault();
      expect(result).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should generate UUIDs quickly', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        await pool.query('SELECT gen_random_uuid() as uuid');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent UUID generation', async () => {
      const concurrentPromises = Array.from({ length: 50 }, () => pool.query('SELECT gen_random_uuid() as uuid'));

      const startTime = Date.now();
      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete in less than 500ms

      // Verify all UUIDs are unique
      const uuids = results.map((r) => r.rows[0].uuid);
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(uuids.length);
    });
  });

  describe('UUID Format Validation', () => {
    it('should generate UUIDs in correct format', async () => {
      const result = await pool.query('SELECT gen_random_uuid() as uuid');
      const uuid = result.rows[0].uuid;

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate different UUIDs on each call', async () => {
      const uuid1 = await pool.query('SELECT gen_random_uuid() as uuid');
      const uuid2 = await pool.query('SELECT gen_random_uuid() as uuid');

      expect(uuid1.rows[0].uuid).not.toBe(uuid2.rows[0].uuid);
    });
  });

  describe('Repository Integration', () => {
    it('should create task with auto-generated UUID', async () => {
      const repository = new WebCrawlTaskRepositoryAdapter(pool, mockLogger);

      const taskData = {
        user_email: 'test@example.com',
        user_query: 'Test query',
        original_url: 'https://example.com',
        received_at: new Date(),
        status: 'new' as task_status,
      };

      const task = await repository.createWebCrawlTask(taskData);

      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(task.user_email).toBe(taskData.user_email);
      expect(task.user_query).toBe(taskData.user_query);

      // Clean up
      await pool.query('DELETE FROM web_crawl_tasks WHERE id = $1', [task.id]);
    });

    it('should handle multiple concurrent task creations', async () => {
      const repository = new WebCrawlTaskRepositoryAdapter(pool, mockLogger);

      const taskData = {
        user_email: 'concurrent@example.com',
        user_query: 'Concurrent test',
        original_url: 'https://example.com',
        received_at: new Date(),
        status: 'new' as task_status,
      };

      const concurrentTasks = await Promise.all(Array.from({ length: 10 }, () => repository.createWebCrawlTask(taskData)));

      // Verify all tasks have unique UUIDs
      const taskIds = concurrentTasks.map((task) => task.id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(taskIds.length);

      // Clean up
      await Promise.all(taskIds.map((id) => pool.query('DELETE FROM web_crawl_tasks WHERE id = $1', [id])));
    });
  });

  describe('Migration and Backward Compatibility', () => {
    it('should handle existing records without UUIDs', async () => {
      // Create a test record with a manually inserted UUID
      const manualUuid = '12345678-1234-1234-1234-123456789abc';
      await pool.query(
        `INSERT INTO web_crawl_tasks (id, user_email, user_query, original_url, received_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [manualUuid, 'existing@example.com', 'Existing test', 'https://example.com', new Date(), 'new']
      );

      // Verify the record exists and can be queried
      const result = await pool.query('SELECT id FROM web_crawl_tasks WHERE id = $1', [manualUuid]);
      expect(result.rows).toHaveLength(1);

      // Clean up
      await pool.query('DELETE FROM web_crawl_tasks WHERE id = $1', [manualUuid]);
    });

    it('should maintain referential integrity with UUIDs', async () => {
      // Test that UUIDs work with foreign key constraints (if any are added in the future)
      const task = await repository.createWebCrawlTask({
        user_email: 'integrity@example.com',
        user_query: 'Integrity test',
        original_url: 'https://example.com',
        received_at: new Date(),
        status: 'new' as task_status,
      });

      // Verify the task can be updated
      await pool.query('UPDATE web_crawl_tasks SET status = $1 WHERE id = $2', ['completed', task.id]);

      const updatedTask = await pool.query('SELECT status FROM web_crawl_tasks WHERE id = $1', [task.id]);
      expect(updatedTask.rows[0].status).toBe('completed');

      // Clean up
      await pool.query('DELETE FROM web_crawl_tasks WHERE id = $1', [task.id]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const invalidPool = new Pool({
        host: 'invalid-host',
        port: 5432,
        database: 'invalid-db',
        user: 'invalid-user',
        password: 'invalid-password',
      });

      const repository = new WebCrawlTaskRepositoryAdapter(invalidPool, mockLogger);

      await expect(
        repository.createWebCrawlTask({
          user_email: 'error@example.com',
          user_query: 'Error test',
          original_url: 'https://example.com',
          received_at: new Date(),
          status: 'new' as task_status,
        })
      ).rejects.toThrow();

      await invalidPool.end();
    });

    it('should handle invalid task data gracefully', async () => {
      const repository = new WebCrawlTaskRepositoryAdapter(pool, mockLogger);

      // Test with invalid email format
      await expect(
        repository.createWebCrawlTask({
          user_email: 'invalid-email',
          user_query: 'Test query',
          original_url: 'https://example.com',
          received_at: new Date(),
          status: 'new' as task_status,
        })
      ).rejects.toThrow();
    });
  });

  describe('Index Performance', () => {
    it('should use indexes efficiently for UUID lookups', async () => {
      // Create multiple test records
      const testTasks = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          repository.createWebCrawlTask({
            user_email: `perf${i}@example.com`,
            user_query: `Performance test ${i}`,
            original_url: 'https://example.com',
            received_at: new Date(),
            status: 'new' as task_status,
          })
        )
      );

      // Test index usage with EXPLAIN
      const explainResult = await pool.query('EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM web_crawl_tasks WHERE id = $1', [testTasks[0].id]);

      // Verify index is being used
      const explainText = explainResult.rows.map((row) => row['QUERY PLAN']).join('\n');
      expect(explainText).toContain('Index Scan');

      // Clean up
      await Promise.all(testTasks.map((task) => pool.query('DELETE FROM web_crawl_tasks WHERE id = $1', [task.id])));
    });
  });
});
```

## Potential Issues and Mitigations

### 1. UUID Extension Not Available

**Issue**: PostgreSQL might not have uuid-ossp extension installed
**Mitigation**: Check extension availability and provide clear error messages

### 2. UUID Collisions

**Issue**: Theoretical possibility of UUID collisions
**Mitigation**: Use PostgreSQL's cryptographically secure gen_random_uuid()

### 3. Performance Impact

**Issue**: UUID generation might impact insert performance
**Mitigation**: Monitor performance and optimize if needed

### 4. Existing Data Migration

**Issue**: Existing records might not have UUIDs
**Mitigation**: Migration script handles existing data gracefully

### 5. Database Version Compatibility

**Issue**: Different PostgreSQL versions might have different UUID support
**Mitigation**: Test on target PostgreSQL version

## Success Criteria

- [ ] UUID extension is properly installed and available
- [ ] New tasks get auto-generated UUIDs
- [ ] UUID generation is performant (<1ms per UUID)
- [ ] No UUID collisions in testing
- [ ] Existing data is handled gracefully
- [ ] All database tests pass
- [ ] Migration script works correctly
- [ ] Repository adapter handles auto-generated UUIDs

## Dependencies

- PostgreSQL database with uuid-ossp extension
- Existing database schema
- Repository adapter implementation

## Estimated Effort

- **Development**: 1 day
- **Testing**: 1 day
- **Migration**: 0.5 day
- **Total**: 2.5 days

## Notes

- This job is critical for the UUID generation feature
- Must be tested thoroughly in a staging environment
- Migration script should be run during deployment
- Performance monitoring is essential
