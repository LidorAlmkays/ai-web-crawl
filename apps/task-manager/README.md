# Task Manager Service

A microservice for managing web crawling tasks with OpenTelemetry observability.

## 📚 Documentation

- **[Architecture](docs/architecture.md)** - Clean architecture patterns and server/app separation
- **[API Reference](docs/api.md)** - REST endpoints and Kafka integration
- **[Database Schema](docs/database.md)** - PostgreSQL schema and functions
- **[Kafka Integration](docs/kafka.md)** - Message formats and consumer topics
- **[Configuration](docs/configuration.md)** - Environment variables and settings
- **[Observability](docs/observability.md)** - OpenTelemetry setup and monitoring
- **[Development Guide](docs/development.md)** - Setup, testing, and development workflow

## 🏗️ Architecture Pattern

This service follows a **Server/Application separation pattern** that should be adopted across all services in the monorepo:

### 🖥️ Server Layer (`src/server.ts`)
**Responsibility:** Process lifecycle management
- Signal handling (SIGINT, SIGTERM)
- Graceful shutdown coordination
- OpenTelemetry initialization/shutdown
- Process exit management

### 🏗️ Application Layer (`src/app.ts`) 
**Responsibility:** Service composition and startup
- Dependency injection and factory management
- Resource lifecycle (databases, message queues)
- HTTP server management
- Service configuration

**📖 See [Architecture Documentation](docs/architecture.md) for detailed patterns and guidelines.**

## Quick Start

```bash
# Install dependencies (from workspace root)
npm install

# Start the service
npx nx serve task-manager

# Health check
curl http://localhost:3000/api/health

# Metrics (Prometheus format)
curl http://localhost:3000/api/metrics
```

## Technology Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js for REST API
- **Database:** PostgreSQL with connection pooling
- **Messaging:** Apache Kafka for event streaming
- **Observability:** OpenTelemetry with OTLP export
- **Testing:** Jest for unit and integration tests

## Configuration

Configuration is environment-based using Zod validation:

```typescript
// Key environment variables
PORT=3000
NODE_ENV=development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
KAFKA_BROKERS=localhost:9092
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## API Endpoints

### Health Checks
- `GET /api/health` - Basic health status
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

### Metrics
- `GET /api/metrics` - Prometheus metrics

## Kafka Integration

### Consumer Topics
- `task-status` - Receives task status updates

### Message Processing
The service consumes messages for:
- New task creation
- Task completion events
- Task error handling

## Database Schema

The service uses PostgreSQL with:
- Task management tables
- Metrics aggregation tables
- Database functions for performance
- Migration scripts in `src/infrastructure/persistence/postgres/migrations/`

## Observability

### Structured Logging
All logs are structured and sent to OpenTelemetry:

```typescript
logger.info('Task processed', { 
  taskId: 'task-123', 
  duration: 1500,
  status: 'completed' 
});
```

### Tracing
Automatic tracing for:
- HTTP requests
- Database queries
- Kafka message processing

### Metrics
Custom metrics for:
- Task processing rates
- Error counts
- Database connection health

## Development

### Running Tests
```bash
# Unit tests
npx nx test task-manager

# Integration tests
npx nx test task-manager --testNamePattern="integration"
```

### Code Quality
```bash
# Linting
npx nx lint task-manager

# Type checking
npx nx run task-manager:build
```

## Deployment

The service is containerized and supports:
- Docker deployment
- Kubernetes deployment
- Health check endpoints for orchestrators
- Graceful shutdown for zero-downtime deployments

## For Other Services

When creating new services, follow this pattern:

1. **Copy the `server.ts` pattern** for process management
2. **Copy the `app.ts` pattern** for dependency injection
3. **Use structured logging** with the logger utility
4. **Implement health check endpoints**
5. **Follow the same folder structure**

**📖 See [Architecture Documentation](docs/architecture.md) for detailed architectural guidelines and patterns.**

## Support

For questions about this service or the architectural patterns, see:
- `ARCHITECTURE.md` - Detailed architecture documentation
- Service logs via OpenTelemetry collector
- Health check endpoints for monitoring