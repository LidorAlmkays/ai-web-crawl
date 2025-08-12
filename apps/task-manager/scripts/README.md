# Database Setup Scripts

This directory contains a utility script for setting up the database schema and metrics functions for the task-manager application.

## Files

- `apply-database-schema.js` - Applies the complete database schema including enums, tables, triggers, stored procedures, functions, views, and metrics functions
- `README.md` - This file

## Quick Start

### Prerequisites

1. **Ensure PostgreSQL is running**:

   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   ```

2. **If not running, start PostgreSQL**:

   ```bash
   cd deployment/devops
   docker-compose up -d postgres
   ```

3. **Set up the database schema**:

   ```bash
   # Using npm script (recommended)
   npm run db:setup

   # Or directly with node
   node scripts/apply-database-schema.js
   ```

## Database Configuration

The script uses these environment variables (with defaults):

- `POSTGRES_USER` (default: 'postgres')
- `POSTGRES_PASSWORD` (default: 'password')
- `POSTGRES_DB` (default: 'tasks_manager')
- `POSTGRES_HOST` (default: 'localhost')
- `POSTGRES_PORT` (default: 5432)
- `POSTGRES_SSL` (default: false)

## Schema Structure

The database schema includes:

- **Enums**: Task status and type definitions
- **Tables**: Web crawl tasks and related data
- **Triggers**: Automatic timestamp updates
- **Stored Procedures**: Task management operations
- **Functions**: Metrics and reporting functions
- **Views**: Aggregated data views

## Metrics Functions

The metrics functions provide:

- `get_new_tasks_count(hours)` - Count of new tasks in the last N hours
- `get_completed_tasks_count(hours)` - Count of completed tasks in the last N hours
- `get_error_tasks_count(hours)` - Count of error tasks in the last N hours
- `get_tasks_count_by_status(status, hours)` - Count of tasks by status in the last N hours
- `get_web_crawl_metrics(hours)` - Comprehensive web crawl metrics

## API Endpoints

After running the script, these metrics endpoints will be available:

- `GET /api/metrics` - Prometheus format metrics
- `GET /api/metrics/json` - JSON format metrics
- `GET /api/metrics/config` - Metrics configuration

## Troubleshooting

### Connection Issues

1. **Check PostgreSQL is running**:

   ```bash
   docker ps | grep postgres
   ```

2. **Verify connection details**:

   ```bash
   # Test connection manually
   psql -h localhost -p 5432 -U postgres -d tasks_manager
   ```

3. **Check environment variables**:

   ```bash
   echo $POSTGRES_HOST
   echo $POSTGRES_PORT
   echo $POSTGRES_DB
   ```

### Schema Application Issues

1. **Check file permissions**:

   ```bash
   ls -la scripts/
   ```

2. **Verify schema files exist**:

   ```bash
   ls -la src/infrastructure/persistence/postgres/schema/
   ```

3. **Check PostgreSQL logs**:

   ```bash
   docker logs <postgres-container-name>
   ```

## Integration with CI/CD

This script can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Setup Database Schema
  run: |
    cd apps/task-manager
    npm run db:setup
  env:
    POSTGRES_HOST: ${{ secrets.POSTGRES_HOST }}
    POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
    POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
    POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
```
