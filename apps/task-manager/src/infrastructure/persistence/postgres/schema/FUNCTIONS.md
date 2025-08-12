# PostgreSQL Functions Reference

Quick reference for all available PostgreSQL functions in the Task Manager schema.

## Stored Procedures (Mutations)

### `create_web_crawl_task()`

Creates a new web crawl task in the database.

**Parameters:**

- `p_id` (UUID): Task identifier
- `p_user_email` (VARCHAR(255)): User email
- `p_user_query` (TEXT): User query
- `p_original_url` (VARCHAR(2048)): Original URL
- `p_received_at` (TIMESTAMP WITH TIME ZONE): When task was received
- `p_status` (task_status): Task status
- `p_created_at` (TIMESTAMP WITH TIME ZONE): Creation timestamp
- `p_updated_at` (TIMESTAMP WITH TIME ZONE): Update timestamp

**Usage:**

```sql
SELECT create_web_crawl_task(
  '123e4567-e89b-12d3-a456-426614174000',
  'user@example.com',
  'Extract all links from homepage',
  'https://example.com',
  '2024-01-01 10:00:00+00',
  'not_completed',
  '2024-01-01 10:00:00+00',
  '2024-01-01 10:00:00+00'
);
```

### `update_web_crawl_task()`

Updates an existing web crawl task with new status and result data.

**Parameters:**

- `p_id` (UUID): Task identifier
- `p_status` (task_status): New task status
- `p_data` (TEXT): Result data or error message
- `p_finished_at` (TIMESTAMP WITH TIME ZONE): Completion timestamp
- `p_updated_at` (TIMESTAMP WITH TIME ZONE): Update timestamp

**Usage:**

```sql
SELECT update_web_crawl_task(
  '123e4567-e89b-12d3-a456-426614174000',
  'completed_success',
  '{"links": ["https://example.com/page1", "https://example.com/page2"]}',
  '2024-01-01 10:05:00+00',
  '2024-01-01 10:05:00+00'
);
```

## Query Functions (Read Operations)

### `find_web_crawl_task_by_id()`

Retrieves a single web crawl task by its UUID.

**Parameters:**

- `p_id` (UUID): Task identifier

**Returns:** Table with task data

**Usage:**

```sql
SELECT * FROM find_web_crawl_task_by_id('123e4567-e89b-12d3-a456-426614174000');
```

### `find_web_crawl_tasks_by_status()`

Retrieves all web crawl tasks with a specific status.

**Parameters:**

- `p_status` (task_status): Task status to filter by

**Returns:** Table with matching tasks

**Usage:**

```sql
SELECT * FROM find_web_crawl_tasks_by_status('not_completed');
```

### `find_web_crawl_tasks_by_user_email()`

Retrieves all web crawl tasks for a specific user.

**Parameters:**

- `p_user_email` (VARCHAR(255)): User email to filter by

**Returns:** Table with matching tasks

**Usage:**

```sql
SELECT * FROM find_web_crawl_tasks_by_user_email('user@example.com');
```

### `find_all_web_crawl_tasks()`

Retrieves all web crawl tasks with optional pagination.

**Parameters:**

- `p_limit` (INTEGER, default: 100): Maximum number of tasks to return
- `p_offset` (INTEGER, default: 0): Number of tasks to skip

**Returns:** Table with tasks

**Usage:**

```sql
SELECT * FROM find_all_web_crawl_tasks(50, 0);
```

## Count Functions (Statistics)

### `count_web_crawl_tasks_by_status()`

Returns the number of web crawl tasks with a specific status.

**Parameters:**

- `p_status` (task_status): Task status to count

**Returns:** INTEGER count

**Usage:**

```sql
SELECT count_web_crawl_tasks_by_status('not_completed');
```

### `count_all_web_crawl_tasks()`

Returns the total number of web crawl tasks in the database.

**Parameters:** None

**Returns:** INTEGER count

**Usage:**

```sql
SELECT count_all_web_crawl_tasks();
```

## Views (Convenient Queries)

### `completed_web_crawl_tasks`

View of all completed web crawl tasks with success indicator and duration.

**Usage:**

```sql
SELECT * FROM completed_web_crawl_tasks;
```

### `pending_web_crawl_tasks`

View of all pending web crawl tasks with age information.

**Usage:**

```sql
SELECT * FROM pending_web_crawl_tasks;
```

### `web_crawl_task_statistics`

View providing web crawl task count statistics and completion rates.

**Usage:**

```sql
SELECT * FROM web_crawl_task_statistics;
```

## Task Status Values

The `task_status` enum supports these values:

- `'not_completed'`: Task is pending or in progress
- `'completed_success'`: Task completed successfully
- `'completed_error'`: Task completed with an error
