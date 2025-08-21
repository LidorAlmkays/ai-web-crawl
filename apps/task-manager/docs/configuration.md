# Configuration Guide

This document provides comprehensive information about configuring the Task Manager Service for different environments.

## 📋 Overview

The Task Manager Service uses environment-based configuration with Zod schema validation for type safety and runtime validation. Configuration is organized into logical groups for easy management.

## 🔧 Environment Variables

### Application Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | enum | `development` | Environment mode (development/production/test) |
| `APP_NAME` | string | `task-manager` | Application name for logging and metrics |
| `APP_VERSION` | string | `1.0.0` | Application version |
| `APP_PORT` | number | `3000` | HTTP server port |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | number | `30000` | Graceful shutdown timeout in milliseconds |
| `REQUEST_TIMEOUT` | number | `30000` | Request timeout in milliseconds |

### Database Configuration (PostgreSQL)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `POSTGRES_USER` | string | `postgres` | Database username |
| `POSTGRES_PASSWORD` | string | `password` | Database password |
| `POSTGRES_DB` | string | `tasks_manager` | Database name |
| `POSTGRES_HOST` | string | `localhost` | Database host |
| `POSTGRES_PORT` | number | `5432` | Database port |
| `POSTGRES_SSL` | boolean | `false` | Enable SSL connection |
| `POSTGRES_MAX_CONNECTIONS` | number | `10` | Connection pool size |
| `POSTGRES_IDLE_TIMEOUT` | number | `30000` | Idle connection timeout (ms) |
| `POSTGRES_CONNECTION_TIMEOUT` | number | `10000` | Connection timeout (ms) |
| `POSTGRES_QUERY_TIMEOUT` | number | `30000` | Query timeout (ms) |

### Kafka Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `KAFKA_BROKERS` | string | `localhost:9092` | Comma-separated list of Kafka brokers |
| `KAFKA_CLIENT_ID` | string | `task-manager` | Kafka client identifier |
| `KAFKA_GROUP_ID` | string | `task-manager-group` | Consumer group ID |
| `TASK_STATUS_TOPIC` | string | `task-status` | Topic for task status messages |
| `WEB_CRAWL_REQUEST_TOPIC` | string | `requests-web-crawl` | Topic for web crawl requests |
| `KAFKA_SSL_ENABLED` | boolean | `false` | Enable SSL for Kafka |
| `KAFKA_SASL_ENABLED` | boolean | `false` | Enable SASL authentication |
| `KAFKA_SASL_USERNAME` | string | - | SASL username |
| `KAFKA_SASL_PASSWORD` | string | - | SASL password |
| `KAFKA_SASL_MECHANISM` | enum | `plain` | SASL mechanism (plain/scram-sha-256/scram-sha-512) |
| `KAFKA_CONNECTION_TIMEOUT` | number | `3000` | Connection timeout (ms) |
| `KAFKA_REQUEST_TIMEOUT` | number | `30000` | Request timeout (ms) |
| `KAFKA_SESSION_TIMEOUT` | number | `30000` | Session timeout (ms) |
| `KAFKA_HEARTBEAT_INTERVAL` | number | `3000` | Heartbeat interval (ms) |
| `KAFKA_RETRY_BACKOFF` | number | `100` | Retry backoff (ms) |
| `KAFKA_MAX_RETRY_ATTEMPTS` | number | `3` | Maximum retry attempts |

### Observability Configuration (OpenTelemetry)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | string | `http://localhost:4318` | OTLP exporter base endpoint |
| `TRACING_ENABLED` | boolean | `true` | Enable distributed tracing |
| `TRACING_SAMPLING_RATE` | number | `1.0` | Trace sampling rate (0.0-1.0) |
| `TRACING_MAX_QUEUE_SIZE` | number | `2048` | Maximum trace queue size |
| `TRACING_MAX_BATCH_SIZE` | number | `512` | Maximum batch size for traces |
| `TRACING_DELAY_MS` | number | `5000` | Batch delay in milliseconds |
| `TRACING_TIMEOUT_MS` | number | `30000` | Export timeout in milliseconds |
| `OTEL_LOGS_ENABLED` | boolean | `true` | Enable OpenTelemetry logs |

### REST API Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HEALTH_CHECK_ENABLED` | boolean | `true` | Enable health check endpoints |
| `HEALTH_CHECK_PORT` | number | `3001` | Health check server port |
| `HEALTH_CHECK_PATH` | string | `/health` | Health check base path |
| `CORS_ENABLED` | boolean | `true` | Enable CORS |
| `CORS_ORIGIN` | string | `*` | CORS origin pattern |
| `METRICS_DEFAULT_TIME_RANGE_HOURS` | number | `24` | Default metrics time range |
| `METRICS_AVAILABLE_TIME_RANGES` | string | `1,6,12,24,48,72` | Available time ranges |
| `METRICS_REFRESH_INTERVAL_SECONDS` | number | `15` | Metrics refresh interval |

## 🌍 Environment-Specific Configurations

### Development Environment

```bash
# Development configuration
NODE_ENV=development
APP_PORT=3000
POSTGRES_HOST=localhost
KAFKA_BROKERS=localhost:9092
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
TRACING_SAMPLING_RATE=1.0
OTEL_LOGS_ENABLED=true
```

### Production Environment

```bash
# Production configuration
NODE_ENV=production
APP_PORT=3000
POSTGRES_SSL=true
POSTGRES_MAX_CONNECTIONS=20
KAFKA_SSL_ENABLED=true
KAFKA_SASL_ENABLED=true
KAFKA_SASL_USERNAME=your-kafka-username
KAFKA_SASL_PASSWORD=your-kafka-password
TRACING_SAMPLING_RATE=0.1
OTEL_LOGS_ENABLED=false
```

### Test Environment

```bash
# Test configuration
NODE_ENV=test
APP_PORT=3001
POSTGRES_DB=tasks_manager_test
KAFKA_BROKERS=localhost:9092
TRACING_ENABLED=false
OTEL_LOGS_ENABLED=false
```

### Docker Environment

```bash
# Docker configuration
NODE_ENV=development
POSTGRES_HOST=postgres
KAFKA_BROKERS=kafka:9092
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

## 🔐 Security Configuration

### SSL/TLS Configuration

#### PostgreSQL SSL
```bash
# Enable SSL for PostgreSQL
POSTGRES_SSL=true
```

#### Kafka SSL
```bash
# Enable SSL for Kafka
KAFKA_SSL_ENABLED=true
```

### Authentication Configuration

#### Kafka SASL Authentication
```bash
# Enable SASL authentication
KAFKA_SASL_ENABLED=true
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
KAFKA_SASL_MECHANISM=scram-sha-256
```

## 📊 Performance Configuration

### Database Connection Pooling
```bash
# Optimize connection pool for production
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=60000
POSTGRES_CONNECTION_TIMEOUT=5000
POSTGRES_QUERY_TIMEOUT=30000
```

### Kafka Performance Settings
```bash
# Optimize Kafka for high throughput
KAFKA_REQUEST_TIMEOUT=60000
KAFKA_SESSION_TIMEOUT=45000
KAFKA_HEARTBEAT_INTERVAL=3000
KAFKA_MAX_RETRY_ATTEMPTS=5
```

### Observability Performance
```bash
# Optimize tracing for production
TRACING_SAMPLING_RATE=0.1
TRACING_MAX_QUEUE_SIZE=4096
TRACING_MAX_BATCH_SIZE=1024
TRACING_DELAY_MS=1000
```

## 🔍 Configuration Validation

The service uses Zod schemas for runtime validation of all environment variables. Invalid configurations will cause the service to fail fast during startup.

### Validation Examples

```typescript
// Valid configuration
NODE_ENV=production
APP_PORT=3000
POSTGRES_PORT=5432

// Invalid configuration (will cause startup failure)
NODE_ENV=invalid-env  // ❌ Invalid enum value
APP_PORT=invalid-port // ❌ Not a number
POSTGRES_PORT=-1      // ❌ Negative port number
```

## 🚀 Configuration Best Practices

### 1. Environment Separation
- Use different configuration files for each environment
- Never commit production secrets to version control
- Use environment-specific `.env` files

### 2. Security
- Enable SSL/TLS in production environments
- Use strong authentication for Kafka
- Implement proper secret management

### 3. Performance
- Tune connection pools based on load
- Adjust Kafka timeouts for your network
- Configure appropriate sampling rates for observability

### 4. Monitoring
- Set up health checks for all dependencies
- Configure appropriate log levels
- Enable distributed tracing for debugging

## 🔧 Configuration Management

### Using Environment Files
```bash
# Copy template
cp env.example .env

# Edit for your environment
nano .env

# Validate configuration
npm run validate-config
```

### Using Docker Environment Variables
```bash
# Pass environment variables directly
docker run -e NODE_ENV=production -e APP_PORT=3000 task-manager

# Use environment file
docker run --env-file .env task-manager
```

### Using Kubernetes ConfigMaps
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-manager-config
data:
  NODE_ENV: "production"
  APP_PORT: "3000"
  POSTGRES_HOST: "postgres-service"
  KAFKA_BROKERS: "kafka-service:9092"
```

## 📝 Configuration Examples

### Complete Development Configuration
```bash
# Application
NODE_ENV=development
APP_NAME=task-manager
APP_VERSION=1.0.0
APP_PORT=3000
GRACEFUL_SHUTDOWN_TIMEOUT=30000
REQUEST_TIMEOUT=30000

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=tasks_manager
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_SSL=false
POSTGRES_MAX_CONNECTIONS=10
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=10000
POSTGRES_QUERY_TIMEOUT=30000

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=task-manager
KAFKA_GROUP_ID=task-manager-group
TASK_STATUS_TOPIC=task-status
WEB_CRAWL_REQUEST_TOPIC=requests-web-crawl
KAFKA_SSL_ENABLED=false
KAFKA_SASL_ENABLED=false
KAFKA_CONNECTION_TIMEOUT=3000
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_SESSION_TIMEOUT=30000
KAFKA_HEARTBEAT_INTERVAL=3000
KAFKA_RETRY_BACKOFF=100
KAFKA_MAX_RETRY_ATTEMPTS=3

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=1.0
TRACING_MAX_QUEUE_SIZE=2048
TRACING_MAX_BATCH_SIZE=512
TRACING_DELAY_MS=5000
TRACING_TIMEOUT_MS=30000
OTEL_LOGS_ENABLED=true

# REST API
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=3001
HEALTH_CHECK_PATH=/health
CORS_ENABLED=true
CORS_ORIGIN=*
METRICS_DEFAULT_TIME_RANGE_HOURS=24
METRICS_AVAILABLE_TIME_RANGES=1,6,12,24,48,72
METRICS_REFRESH_INTERVAL_SECONDS=15
```

For more information about specific configuration areas, see the related documentation:
- [Database Configuration](./database.md)
- [Kafka Configuration](./kafka.md)
- [Observability Configuration](./observability.md)
