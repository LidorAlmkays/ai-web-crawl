# PostgreSQL Schema for Task Manager

This directory contains the PostgreSQL schema files for the Task Manager service, organized by functionality.

## Schema Files

### 00-main.sql

Main schema file that imports all components in the correct order.

### 01-enums.sql

Custom PostgreSQL enum types:

- `task_status`: Represents task states (`completed_success`, `completed_error`, `not_completed`)

### 02-tables.sql

Database tables and indexes:

- `web_crawl_tasks`: Main table for storing web crawl task data
- Indexes for performance optimization

### 03-triggers.sql

Database triggers and functions:

- `update_updated_at_column()`: Automatically updates `updated_at` timestamp
- `update_web_crawl_tasks_updated_at`: Trigger for automatic timestamp updates

### 04-stored-procedures.sql

Stored procedures for data mutations:

- `create_web_crawl_task()`: Creates a new web crawl task
- `update_web_crawl_task()`: Updates an existing web crawl task

### 05-query-functions.sql

Query functions for data retrieval:

- `find_web_crawl_task_by_id()`: Finds a task by UUID
- `find_web_crawl_tasks_by_status()`: Finds tasks by status
- `find_web_crawl_tasks_by_user_email()`: Finds tasks by user email
- `find_all_web_crawl_tasks()`: Finds all tasks with pagination

### 06-count-functions.sql

Count functions for statistics:

- `count_web_crawl_tasks_by_status()`: Counts tasks by status
- `count_all_web_crawl_tasks()`: Counts total tasks

### 07-views.sql

Database views for convenient querying:

- `completed_web_crawl_tasks`: View of completed tasks with computed fields
- `pending_web_crawl_tasks`: View of pending tasks with age information
- `web_crawl_task_statistics`: View with aggregated statistics

## Usage

To apply the complete schema:

```sql
\i 00-main.sql
```

Or apply individual components:

```sql
\i 01-enums.sql
\i 02-tables.sql
-- etc.
```

## Available Functions

### Stored Procedures (Mutations)

- `create_web_crawl_task(p_id, p_user_email, p_user_query, p_original_url, p_received_at, p_status, p_created_at, p_updated_at)`
- `update_web_crawl_task(p_id, p_status, p_data, p_finished_at, p_updated_at)`

### Query Functions (Read Operations)

- `find_web_crawl_task_by_id(p_id)`
- `find_web_crawl_tasks_by_status(p_status)`
- `find_web_crawl_tasks_by_user_email(p_user_email)`
- `find_all_web_crawl_tasks(p_limit, p_offset)`

### Count Functions (Statistics)

- `count_web_crawl_tasks_by_status(p_status)`
- `count_all_web_crawl_tasks()`

### Views (Convenient Queries)

- `completed_web_crawl_tasks`
- `pending_web_crawl_tasks`
- `web_crawl_task_statistics`

## Database Structure

The schema follows PostgreSQL best practices:

- Uses custom enum types for data integrity
- Implements proper indexing for performance
- Includes automatic timestamp management
- Provides both procedural and functional interfaces
- Includes comprehensive documentation and comments
