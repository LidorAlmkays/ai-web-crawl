# Project Structure - PRD v3 Implementation

## Overview

This document shows the updated project structure after implementing PRD v3 changes for logging improvements and database query fixes.

## Directory Structure

```
apps/task-manager/
├── src/
│   ├── api/                                    # API Layer (Kafka consumers)
│   │   └── kafka/
│   │       ├── consumers/                      # Kafka consumers
│   │       │   ├── base-consumer.ts
│   │       │   ├── consumer.interface.ts
│   │       │   └── task-status.consumer.ts
│   │       ├── dtos/                          # Data Transfer Objects
│   │       │   ├── completed-task-status-message.dto.ts
│   │       │   ├── error-task-status-message.dto.ts
│   │       │   ├── new-task-status-message.dto.ts
│   │       │   └── task-status-header.dto.ts  # ✅ Updated enum values
│   │       ├── handlers/                      # Message handlers
│   │       │   ├── base-handler.interface.ts
│   │       │   ├── base-handler.ts
│   │       │   └── task-status/
│   │       │       ├── complete-task.handler.ts    # ✅ Updated enum usage
│   │       │       ├── error-task.handler.ts       # ✅ Updated enum usage
│   │       │       ├── new-task.handler.ts         # ✅ Updated enum usage
│   │       │       └── task-status-router.handler.ts
│   │       ├── kafka-api.manager.ts
│   │       └── kafka.router.ts
│   ├── app.ts                                 # Composition root
│   ├── application/                           # Application Layer
│   │   ├── ports/                            # Business logic interfaces
│   │   │   └── web-crawl-task-manager.port.ts
│   │   └── services/                         # Business logic implementation
│   │       ├── application.factory.ts
│   │       └── web-crawl-task-manager.service.ts  # ✅ Updated enum usage
│   ├── common/                               # Shared utilities
│   │   ├── clients/                          # External client connections
│   │   │   ├── consumer-health-check.ts
│   │   │   ├── kafka-client.ts
│   │   │   └── kafka.factory.ts
│   │   ├── enums/                           # Application enums
│   │   │   ├── task-status.enum.ts          # ✅ Updated enum values
│   │   │   └── task-type.enum.ts
│   │   └── utils/                           # Utility functions
│   │       ├── logger.ts                     # ✅ Updated logger interface
│   │       ├── simple-logger.ts              # ✅ NEW: Simple logger
│   │       ├── structured-logger.ts          # ✅ NEW: Structured logger
│   │       ├── logger-factory.ts             # ✅ NEW: Logger factory
│   │       ├── validation.ts
│   │       └── kafka-log-creator.ts
│   ├── config/                               # Configuration
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── kafka.ts
│   │   ├── postgres.ts
│   │   └── logging.ts                        # ✅ NEW: Logging configuration
│   ├── domain/                               # Domain Layer
│   │   └── entities/
│   │       └── web-crawl-task.entity.ts      # ✅ Updated with helper methods
│   ├── infrastructure/                       # Infrastructure Layer
│   │   ├── persistence/                      # Data persistence
│   │   │   └── postgres/
│   │   │       ├── adapters/
│   │   │       │   └── web-crawl-task.repository.adapter.ts  # ✅ Fixed queries
│   │   │       ├── migrations/               # Database migrations
│   │   │       │   ├── 001-rename-data-to-result-rollback.sql
│   │   │       │   └── 001-rename-data-to-result.sql
│   │   │       ├── postgres.factory.ts
│   │   │       └── schema/                   # Database schema
│   │   │           ├── 00-main.sql
│   │   │           ├── 01-enums.sql          # ✅ Verified enum values
│   │   │           ├── 02-tables.sql
│   │   │           ├── 03-triggers.sql
│   │   │           ├── 04-stored-procedures.sql  # ✅ Verified procedures
│   │   │           ├── 05-query-functions.sql    # ✅ Verified functions
│   │   │           ├── 06-count-functions.sql
│   │   │           ├── 07-views.sql
│   │   │           ├── FUNCTIONS.md
│   │   │           └── README.md
│   │   └── ports/                            # Infrastructure interfaces
│   │       └── web-crawl-task-repository.port.ts
│   └── server.ts                             # HTTP server bootstrap
├── jobs/                                     # Development jobs
│   ├── prd-jobs-v1/
│   ├── prd-jobs-v2/
│   └── prd-jobs-v3/                          # ✅ NEW: PRD v3 jobs
│       ├── PRD.md                            # ✅ NEW: PRD v3 document
│       ├── J1-fix-database-queries.md        # ✅ NEW: Database fixes
│       ├── J2-implement-simple-logger.md     # ✅ NEW: Simple logger
│       ├── J3-update-enum-values.md          # ✅ NEW: Enum alignment
│       ├── J4-integration-testing.md         # ✅ NEW: Integration tests
│       ├── J5-cleanup-and-documentation.md   # ✅ NEW: Cleanup
│       └── project-structure.md              # ✅ NEW: This file
├── __tests__/                                # ✅ NEW: Test organization
│   ├── e2e/                                  # End-to-end tests
│   │   ├── task-lifecycle.e2e.spec.ts
│   │   ├── error-handling.e2e.spec.ts
│   │   └── logging.e2e.spec.ts
│   ├── integration/                          # Integration tests
│   │   ├── database.integration.spec.ts
│   │   ├── kafka.integration.spec.ts
│   │   └── logging.integration.spec.ts
│   ├── performance/                          # Performance tests
│   │   ├── database.performance.spec.ts
│   │   ├── kafka.performance.spec.ts
│   │   └── logging.performance.spec.ts
│   ├── utils/                                # Test utilities
│   │   ├── test-helpers.ts
│   │   └── test-data.ts
│   ├── fixtures/                             # Test data fixtures
│   │   └── test-data.ts
│   └── mocks/                                # Test mocks
│       ├── database.mock.ts
│       └── kafka.mock.ts
├── docs/                                     # ✅ NEW: Documentation
│   ├── architecture.md                       # ✅ NEW: Architecture docs
│   ├── api-reference.md                      # ✅ NEW: API docs
│   ├── troubleshooting.md                    # ✅ NEW: Troubleshooting
│   └── development-guide.md                  # ✅ NEW: Development guide
├── logs/                                     # Log files
│   ├── task-manager-combined.log
│   └── task-manager-error.log
├── .env.example                              # ✅ Updated: Environment variables
├── jest.config.ts                            # ✅ Updated: Test configuration
├── src/test-setup.ts                         # ✅ NEW: Test setup
├── eslint.config.mjs                         # ✅ Updated: Linting rules
├── package.json                              # ✅ Updated: Dependencies
├── README.md                                 # ✅ Updated: Project documentation
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.spec.json
└── tsconfig.tsbuildinfo
```

## Key Changes in PRD v3

### ✅ New Files Added

1. **Logger System**:

   - `src/common/utils/simple-logger.ts` - Simple, color-coded logger
   - `src/common/utils/structured-logger.ts` - Structured logger for OTEL
   - `src/common/utils/logger-factory.ts` - Logger factory pattern
   - `src/config/logging.ts` - Logging configuration

2. **Documentation**:

   - `docs/` directory with comprehensive documentation
   - Updated `README.md` with new features and configuration

3. **Testing**:
   - `__tests__/` directory with organized test structure
   - `src/test-setup.ts` - Test configuration and utilities

### ✅ Updated Files

1. **Database Layer**:

   - `web-crawl-task.repository.adapter.ts` - Fixed stored procedure usage
   - `task-status.enum.ts` - Aligned enum values with database

2. **Application Layer**:

   - `web-crawl-task.entity.ts` - Added helper methods
   - `web-crawl-task-manager.service.ts` - Updated enum usage

3. **API Layer**:

   - All Kafka handlers updated with correct enum values
   - DTOs updated with proper validation

4. **Configuration**:
   - `.env.example` - Added logging configuration
   - `package.json` - Added chalk dependency
   - `jest.config.ts` - Updated test configuration

### ✅ Architecture Improvements

1. **Dual Logging System**: Simple logger for development, structured for production
2. **Database Query Fixes**: Proper stored procedure usage
3. **Enum Alignment**: Consistent values across all layers
4. **Enhanced Testing**: Comprehensive test coverage
5. **Better Documentation**: Complete project documentation

## File Dependencies

### Logger System Dependencies

```
logger.ts → logger-factory.ts → simple-logger.ts | structured-logger.ts
```

### Database Layer Dependencies

```
repository.adapter.ts → stored-procedures.sql → database schema
```

### Application Layer Dependencies

```
service.ts → entity.ts → enum.ts → repository.port.ts
```

### API Layer Dependencies

```
handlers → DTOs → validation → service.ts
```

## Configuration Flow

### Environment Variables

```
.env → config/logging.ts → logger-factory.ts → logger implementation
```

### Database Configuration

```
.env → config/postgres.ts → postgres.factory.ts → repository.adapter.ts
```

### Kafka Configuration

```
.env → config/kafka.ts → kafka.factory.ts → consumers
```

## Testing Structure

### Test Organization

```
__tests__/
├── e2e/          # End-to-end workflow tests
├── integration/  # Component integration tests
├── performance/  # Performance and load tests
├── utils/        # Test utilities and helpers
├── fixtures/     # Test data fixtures
└── mocks/        # Mock implementations
```

### Test Dependencies

```
test-setup.ts → test-helpers.ts → test-data.ts → test files
```

## Deployment Considerations

### Environment-Specific Configuration

- **Development**: Simple logger, debug level, local database
- **Staging**: Structured logger, info level, staging database
- **Production**: Structured logger, warn level, production database

### Logging Configuration

- **Development**: `LOG_FORMAT=simple`, `LOG_COLORS=true`
- **Production**: `LOG_FORMAT=structured`, `LOG_COLORS=false`

### Database Configuration

- All environments use stored procedures
- Enum values consistent across environments
- Proper connection pooling and error handling

## Future Considerations

### OTEL Integration

- Structured logger ready for OpenTelemetry
- Trace correlation IDs
- Metrics integration
- Distributed tracing support

### Monitoring

- Health check endpoints
- Performance metrics
- Error rate monitoring
- Log aggregation setup

### Scalability

- Database connection pooling
- Kafka consumer group management
- Caching strategies
- Horizontal scaling support
