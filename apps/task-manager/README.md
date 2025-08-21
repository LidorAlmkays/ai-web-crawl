# Task Manager Service

A robust, scalable task management service for handling asynchronous web crawling operations with comprehensive monitoring, observability, and real-time status tracking.

## 🎯 Overview

The Task Manager Service is a core component of the AI Web Crawling system that:

- **Manages Web Crawl Tasks**: Handles the complete lifecycle of web crawling tasks from creation to completion
- **Real-time Status Tracking**: Provides real-time updates on task progress through Kafka messaging
- **Comprehensive Monitoring**: Offers detailed metrics and health monitoring for operational insights
- **Observability**: Integrates with OpenTelemetry for distributed tracing and logging
- **Scalable Architecture**: Built with clean architecture principles for maintainability and scalability

## 🏗️ Technology Stack

### Core Technologies
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with connection pooling
- **Message Broker**: Apache Kafka for event-driven communication
- **Observability**: OpenTelemetry with OTLP exporter

### Key Dependencies
- **Database**: `pg` (PostgreSQL client), `slonik` (connection pooling)
- **Messaging**: `kafkajs` (Kafka client)
- **Validation**: `zod` (runtime validation), `class-validator` (DTO validation)
- **Observability**: `@opentelemetry/*` packages
- **Testing**: Jest with comprehensive test coverage

### Architecture Pattern
- **Clean Architecture**: Separation of concerns with domain, application, and infrastructure layers
- **Hexagonal Architecture**: Ports and adapters for loose coupling
- **Event-Driven**: Kafka-based messaging for asynchronous communication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Apache Kafka 3+
- Docker & Docker Compose (for local development)

### Installation & Setup

1. **Clone and Install Dependencies**
   ```bash
   # From workspace root
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp apps/task-manager/env.example apps/task-manager/.env
   
   # Edit configuration for your environment
   nano apps/task-manager/.env
   ```

3. **Database Setup**
   ```bash
   # Apply database schema
   npm run apply-schema
   ```

4. **Start the Service**
   ```bash
   # Development mode
   nx serve task-manager
   
   # Or build and run
   nx build task-manager
   nx serve task-manager
   ```

### Docker Setup
```bash
# Start all required services
docker-compose -f deployment/devops/docker-compose.yml up -d

# Start observability stack
docker-compose -f deployment/observability/docker-compose.yml up -d
```

## 📡 API Endpoints

### Health Check Endpoints
- `GET /api/health` - Basic health status
- `GET /api/health/detailed` - Comprehensive health information
- `GET /api/health/database` - Database-specific health check
- `GET /api/health/kafka` - Kafka-specific health check
- `GET /api/health/service` - Service-specific health check
- `GET /api/health/ready` - Kubernetes readiness probe
- `GET /api/health/live` - Kubernetes liveness probe

### Metrics Endpoints
- `GET /api/metrics` - Prometheus format metrics
- `GET /api/metrics/json` - JSON format metrics
- `GET /api/metrics/config` - Metrics configuration

### Query Parameters
- `hours` - Time range for metrics (e.g., `?hours=24`)

## 🔧 Configuration

The service uses environment-based configuration with comprehensive validation. Key configuration areas:

### Application Configuration
- **Environment**: `NODE_ENV` (development/production/test)
- **Port**: `APP_PORT` (default: 3000)
- **Performance**: Timeouts and graceful shutdown settings

### Database Configuration
- **Connection**: Host, port, credentials, SSL settings
- **Pooling**: Connection pool size and timeout settings
- **Database**: `tasks_manager` (default)

### Kafka Configuration
- **Brokers**: `KAFKA_BROKERS` (default: localhost:9092)
- **Topics**: Task status and web crawl request topics
- **Security**: SSL and SASL authentication options
- **Timeouts**: Connection and session timeout settings

### Observability Configuration
- **OTLP Endpoint**: `OTEL_EXPORTER_OTLP_ENDPOINT` (default: http://localhost:4318)
- **Tracing**: Sampling rate and batch processing settings
- **Logs**: OpenTelemetry log export configuration

For detailed configuration options, see [Configuration Documentation](./docs/configuration.md).

## 📊 Database Schema

The service uses PostgreSQL with the following core structure:

### Main Table
- **`web_crawl_tasks`**: Stores all task information including status, results, and metadata

### Key Features
- **UUID Primary Keys**: Auto-generated unique identifiers
- **Status Tracking**: Enum-based status management
- **Timestamps**: Comprehensive audit trail
- **Indexing**: Optimized for common query patterns

### Database Functions
- **Query Functions**: Find tasks by ID, status, and other criteria
- **Count Functions**: Aggregate statistics by status
- **Metrics Functions**: Time-based metrics calculations

For complete database documentation, see [Database Schema Documentation](./docs/database.md).

## 🔄 Kafka Topics

### Consumer Topics
- **`task-status`**: Receives task status updates and completion notifications
- **`requests-web-crawl`**: Receives new web crawl task requests

### Message Types
- **Task Status Messages**: Status updates, completions, and errors
- **Web Crawl Requests**: New task creation requests

For detailed Kafka documentation, see [Kafka Integration Documentation](./docs/kafka.md).

## 📈 Monitoring & Observability

### Metrics
- **Task Counts**: New, completed, and error tasks
- **Performance**: Response times and throughput
- **System Health**: Database and Kafka connectivity

### Tracing
- **Distributed Tracing**: End-to-end request tracking
- **Business Events**: Task lifecycle events
- **Performance Insights**: Database and Kafka operation timing

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Trace Integration**: Log-trace correlation
- **Level-based**: Debug, info, warn, error levels

For observability details, see [Observability Documentation](./docs/observability.md).

## 🧪 Testing

### Test Commands
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Test Kafka connection
npm run test-kafka

# Test task publishing
npm run publish-new-task

# Test task updates
npm run test-task-updates
```

### Test Coverage
- **Unit Tests**: Domain entities, services, and utilities
- **Integration Tests**: Database and Kafka operations
- **End-to-End Tests**: Complete workflow validation

## 📚 Documentation

### Core Documentation
- [Configuration Guide](./docs/configuration.md) - Detailed configuration options
- [Database Schema](./docs/database.md) - Complete database structure and functions
- [Kafka Integration](./docs/kafka.md) - Message formats and topic configuration
- [Observability](./docs/observability.md) - Monitoring, tracing, and logging setup

### Architecture Documentation
- [Architecture Overview](./docs/architecture.md) - System design and patterns
- [API Reference](./docs/api.md) - Complete API documentation
- [Development Guide](./docs/development.md) - Contributing and development setup

## 🔧 Development

### Project Structure
```
src/
├── api/                    # API layer (REST & Kafka)
├── application/           # Application services
├── common/               # Shared utilities and types
├── config/               # Configuration management
├── domain/               # Domain entities and business logic
├── infrastructure/       # External integrations
└── server.ts            # Application entry point
```

### Key Commands
```bash
# Type checking
nx typecheck task-manager

# Linting
nx lint task-manager

# Building
nx build task-manager

# Development server
nx serve task-manager
```

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Secure configuration management
- **Database**: Connection pooling and SSL configuration
- **Kafka**: Security and high availability setup
- **Observability**: Sampling rates and retention policies
- **Health Checks**: Kubernetes readiness and liveness probes

### Docker Deployment
```bash
# Build production image
docker build -t task-manager .

# Run with environment configuration
docker run -p 3000:3000 --env-file .env task-manager
```

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Follow the DTO validation rules for new endpoints
5. Ensure proper observability integration

## 📄 License

This project is part of the AI Web Crawling system and follows the same licensing terms.

---

For more detailed information about specific components, please refer to the individual documentation files in the `docs/` directory.
