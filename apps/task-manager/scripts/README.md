# Task Manager Scripts

This directory contains utility scripts for the task-manager application.

## Available Scripts

### Database Schema Script

**File:** `apply-database-schema.js`

Applies the database schema to the PostgreSQL database. This script creates all necessary tables, indexes, and constraints for the task-manager application.

**Usage:**

```bash
node scripts/apply-database-schema.js
```

### Database Functions Script

**File:** `apply-functions.js`

Applies only the database functions, useful when tables already exist but functions are missing. This script handles dollar-quoted strings properly and continues even if some objects already exist.

**Usage:**

```bash
node scripts/apply-functions.js
```

**When to use:**

- When you get "function does not exist" errors
- When the main schema script fails due to existing objects
- To apply just the query functions without affecting existing tables

### Kafka Task Pusher Script

**File:** `push-kafka-tasks.ts`

A comprehensive script that demonstrates the Kafka messaging system by pushing three types of task messages to the task-manager:

1. **New Task** - Creates a new web crawling task
2. **Completed Task** - Marks a task as successfully completed with results
3. **Error Task** - Marks a task as failed with error details

**Features:**

- Uses existing DTOs and validation from the task-manager project
- Follows the established Kafka configuration and topic structure
- Includes comprehensive error handling and logging
- Demonstrates the complete task lifecycle
- Validates all messages using class-validator before sending

**Usage:**

```bash
# Using npm script (recommended)
npm run push-kafka-tasks

# Or directly with tsx
tsx scripts/push-kafka-tasks.ts

# Alternative simplified version (same functionality)
npm run push-kafka-tasks-simple
tsx scripts/push-kafka-tasks-simple.ts
```

**Prerequisites:**

- Kafka broker must be running and accessible
- Task-manager application should be running to consume the messages
- Environment variables should be configured (see `env.example`)

**What the script does:**

1. **Task Lifecycle Demonstration:**

   - Creates a new web crawling task
   - Waits 1 second to simulate processing time
   - Marks the task as completed with sample results

2. **Error Task Demonstration:**
   - Creates a new task for a non-existent website
   - Waits 1 second to simulate processing time
   - Marks the task as failed with an error message

**Message Structure:**
Each Kafka message includes:

- **Headers:** Task metadata (id, task_type, status, timestamp)
- **Key:** Task UUID for message routing
- **Value:** Task-specific data (user email, query, URL, results/errors)

**Example Message Structure:**

**Headers:**

```json
{
  "id": "uuid-string",
  "task_type": "web-crawl",
  "status": "new|completed|error",
  "timestamp": "2025-08-13T10:11:56.900Z"
}
```

**Value (New Task):**

```json
{
  "user_email": "user@example.com",
  "user_query": "User's search query",
  "base_url": "https://example.com"
}
```

**Value (Completed Task):**

```json
{
  "user_email": "user@example.com",
  "user_query": "User's search query",
  "base_url": "https://example.com",
  "crawl_result": "Result data from the crawl"
}
```

**Value (Error Task):**

```json
{
  "user_email": "user@example.com",
  "user_query": "User's search query",
  "base_url": "https://example.com",
  "error": "Error message describing what went wrong"
}
```

**Logging:**
The script provides detailed logging with the following format:

- `[INFO]` - General information and progress updates
- `[SUCCESS]` - Successful operations
- `[ERROR]` - Error conditions and failures

**Example Output:**

```
[INFO] ========================================
[INFO] Kafka Task Pusher Script Started
[INFO] ========================================

[INFO] Running task lifecycle demonstration...
[INFO] Connected to Kafka successfully
[INFO] Creating new task with ID: 123e4567-e89b-12d3-a456-426614174000
[SUCCESS] Message sent to topic: task-status
[INFO] Marking task as completed: 123e4567-e89b-12d3-a456-426614174000
[SUCCESS] Message sent to topic: task-status
[SUCCESS] Task lifecycle demonstration completed successfully

[INFO] Running error task demonstration...
[INFO] Creating new task with ID: 987fcdeb-51a2-43d1-b789-123456789abc
[SUCCESS] Message sent to topic: task-status
[INFO] Marking task as error: 987fcdeb-51a2-43d1-b789-123456789abc
[SUCCESS] Message sent to topic: task-status
[SUCCESS] Error task demonstration completed successfully

[SUCCESS] All demonstrations completed successfully!
[INFO] Disconnected from Kafka successfully
```

## Configuration

Both scripts use the configuration from the task-manager application:

- **Database:** Uses PostgreSQL configuration from `src/config/postgres.ts`
- **Kafka:** Uses Kafka configuration from `src/config/kafka.ts`
- **Environment:** Reads from environment variables (see `env.example`)

## Development

To modify or extend these scripts:

1. **Kafka Script:** The `KafkaTaskPusher` class is exported and can be imported for use in other scripts
2. **Database Script:** Modify the SQL queries in the script to change the schema
3. **Validation:** All DTOs use class-validator for runtime validation
4. **Error Handling:** Scripts include comprehensive error handling and logging

## Troubleshooting

**Common Issues:**

1. **Kafka Connection Failed:**

   - Ensure Kafka broker is running
   - Check environment variables (KAFKA_BROKERS, etc.)
   - Verify network connectivity

2. **DTO Validation Errors:**

   - Check that all required fields are provided
   - Ensure email format is valid
   - Verify URL format is correct

3. **Database Connection Issues:**
   - Ensure PostgreSQL is running
   - Check database credentials in environment variables
   - Verify database exists and is accessible

**Debug Mode:**
For additional debugging, you can modify the script to include more verbose logging or add breakpoints for inspection.
