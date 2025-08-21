# Database Schema Documentation

This document provides comprehensive information about the PostgreSQL database schema used by the Task Manager Service.

## 📋 Overview

The Task Manager Service uses PostgreSQL as its primary database with a well-structured schema designed for:
- **Task Management**: Storing and tracking web crawling tasks
- **Status Tracking**: Real-time status updates and lifecycle management
- **Metrics Collection**: Performance and operational metrics
- **Audit Trail**: Comprehensive timestamp tracking for all operations

## 🏗️ Database Schema Structure

### Schema Files Organization
```
schema/
├── main.sql              # Main schema entry point
├── enums.sql             # Custom enum definitions
├── tables.sql            # Table definitions
├── triggers.sql          # Database triggers
├── stored-procedures.sql # Stored procedures
├── functions.sql         # Query and utility functions
└── metrics-functions.sql # Metrics-specific functions
```

## 📊 Core Tables

### `web_crawl_tasks` Table

The main table that stores all web crawling task information.

#### Table Definition
```sql
CREATE TABLE web_crawl_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  user_query TEXT NOT NULL,
  original_url VARCHAR(2048) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status task_status NOT NULL DEFAULT 'new',
  data TEXT, -- Result data or error message
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### Column Descriptions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for the task |
| `user_email` | VARCHAR(255) | NOT NULL | Email of the user who requested the task |
| `user_query` | TEXT | NOT NULL | User-provided query or description |
| `original_url` | VARCHAR(2048) | NOT NULL | Original URL associated with the task |
| `received_at` | TIMESTAMP WITH TIME ZONE | NOT NULL | When the task was received |
| `status` | task_status | NOT NULL, DEFAULT 'new' | Current status of the task |
| `data` | TEXT | NULL | Result data or error message |
| `finished_at` | TIMESTAMP WITH TIME ZONE | NULL | When the task was completed |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_web_crawl_tasks_status ON web_crawl_tasks(status);
CREATE INDEX idx_web_crawl_tasks_user_email ON web_crawl_tasks(user_email);
CREATE INDEX idx_web_crawl_tasks_created_at ON web_crawl_tasks(created_at);
CREATE INDEX idx_web_crawl_tasks_received_at ON web_crawl_tasks(received_at);

-- Composite indexes for common queries
CREATE INDEX idx_web_crawl_tasks_user_email_status ON web_crawl_tasks(user_email, status);
```

## 🔄 Custom Enums

### `task_status` Enum
```sql
CREATE TYPE task_status AS ENUM (
  'new',
  'completed',
  'error'
);
```

#### Enum Values
- **`new`**: Task is created and ready for processing
- **`completed`**: Task has been successfully completed
- **`error`**: Task failed with an error

## 🔧 Database Functions

### Query Functions

#### `find_web_crawl_task_by_id(p_id UUID)`
Retrieves a single web crawl task by its UUID.

```sql
CREATE OR REPLACE FUNCTION find_web_crawl_task_by_id(p_id UUID)
RETURNS TABLE (
  id UUID,
  user_email VARCHAR(255),
  user_query TEXT,
  original_url VARCHAR(2048),
  received_at TIMESTAMP WITH TIME ZONE,
  status task_status,
  data TEXT,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wct.id,
    wct.user_email,
    wct.user_query,
    wct.original_url,
    wct.received_at,
    wct.status,
    wct.data,
    wct.finished_at,
    wct.created_at,
    wct.updated_at
  FROM web_crawl_tasks wct
  WHERE wct.id = p_id;
END;
$$ LANGUAGE plpgsql;
```

#### `find_web_crawl_tasks_by_status(p_status task_status)`
Retrieves all web crawl tasks with a specific status.

```sql
CREATE OR REPLACE FUNCTION find_web_crawl_tasks_by_status(p_status task_status)
RETURNS TABLE (
  id UUID,
  user_email VARCHAR(255),
  user_query TEXT,
  original_url VARCHAR(2048),
  received_at TIMESTAMP WITH TIME ZONE,
  status task_status,
  data TEXT,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wct.id,
    wct.user_email,
    wct.user_query,
    wct.original_url,
    wct.received_at,
    wct.status,
    wct.data,
    wct.finished_at,
    wct.created_at,
    wct.updated_at
  FROM web_crawl_tasks wct
  WHERE wct.status = p_status
  ORDER BY wct.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

### Count Functions

#### `count_web_crawl_tasks_by_status(p_status task_status)`
Returns the number of web crawl tasks with a specific status.

```sql
CREATE OR REPLACE FUNCTION count_web_crawl_tasks_by_status(p_status task_status)
RETURNS INTEGER AS $$
DECLARE
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count
  FROM web_crawl_tasks 
  WHERE status = p_status;
  
  RETURN task_count;
END;
$$ LANGUAGE plpgsql;
```

## 📈 Metrics Functions

### Core Metrics Function

#### `get_tasks_count_by_status(status_value task_status, hours INTEGER)`
Generic function to get task count by status and time range.

```sql
CREATE OR REPLACE FUNCTION get_tasks_count_by_status(
  status_value task_status,
  hours INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE status = status_value
    AND created_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;
```

### Status-Specific Count Functions

#### `get_new_tasks_count(hours INTEGER)`
Returns count of new tasks within the specified hours.

```sql
CREATE OR REPLACE FUNCTION get_new_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN get_tasks_count_by_status('new', hours);
END;
$$ LANGUAGE plpgsql;
```

#### `get_completed_tasks_count(hours INTEGER)`
Returns count of completed tasks within the specified hours.

```sql
CREATE OR REPLACE FUNCTION get_completed_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN get_tasks_count_by_status('completed', hours);
END;
$$ LANGUAGE plpgsql;
```

#### `get_error_tasks_count(hours INTEGER)`
Returns count of error tasks within the specified hours.

```sql
CREATE OR REPLACE FUNCTION get_error_tasks_count(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN get_tasks_count_by_status('error', hours);
END;
$$ LANGUAGE plpgsql;
```

### Aggregate Metrics Functions

#### `get_total_tasks_count_by_creation_time(hours INTEGER)`
Returns total count of tasks created within the specified hours.

```sql
CREATE OR REPLACE FUNCTION get_total_tasks_count_by_creation_time(hours INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM web_crawl_tasks
    WHERE created_at >= NOW() - INTERVAL '1 hour' * hours
  );
END;
$$ LANGUAGE plpgsql;
```

#### `get_web_crawl_metrics(hours INTEGER)`
Returns comprehensive metrics for all task statuses in a single call.

```sql
CREATE OR REPLACE FUNCTION get_web_crawl_metrics(hours INTEGER)
RETURNS TABLE(
  new_tasks_count INTEGER,
  completed_tasks_count INTEGER,
  error_tasks_count INTEGER,
  total_tasks_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    get_new_tasks_count(hours),
    get_completed_tasks_count(hours),
    get_error_tasks_count(hours),
    get_total_tasks_count_by_creation_time(hours);
END;
$$ LANGUAGE plpgsql;
```

## 🔄 Database Triggers

### Automatic Timestamp Updates
```sql
-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_web_crawl_tasks_updated_at 
    BEFORE UPDATE ON web_crawl_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 📊 Common Queries

### Task Retrieval Queries

#### Get Task by ID
```sql
SELECT * FROM find_web_crawl_task_by_id('task-uuid-here');
```

#### Get Tasks by Status
```sql
-- Get all completed tasks
SELECT * FROM find_web_crawl_tasks_by_status('completed');

-- Get all error tasks
SELECT * FROM find_web_crawl_tasks_by_status('error');

-- Get all new tasks
SELECT * FROM find_web_crawl_tasks_by_status('new');
```

#### Get Tasks for Specific User
```sql
SELECT * FROM web_crawl_tasks 
WHERE user_email = 'user@example.com' 
ORDER BY created_at DESC;
```

### Metrics Queries

#### Get Current Metrics (Last 24 Hours)
```sql
SELECT * FROM get_web_crawl_metrics(24);
```

#### Get Task Counts by Status
```sql
-- Count new tasks
SELECT get_new_tasks_count(24) as new_tasks;

-- Count completed tasks
SELECT get_completed_tasks_count(24) as completed_tasks;

-- Count error tasks
SELECT get_error_tasks_count(24) as error_tasks;
```

#### Get Total Tasks Created
```sql
SELECT get_total_tasks_count_by_creation_time(24) as total_tasks;
```

### Performance Queries

#### Get Recent Tasks
```sql
SELECT id, user_email, status, created_at 
FROM web_crawl_tasks 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

#### Get Task Duration Statistics
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (finished_at - received_at))) as avg_duration_seconds
FROM web_crawl_tasks 
WHERE finished_at IS NOT NULL
GROUP BY status;
```

## 🔧 Database Operations

### Task Creation
```sql
INSERT INTO web_crawl_tasks (
  user_email, 
  user_query, 
  original_url, 
  received_at, 
  status
) VALUES (
  'user@example.com',
  'Find product information',
  'https://example.com',
  NOW(),
  'new'
);
```

### Task Status Update
```sql
UPDATE web_crawl_tasks 
SET 
  status = 'completed',
  data = 'Found 5 products matching criteria',
  finished_at = NOW()
WHERE id = 'task-uuid-here';
```

### Task Completion with Error
```sql
UPDATE web_crawl_tasks 
SET 
  status = 'error',
  data = 'Network timeout occurred',
  finished_at = NOW()
WHERE id = 'task-uuid-here';
```

## 📈 Performance Optimization

### Index Usage
The database schema includes optimized indexes for common query patterns:

1. **Status-based queries**: `idx_web_crawl_tasks_status`
2. **User-based queries**: `idx_web_crawl_tasks_user_email`
3. **Time-based queries**: `idx_web_crawl_tasks_created_at`
4. **Composite queries**: `idx_web_crawl_tasks_user_email_status`

### Query Optimization Tips

1. **Use Functions**: Leverage the provided database functions for consistent query patterns
2. **Time Ranges**: Use time-based filtering for large datasets
3. **Status Filtering**: Always filter by status when possible
4. **Pagination**: Implement pagination for large result sets

## 🔍 Database Maintenance

### Schema Application
```bash
# Apply the complete schema
npm run apply-schema
```

### Schema Verification
```sql
-- Check if all functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%web_crawl%';

-- Check table structure
\d web_crawl_tasks

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'web_crawl_tasks';
```

### Backup and Recovery
```bash
# Create database backup
pg_dump -h localhost -U postgres -d tasks_manager > backup.sql

# Restore database
psql -h localhost -U postgres -d tasks_manager < backup.sql
```

## 🚀 Migration Management

### Schema Migrations
The service includes migration files for schema updates:

- `001-rename-data-to-result.sql` - Renames data column to result
- `002-add-uuid-generation.sql` - Adds UUID generation for new records

### Applying Migrations
```bash
# Apply specific migration
psql -h localhost -U postgres -d tasks_manager -f migrations/001-rename-data-to-result.sql
```

## 📊 Monitoring and Health Checks

### Database Health Queries
```sql
-- Check table size
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename = 'web_crawl_tasks';

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'web_crawl_tasks';
```

### Performance Monitoring
```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%web_crawl_tasks%'
ORDER BY mean_time DESC;
```

For more information about database operations and integration, see:
- [Configuration Guide](./configuration.md) - Database configuration options
- [API Documentation](./api.md) - Database operation endpoints
- [Development Guide](./development.md) - Database development practices
