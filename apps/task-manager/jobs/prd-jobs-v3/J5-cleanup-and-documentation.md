# Job 5: Cleanup and Documentation

## Objective

Complete the PRD v3 implementation by cleaning up the codebase, updating documentation, and ensuring all changes are properly documented and maintainable.

## Problem Analysis

After implementing J1-J4, we need to:

1. **Code Cleanup**: Remove any temporary code, unused imports, or debugging statements
2. **Documentation Updates**: Update all relevant documentation to reflect the new implementation
3. **Configuration Management**: Ensure all configuration files are properly documented
4. **README Updates**: Update project README with new features and setup instructions
5. **Migration Guide**: Create documentation for users migrating from the old system

## Solution

### 1. Code Cleanup

#### Remove Temporary Code

**File**: `src/infrastructure/persistence/postgres/adapters/web-crawl-task.repository.adapter.ts`

```typescript
// Remove any console.log statements
// Remove any TODO comments
// Remove any debugging code
// Ensure proper error handling

export class WebCrawlTaskRepositoryAdapter implements IWebCrawlTaskRepositoryPort {
  constructor(private readonly client: any, private readonly logger: ILogger) {}

  async createWebCrawlTask(userEmail: string, url: string, status: TaskStatus, createdAt: Date, updatedAt: Date): Promise<WebCrawlTask> {
    try {
      const result = await this.client.query('SELECT * FROM create_web_crawl_task($1, $2, $3, $4, $5)', [userEmail, url, status, createdAt, updatedAt]);

      if (result.rows.length === 0) {
        throw new Error('Failed to create web crawl task');
      }

      return this.mapRowToEntity(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating web crawl task', { error, userEmail, url, status });
      throw error;
    }
  }

  // ... other methods with proper error handling and logging
}
```

#### Clean Up Logger Files

**File**: `src/common/utils/logger-factory.ts`

```typescript
// Remove any debugging code
// Ensure proper singleton pattern
// Add proper JSDoc comments

/**
 * Logger Factory for creating and managing logger instances
 * Supports three logging formats: simple, structured, and otel
 */
export class LoggerFactory {
  private static instance: ILogger;

  /**
   * Get the configured logger instance
   * @returns ILogger instance based on LOG_FORMAT environment variable
   */
  static getLogger(): ILogger {
    if (!LoggerFactory.instance) {
      const logFormat = process.env.LOG_FORMAT || 'simple';

      switch (logFormat) {
        case 'simple':
          LoggerFactory.instance = new SimpleLoggerImpl();
          break;
        case 'structured':
          LoggerFactory.instance = new StructuredLoggerImpl();
          break;
        case 'otel':
          LoggerFactory.instance = new OtelLoggerImpl();
          break;
        default:
          LoggerFactory.instance = new SimpleLoggerImpl();
      }
    }

    return LoggerFactory.instance;
  }

  /**
   * Reset the logger instance (useful for testing)
   */
  static resetLogger(): void {
    LoggerFactory.instance = undefined as any;
  }
}
```

#### Remove Unused Imports

Check all files for unused imports and remove them:

```typescript
// Before cleanup
import { createLogger, format, transports, Logger } from 'winston';
import chalk from 'chalk';
import { TaskStatus } from '../enums/task-status.enum';
import { WebCrawlTask } from '../entities/web-crawl-task.entity';
import { IWebCrawlTaskRepositoryPort } from '../ports/web-crawl-task-repository.port';
import { ILogger } from '../utils/logger-factory';
import { validateDto } from '../utils/validation';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

// After cleanup
import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';
import { TaskStatus } from '../enums/task-status.enum';
import { WebCrawlTask } from '../entities/web-crawl-task.entity';
import { IWebCrawlTaskRepositoryPort } from '../ports/web-crawl-task-repository.port';
import { ILogger } from '../utils/logger-factory';
```

### 2. Documentation Updates

#### Update Main README

**File**: `README.md`

````markdown
# Task Manager Service

A robust task management service with enhanced logging, observability, and database operations.

## Features

- **Enhanced Logging System**: Three-tier logging (Simple, Structured, OTel)
- **Observability Stack**: Complete monitoring with Jaeger, Prometheus, Loki, and Grafana
- **Database Operations**: Optimized PostgreSQL operations with stored procedures
- **Kafka Integration**: Message processing with validation
- **Clean Architecture**: Well-structured codebase following clean architecture principles

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker and Docker Compose
- Kafka (for message processing)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
````

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the observability stack:

   ```bash
   cd deployment
   docker-compose -f docker-compose.observability.yml up -d
   ```

5. Run database migrations:

   ```bash
   npm run db:migrate
   ```

6. Start the service:
   ```bash
   npm run start:dev
   ```

## Logging Configuration

The service supports three logging formats:

### Simple Logger (Development)

```bash
LOG_FORMAT=simple
```

Output: `🔴[2025-01-10T10:30:00.000Z]:Error message`

### Structured Logger (Production)

```bash
LOG_FORMAT=structured
```

Output: `🔴[level:ERROR,service:Task Manager,timestamp:2025-01-10 10:30:00]:Error message`

### OTel Logger (Observability)

```bash
LOG_FORMAT=otel
```

Sends structured logs to OpenTelemetry collector for distributed tracing.

## Observability Stack

### Access Points

- **Grafana**: http://localhost:3000 (admin/admin)
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100

### Features

- Distributed tracing with Jaeger
- Metrics collection with Prometheus
- Log aggregation with Loki
- Visualization with Grafana

## Database Schema

The service uses PostgreSQL with the following key components:

### Tables

- `web_crawl_tasks`: Main task storage
- `task_status`: Enum for task states

### Stored Procedures

- `create_web_crawl_task`: Create new tasks
- `update_web_crawl_task`: Update existing tasks
- `find_web_crawl_task_by_id`: Find task by ID
- `find_web_crawl_tasks_by_status`: Find tasks by status
- `find_web_crawl_tasks_by_user_email`: Find tasks by user email

## API Endpoints

### Kafka Topics

- `new-tasks-topic`: New task creation
- `tasks-status-topic`: Task status updates

### Message Formats

#### New Task Message

```json
{
  "taskId": "uuid",
  "status": "not_completed",
  "createdAt": "2025-01-10T10:30:00.000Z"
}
```

#### Completed Task Message

```json
{
  "taskId": "uuid",
  "status": "completed_success",
  "result": { "data": "result" },
  "completedAt": "2025-01-10T10:30:00.000Z"
}
```

## Development

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking
npm run type-check
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/task_manager

# Logging
LOG_LEVEL=debug
LOG_FORMAT=simple
LOG_COLORS=true

# OTEL
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=task-manager
OTEL_SERVICE_VERSION=1.0.0

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=task-manager
```

## Architecture

The service follows Clean Architecture principles:

```
src/
├── api/                    # API Layer (Kafka, WebSocket)
├── application/            # Application Layer (Services, Ports)
├── domain/                 # Domain Layer (Entities, Enums)
├── infrastructure/         # Infrastructure Layer (Database, External Services)
└── common/                 # Shared utilities and types
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## License

MIT License

````

#### Create API Documentation

**File**: `docs/api.md`

```markdown
# API Documentation

## Overview

The Task Manager service provides a robust API for managing web crawl tasks through Kafka messaging and WebSocket connections.

## Kafka API

### Topics

#### new-tasks-topic
Receives new task creation requests.

**Message Format:**
```json
{
  "taskId": "string (UUID)",
  "status": "not_completed",
  "createdAt": "string (ISO 8601)"
}
````

**Validation Rules:**

- `taskId`: Required, valid UUID
- `status`: Must be "not_completed"
- `createdAt`: Required, valid ISO 8601 timestamp

#### tasks-status-topic

Receives task status updates.

**Message Format:**

```json
{
  "taskId": "string (UUID)",
  "status": "completed_success | completed_error",
  "result": "object (optional)",
  "completedAt": "string (ISO 8601)"
}
```

**Validation Rules:**

- `taskId`: Required, valid UUID
- `status`: Must be "completed_success" or "completed_error"
- `result`: Optional object
- `completedAt`: Required, valid ISO 8601 timestamp

### Error Handling

All Kafka messages are validated using class-validator. Invalid messages are rejected with detailed error information.

## WebSocket API

### Connection

Connect to WebSocket endpoint: `ws://localhost:3001`

### Authentication

Send authentication message:

```json
{
  "type": "auth",
  "email": "user@example.com"
}
```

### Submit Crawl Request

```json
{
  "type": "submit_crawl_request",
  "url": "https://example.com",
  "query": "search query"
}
```

### Response Format

```json
{
  "type": "crawl_response",
  "taskId": "uuid",
  "status": "not_completed | completed_success | completed_error",
  "result": "object (optional)",
  "error": "string (optional)"
}
```

## Error Codes

| Code | Description                           |
| ---- | ------------------------------------- |
| 400  | Bad Request - Invalid message format  |
| 401  | Unauthorized - Invalid authentication |
| 404  | Not Found - Task not found            |
| 500  | Internal Server Error                 |

## Rate Limiting

- Kafka: 1000 messages per minute per client
- WebSocket: 100 requests per minute per connection

## Monitoring

All API calls are logged and monitored through the observability stack:

- **Logs**: Structured logging with trace correlation
- **Metrics**: Request rates, error rates, response times
- **Traces**: Distributed tracing for request flows

````

#### Create Deployment Guide

**File**: `docs/deployment.md`

```markdown
# Deployment Guide

## Overview

This guide covers deploying the Task Manager service in various environments.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL 14+
- Kafka cluster
- Node.js 18+ (for development)

## Environment Setup

### Development

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd task-manager
   npm install
````

2. **Environment Variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Observability Stack**

   ```bash
   cd deployment
   docker-compose -f docker-compose.observability.yml up -d
   ```

4. **Database Setup**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Service**
   ```bash
   npm run start:dev
   ```

### Production

1. **Build Docker Image**

   ```bash
   docker build -t task-manager:latest .
   ```

2. **Environment Configuration**

   ```bash
   # Production environment variables
   NODE_ENV=production
   LOG_FORMAT=structured
   LOG_LEVEL=info
   DATABASE_URL=postgresql://user:password@db:5432/task_manager
   KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Kubernetes

1. **Create Namespace**

   ```bash
   kubectl create namespace task-manager
   ```

2. **Apply ConfigMaps and Secrets**

   ```bash
   kubectl apply -f k8s/configmaps/
   kubectl apply -f k8s/secrets/
   ```

3. **Deploy Services**
   ```bash
   kubectl apply -f k8s/deployments/
   kubectl apply -f k8s/services/
   ```

## Observability Stack Deployment

### Development

```bash
cd deployment
docker-compose -f docker-compose.observability.yml up -d
```

### Production

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/observability/

# Or use Helm
helm install observability ./helm/observability
```

## Database Migration

### Development

```bash
npm run db:migrate
npm run db:seed
```

### Production

```bash
# Using Docker
docker run --rm \
  -e DATABASE_URL=$DATABASE_URL \
  task-manager:latest \
  npm run db:migrate

# Using Kubernetes
kubectl run db-migrate --rm -it \
  --image=task-manager:latest \
  --env="DATABASE_URL=$DATABASE_URL" \
  -- npm run db:migrate
```

## Monitoring and Alerting

### Health Checks

- **Service Health**: `GET /health`
- **Database Health**: `GET /health/db`
- **Kafka Health**: `GET /health/kafka`

### Metrics

Key metrics to monitor:

- Task creation rate
- Task completion rate
- Error rate
- Response times
- Database connection pool usage

### Alerts

Configure alerts for:

- High error rate (>5%)
- High response time (>2s)
- Database connection failures
- Kafka connectivity issues

## Backup and Recovery

### Database Backup

```bash
# Automated backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Log Backup

```bash
# Rotate logs daily
logrotate /etc/logrotate.d/task-manager
```

## Security

### Network Security

- Use TLS for all external communications
- Implement network policies in Kubernetes
- Use VPN for database access

### Application Security

- Validate all inputs
- Use environment variables for secrets
- Implement rate limiting
- Regular security updates

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   - Check DATABASE_URL
   - Verify network connectivity
   - Check connection pool settings

2. **Kafka Connection Issues**

   - Verify KAFKA_BROKERS
   - Check network connectivity
   - Verify topic configuration

3. **Logging Issues**
   - Check LOG_FORMAT setting
   - Verify file permissions
   - Check disk space

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Enable OTEL logging
LOG_FORMAT=otel npm start
```

## Performance Tuning

### Database

- Optimize connection pool size
- Add database indexes
- Monitor query performance

### Application

- Tune Node.js memory settings
- Optimize Kafka consumer settings
- Monitor garbage collection

### Infrastructure

- Scale horizontally
- Use load balancers
- Implement caching

````

### 3. Configuration Management

#### Update Environment Configuration

**File**: `config/index.ts`

```typescript
/**
 * Application configuration
 * Centralized configuration management
 */
export const config = {
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/task_manager',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'simple',
    colors: process.env.LOG_COLORS === 'true',
  },

  // OTEL configuration
  otel: {
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    serviceName: process.env.OTEL_SERVICE_NAME || 'task-manager',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  },

  // Kafka configuration
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'task-manager',
    topics: {
      newTasks: process.env.KAFKA_NEW_TASKS_TOPIC || 'new-tasks-topic',
      taskStatus: process.env.KAFKA_TASK_STATUS_TOPIC || 'tasks-status-topic',
    },
  },

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost',
  },
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const required = [
    'DATABASE_URL',
    'KAFKA_BROKERS',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
````

#### Create Configuration Documentation

**File**: `docs/configuration.md`

````markdown
# Configuration Guide

## Overview

The Task Manager service uses environment variables for configuration. This guide covers all available configuration options.

## Environment Variables

### Database Configuration

| Variable       | Default                                    | Description                           |
| -------------- | ------------------------------------------ | ------------------------------------- |
| `DATABASE_URL` | `postgresql://localhost:5432/task_manager` | PostgreSQL connection string          |
| `DB_POOL_MIN`  | `2`                                        | Minimum database connection pool size |
| `DB_POOL_MAX`  | `10`                                       | Maximum database connection pool size |

### Logging Configuration

| Variable     | Default  | Description                           |
| ------------ | -------- | ------------------------------------- |
| `LOG_LEVEL`  | `debug`  | Log level (error, warn, info, debug)  |
| `LOG_FORMAT` | `simple` | Log format (simple, structured, otel) |
| `LOG_COLORS` | `true`   | Enable colored output                 |

### OpenTelemetry Configuration

| Variable                      | Default                           | Description             |
| ----------------------------- | --------------------------------- | ----------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | OTEL collector endpoint |
| `OTEL_SERVICE_NAME`           | `task-manager`                    | Service name for traces |
| `OTEL_SERVICE_VERSION`        | `1.0.0`                           | Service version         |

### Kafka Configuration

| Variable                  | Default              | Description                           |
| ------------------------- | -------------------- | ------------------------------------- |
| `KAFKA_BROKERS`           | `localhost:9092`     | Comma-separated list of Kafka brokers |
| `KAFKA_CLIENT_ID`         | `task-manager`       | Kafka client ID                       |
| `KAFKA_NEW_TASKS_TOPIC`   | `new-tasks-topic`    | Topic for new task messages           |
| `KAFKA_TASK_STATUS_TOPIC` | `tasks-status-topic` | Topic for task status updates         |

### Server Configuration

| Variable | Default     | Description |
| -------- | ----------- | ----------- |
| `PORT`   | `3001`      | Server port |
| `HOST`   | `localhost` | Server host |

## Configuration Examples

### Development

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/task_manager_dev
LOG_FORMAT=simple
LOG_LEVEL=debug
KAFKA_BROKERS=localhost:9092
```
````

### Production

```bash
# .env
DATABASE_URL=postgresql://user:password@db:5432/task_manager
LOG_FORMAT=structured
LOG_LEVEL=info
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
```

### Testing

```bash
# .env.test
DATABASE_URL=postgresql://localhost:5432/task_manager_test
LOG_FORMAT=simple
LOG_LEVEL=error
KAFKA_BROKERS=localhost:9092
```

## Configuration Validation

The application validates required configuration on startup:

```typescript
import { validateConfig } from './config';

// Validate configuration
validateConfig();
```

Required variables:

- `DATABASE_URL`
- `KAFKA_BROKERS`

## Environment-Specific Configuration

### Development

- Simple logging format
- Debug log level
- Local database and Kafka

### Staging

- Structured logging format
- Info log level
- Staging database and Kafka
- OTEL integration

### Production

- Structured logging format
- Info log level
- Production database and Kafka
- Full OTEL integration
- Monitoring and alerting

## Security Considerations

1. **Secrets Management**

   - Use environment variables for secrets
   - Never commit secrets to version control
   - Use Kubernetes secrets or Docker secrets

2. **Network Security**

   - Use TLS for database connections
   - Use SASL for Kafka authentication
   - Implement network policies

3. **Access Control**
   - Limit database access
   - Use Kafka ACLs
   - Implement API authentication

````

### 4. Migration Guide

**File**: `docs/migration-guide.md`

```markdown
# Migration Guide

## Overview

This guide helps users migrate from the previous version to the new enhanced Task Manager service.

## Breaking Changes

### 1. Database Schema Changes

#### Enum Values
The `task_status` enum values have changed:

**Old Values:**
- `new`
- `in_progress`
- `completed`
- `error`

**New Values:**
- `not_completed`
- `completed_success`
- `completed_error`

#### Migration Script
```sql
-- Update existing data
UPDATE web_crawl_tasks
SET status = CASE
  WHEN status = 'new' THEN 'not_completed'
  WHEN status = 'in_progress' THEN 'not_completed'
  WHEN status = 'completed' THEN 'completed_success'
  WHEN status = 'error' THEN 'completed_error'
  ELSE status
END;
````

### 2. Logging Format Changes

#### Old Format

```
[2025-01-10 10:30:00] [ERROR] Error message
```

#### New Formats

**Simple Logger:**

```
🔴[2025-01-10T10:30:00.000Z]:Error message
```

**Structured Logger:**

```
🔴[level:ERROR,service:Task Manager,timestamp:2025-01-10 10:30:00]:Error message
```

### 3. API Changes

#### Kafka Message Format

**Old Format:**

```json
{
  "id": "uuid",
  "user_email": "user@example.com",
  "status": "new"
}
```

**New Format:**

```json
{
  "taskId": "uuid",
  "status": "not_completed",
  "createdAt": "2025-01-10T10:30:00.000Z"
}
```

## Migration Steps

### Step 1: Backup Data

```bash
# Backup database
pg_dump $DATABASE_URL > backup_before_migration.sql

# Backup configuration
cp .env .env.backup
```

### Step 2: Update Environment Variables

```bash
# Add new environment variables
echo "LOG_FORMAT=structured" >> .env
echo "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces" >> .env
```

### Step 3: Run Database Migration

```bash
# Run schema updates
npm run db:migrate

# Run data migration
npm run db:migrate-data
```

### Step 4: Update Application Code

```typescript
// Old code
import { TaskStatus } from './enums/task-status.enum';
const status = TaskStatus.NEW;

// New code
import { TaskStatus } from './enums/task-status.enum';
const status = TaskStatus.NOT_COMPLETED;
```

### Step 5: Update Logging

```typescript
// Old code
console.log('Error message');

// New code
import { logger } from './common/utils/logger';
logger.error('Error message');
```

### Step 6: Test Migration

```bash
# Run tests
npm run test:all

# Test with real data
npm run test:integration
```

## Rollback Plan

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup_before_migration.sql
```

### Application Rollback

```bash
# Revert to previous version
git checkout v1.0.0
npm install
```

### Configuration Rollback

```bash
# Restore configuration
cp .env.backup .env
```

## Testing Migration

### Pre-Migration Tests

1. Run existing test suite
2. Verify current functionality
3. Document current behavior

### Post-Migration Tests

1. Run new test suite
2. Verify new functionality
3. Test error scenarios
4. Performance testing

### Integration Tests

1. Test with real Kafka messages
2. Test database operations
3. Test logging output
4. Test observability stack

## Common Issues

### 1. Enum Value Errors

**Error:** `invalid input value for enum task_status: "new"`

**Solution:** Run the database migration script to update existing data.

### 2. Logging Format Issues

**Error:** Unexpected log format

**Solution:** Set `LOG_FORMAT=simple` for development or `LOG_FORMAT=structured` for production.

### 3. Kafka Message Validation Errors

**Error:** Validation failed for message

**Solution:** Update message format to match new DTOs.

### 4. Database Connection Issues

**Error:** Connection refused

**Solution:** Verify `DATABASE_URL` and database availability.

## Support

For migration issues:

1. Check the troubleshooting guide
2. Review the logs for error details
3. Contact the development team
4. Provide error logs and configuration details

````

### 5. Testing Documentation

**File**: `docs/testing.md`

```markdown
# Testing Guide

## Overview

This guide covers testing strategies and best practices for the Task Manager service.

## Test Types

### Unit Tests
Test individual components in isolation.

**Location:** `src/**/__tests__/*.spec.ts`

**Examples:**
- Logger implementations
- Entity methods
- Service logic
- Validation functions

### Integration Tests
Test component interactions.

**Location:** `src/**/__tests__/integration/*.spec.ts`

**Examples:**
- Database operations
- Kafka message processing
- Service layer integration

### End-to-End Tests
Test complete workflows.

**Location:** `src/__tests__/e2e/*.spec.ts`

**Examples:**
- Complete task lifecycle
- Error scenarios
- Performance under load

## Running Tests

### All Tests
```bash
npm run test:all
````

### Unit Tests Only

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

### Specific Test File

```bash
npm test -- --testPathPattern=logger
```

## Test Configuration

### Environment Setup

```bash
# Test environment variables
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/task_manager_test
LOG_FORMAT=simple
LOG_LEVEL=error
```

### Database Setup

```bash
# Create test database
createdb task_manager_test

# Run migrations
npm run db:migrate:test

# Seed test data
npm run db:seed:test
```

## Writing Tests

### Test Structure

```typescript
describe('ComponentName', () => {
  let component: Component;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(() => {
    mockDependency = createMockDependency();
    component = new Component(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something when condition', async () => {
      // Arrange
      const input = 'test input';
      mockDependency.method.mockResolvedValue('expected');

      // Act
      const result = await component.method(input);

      // Assert
      expect(result).toBe('expected');
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('test error'));

      // Act & Assert
      await expect(component.method('input')).rejects.toThrow('test error');
    });
  });
});
```

### Mocking

```typescript
// Mock dependencies
jest.mock('../dependency');

// Mock environment variables
process.env.TEST_VAR = 'test_value';

// Mock console methods
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
```

### Database Testing

```typescript
describe('Database Tests', () => {
  let client: any;

  beforeAll(async () => {
    client = await createTestClient();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await client.query('DELETE FROM web_crawl_tasks');
  });

  it('should create task', async () => {
    const task = await createTask(client, testData);
    expect(task).toBeDefined();
  });
});
```

## Test Data

### Fixtures

```typescript
// test/fixtures/tasks.ts
export const testTasks = [
  {
    id: 'test-id-1',
    userEmail: 'test1@example.com',
    url: 'https://example1.com',
    status: TaskStatus.NOT_COMPLETED,
  },
  {
    id: 'test-id-2',
    userEmail: 'test2@example.com',
    url: 'https://example2.com',
    status: TaskStatus.COMPLETED_SUCCESS,
  },
];
```

### Factories

```typescript
// test/factories/task.factory.ts
export class TaskFactory {
  static create(overrides: Partial<WebCrawlTask> = {}): WebCrawlTask {
    return new WebCrawlTask(overrides.id || generateId(), overrides.userEmail || 'test@example.com', overrides.url || 'https://example.com', overrides.status || TaskStatus.NOT_COMPLETED, overrides.result, overrides.createdAt || new Date(), overrides.updatedAt || new Date());
  }
}
```

## Performance Testing

### Load Testing

```typescript
describe('Performance Tests', () => {
  it('should handle concurrent operations', async () => {
    const promises = Array.from({ length: 100 }, () => createTask(testData));

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

### Memory Testing

```typescript
it('should not leak memory', () => {
  const initialMemory = process.memoryUsage().heapUsed;

  // Perform operations
  for (let i = 0; i < 1000; i++) {
    createTask(testData);
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;

  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
});
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: task_manager_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all
```

## Coverage

### Coverage Report

```bash
npm run test:coverage
```

### Coverage Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## Best Practices

1. **Test Naming**: Use descriptive test names
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Mock External Dependencies**: Don't test external services
4. **Test Error Scenarios**: Include error cases
5. **Keep Tests Fast**: Avoid slow operations
6. **Clean Up**: Reset state between tests
7. **Use Test Data**: Don't rely on production data

```

## Implementation Steps

### Step 1: Code Cleanup
1. Remove temporary code and debugging statements
2. Clean up unused imports
3. Add proper JSDoc comments
4. Ensure consistent code style

### Step 2: Documentation Updates
1. Update main README
2. Create API documentation
3. Create deployment guide
4. Create configuration guide

### Step 3: Migration Guide
1. Document breaking changes
2. Create migration scripts
3. Provide rollback instructions
4. Include troubleshooting guide

### Step 4: Testing Documentation
1. Document test strategies
2. Create test examples
3. Document CI/CD setup
4. Include best practices

### Step 5: Final Validation
1. Run all tests
2. Verify documentation accuracy
3. Test migration process
4. Validate configuration

## Success Criteria

- [ ] All temporary code removed
- [ ] Unused imports cleaned up
- [ ] Documentation is complete and accurate
- [ ] Migration guide is comprehensive
- [ ] All tests pass
- [ ] Code style is consistent
- [ ] Configuration is well-documented
- [ ] Deployment process is documented

## Dependencies

- All previous jobs completed (J1-J4)
- Code review completed
- Testing completed
- Documentation reviewed

## Risks and Mitigation

### Risks
1. **Documentation Inaccuracy**: Documentation might not match implementation
2. **Migration Issues**: Users might have trouble migrating
3. **Configuration Errors**: Incorrect configuration might cause issues

### Mitigation
1. **Documentation Review**: Thorough review of all documentation
2. **Migration Testing**: Test migration process thoroughly
3. **Configuration Validation**: Validate all configuration options
4. **User Feedback**: Gather feedback from early adopters
```
