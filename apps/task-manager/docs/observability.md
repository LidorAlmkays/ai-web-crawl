# Observability Documentation

This document provides comprehensive information about the observability features in the Task Manager Service, including OpenTelemetry integration, distributed tracing, structured logging, and metrics collection.

## 📋 Overview

The Task Manager Service implements comprehensive observability using OpenTelemetry (OTEL) to provide:
- **Distributed Tracing**: End-to-end request tracking across services
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Metrics Collection**: Performance and business metrics
- **Health Monitoring**: System health checks and monitoring

## 🔍 OpenTelemetry Integration

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Task Manager  │    │  OTEL Collector │    │   Observability │
│     Service     │───▶│   (Tempo/Loki)  │───▶│     Stack       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Traces        │    │   Logs          │    │   Metrics       │
│   (Jaeger)      │    │   (Grafana)     │    │   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### OTEL Configuration

#### Environment Variables

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

#### Configuration Object
```typescript
export const observabilityConfig = {
  environment: 'development',
  exporterEndpointBase: 'http://localhost:4318',
  service: {
    name: 'task-manager',
    version: '1.0.0',
    environment: 'development',
  },
  traces: {
    enabled: true,
    samplingRate: 1.0,
    endpoint: 'http://localhost:4318/v1/traces',
    batch: {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    },
  },
  logs: {
    enabled: true,
    endpoint: 'http://localhost:4318/v1/logs',
  },
};
```

## 🔄 Distributed Tracing

### Trace Context Propagation

The service implements W3C Trace Context propagation for distributed tracing:

#### Trace Context Headers
```typescript
// W3C Trace Context format
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
tracestate: congo=t61rcWkgMzE
```

#### Trace Context Middleware
```typescript
// src/common/middleware/trace-context.middleware.ts
export function traceContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceContext = extractTraceContext(req.headers);
  const span = createSpanFromContext(traceContext);
  
  // Attach trace context to request
  (req as any).traceContext = traceContext;
  (req as any).span = span;
  
  next();
}
```

### Business Event Tracking

#### Task Lifecycle Events
```typescript
// Task creation event
activeSpan.addEvent('business.task_created', {
  taskId: task.id,
  userEmail: task.userEmail,
  status: task.status,
  'business.operation': 'create_web_crawl_task',
});

// Task completion event
activeSpan.addEvent('business.task_completed', {
  taskId: task.id,
  status: task.status,
  duration: task.getDuration(),
  'business.operation': 'complete_web_crawl_task',
});
```

#### Database Operation Events
```typescript
// Database persistence event
activeSpan.addEvent('business.task_persisted', {
  taskId: createdTask.id,
  status: createdTask.status,
  'persistence.layer': 'database',
  'database.operation': 'insert',
});
```

### Span Attributes

#### Business Attributes
```typescript
// Add business context to spans
activeSpan.setAttributes({
  'business.operation': 'create_web_crawl_task',
  'business.entity': 'web_crawl_task',
  'user.email': userEmail,
  'user.query.length': userQuery.length,
  'web.url': originalUrl,
  'task.id': taskId,
  'task.status': status,
});
```

#### Performance Attributes
```typescript
// Add performance metrics to spans
activeSpan.setAttributes({
  'task.duration_ms': duration,
  'task.processing_time_ms': processingTime,
  'database.query_count': queryCount,
  'kafka.message_count': messageCount,
});
```

## 📝 Structured Logging

### Log Format

The service uses structured JSON logging with trace correlation:

#### Log Entry Structure
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Web crawl task created successfully",
  "service": "task-manager",
  "version": "1.0.0",
  "environment": "development",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "context": {
    "taskId": "uuid-string",
    "userEmail": "user@example.com",
    "status": "new"
  },
  "metadata": {
    "requestId": "req-123",
    "userId": "user-456",
    "operation": "create_web_crawl_task"
  }
}
```

### Log Levels

#### Development Environment
- **DEBUG**: Detailed debugging information
- **INFO**: General operational information
- **WARN**: Warning conditions
- **ERROR**: Error conditions

#### Production Environment
- **INFO**: General operational information
- **WARN**: Warning conditions
- **ERROR**: Error conditions

### Log Categories

#### Application Logs
```typescript
// Task management logs
logger.info('Web crawl task created successfully', {
  taskId: task.id,
  userEmail: task.userEmail,
  status: task.status,
});

// Error logs
logger.error('Failed to create web crawl task', {
  error: error.message,
  taskId: taskId,
  userEmail: userEmail,
});
```

#### System Logs
```typescript
// Startup logs
logger.info('Task Manager application started', {
  port: appConfig.app.port,
  environment: appConfig.env,
});

// Shutdown logs
logger.info('Task Manager shutting down gracefully');
```

#### Performance Logs
```typescript
// Database operation logs
logger.debug('Database query executed', {
  query: 'SELECT * FROM web_crawl_tasks',
  duration: queryDuration,
  rows: resultCount,
});

// Kafka operation logs
logger.debug('Kafka message processed', {
  topic: 'task-status',
  partition: 0,
  offset: 12345,
  duration: processingTime,
});
```

## 📊 Metrics Collection

### Prometheus Metrics

The service exposes metrics in Prometheus format:

#### Business Metrics
```prometheus
# Task metrics
web_crawl_tasks_total{status="new"} 100
web_crawl_tasks_total{status="completed"} 85
web_crawl_tasks_total{status="error"} 5

# Task duration metrics
web_crawl_task_duration_seconds{status="completed"} 30.5
web_crawl_task_duration_seconds{status="error"} 15.2

# User metrics
web_crawl_tasks_by_user_total{user_email="user@example.com"} 25
```

#### System Metrics
```prometheus
# HTTP request metrics
http_requests_total{method="GET",endpoint="/api/health"} 150
http_requests_total{method="POST",endpoint="/api/tasks"} 75
http_request_duration_seconds{method="GET",endpoint="/api/health"} 0.05

# Database metrics
database_connections_active 5
database_connections_idle 3
database_query_duration_seconds 0.1

# Kafka metrics
kafka_consumer_messages_processed_total{topic="task-status"} 1234
kafka_consumer_lag{topic="task-status",partition="0"} 10
```

### Metrics Endpoints

#### Prometheus Format
```bash
# Get metrics in Prometheus format
curl http://localhost:3000/api/metrics
```

#### JSON Format
```bash
# Get metrics in JSON format
curl http://localhost:3000/api/metrics/json
```

#### Metrics Configuration
```bash
# Get metrics configuration
curl http://localhost:3000/api/metrics/config
```

### Custom Metrics

#### Task Metrics Service
```typescript
// src/application/metrics/services/WebCrawlMetricsService.ts
export class WebCrawlMetricsService {
  async getMetrics(params?: { hours?: number }) {
    const hours = params?.hours || this.defaultTimeRange;
    
    return {
      newTasksCount: await this.getNewTasksCount(hours),
      completedTasksCount: await this.getCompletedTasksCount(hours),
      errorTasksCount: await this.getErrorTasksCount(hours),
      totalTasksCount: await this.getTotalTasksCount(hours),
    };
  }
}
```

## 🏥 Health Monitoring

### Health Check Endpoints

#### Basic Health Check
```bash
GET /api/health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "kafka": {
      "status": "up",
      "responseTime": 10
    },
    "service": {
      "status": "up",
      "responseTime": 1
    }
  }
}
```

#### Detailed Health Check
```bash
GET /api/health/detailed
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "development",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 5,
      "details": {
        "connectionCount": 5,
        "idleConnections": 3,
        "activeConnections": 2
      }
    },
    "kafka": {
      "status": "up",
      "responseTime": 10,
      "details": {
        "consumerLag": 0,
        "connectedBrokers": 1,
        "topics": ["task-status", "requests-web-crawl"]
      }
    },
    "service": {
      "status": "up",
      "responseTime": 1,
      "details": {
        "memoryUsage": "45MB",
        "cpuUsage": "2.5%",
        "activeConnections": 5
      }
    }
  }
}
```

### Kubernetes Health Checks

#### Readiness Probe
```bash
GET /api/health/ready
```
Response:
```json
{
  "ready": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": "up",
    "kafka": "up",
    "service": "up"
  }
}
```

#### Liveness Probe
```bash
GET /api/health/live
```
Response:
```json
{
  "alive": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## 🔧 Observability Configuration

### Development Configuration
```bash
# Development observability settings
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=1.0
OTEL_LOGS_ENABLED=true
```

### Production Configuration
```bash
# Production observability settings
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
TRACING_ENABLED=true
TRACING_SAMPLING_RATE=0.1
OTEL_LOGS_ENABLED=false
```

### Test Configuration
```bash
# Test observability settings
TRACING_ENABLED=false
OTEL_LOGS_ENABLED=false
```

## 📈 Performance Monitoring

### Key Performance Indicators (KPIs)

#### Task Processing Metrics
- **Task Creation Rate**: Tasks created per second
- **Task Completion Rate**: Tasks completed per second
- **Task Error Rate**: Failed tasks per second
- **Average Task Duration**: Time to complete tasks

#### System Performance Metrics
- **Response Time**: API endpoint response times
- **Throughput**: Requests per second
- **Error Rate**: Failed requests per second
- **Resource Usage**: CPU, memory, and disk usage

### Alerting Rules

#### Critical Alerts
```yaml
# High error rate
- alert: HighTaskErrorRate
  expr: rate(web_crawl_tasks_total{status="error"}[5m]) > 0.1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "High task error rate detected"

# Service down
- alert: TaskManagerDown
  expr: up{job="task-manager"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Task Manager service is down"
```

#### Warning Alerts
```yaml
# High task duration
- alert: HighTaskDuration
  expr: histogram_quantile(0.95, web_crawl_task_duration_seconds) > 300
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Task duration is high"

# High consumer lag
- alert: HighKafkaConsumerLag
  expr: kafka_consumer_lag > 1000
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Kafka consumer lag is high"
```

## 🔍 Debugging and Troubleshooting

### Trace Debugging

#### Enable Trace Debugging
```typescript
// Enable span debugging in development
if (config.service.environment !== 'production') {
  SpanDebugger.enable();
}
```

#### View Traces
```bash
# Access Jaeger UI
http://localhost:16686

# Search for traces
# Filter by service: task-manager
# Filter by operation: create_web_crawl_task
```

### Log Debugging

#### Enable Debug Logging
```bash
# Set log level to debug
LOG_LEVEL=debug
```

#### Search Logs
```bash
# Search for specific task
grep "taskId: uuid-string" logs/app.log

# Search for errors
grep "level: error" logs/app.log

# Search by trace ID
grep "traceId: 0af7651916cd43dd8448eb211c80319c" logs/app.log
```

### Metrics Debugging

#### View Metrics
```bash
# View all metrics
curl http://localhost:3000/api/metrics

# View specific metric
curl http://localhost:3000/api/metrics | grep web_crawl_tasks_total
```

#### Metrics Visualization
```bash
# Access Grafana
http://localhost:3000

# Import dashboards for:
# - Task Manager Overview
# - Task Processing Metrics
# - System Performance
```

## 🚀 Observability Best Practices

### Tracing Best Practices
1. **Consistent Naming**: Use consistent span and operation names
2. **Business Context**: Include business attributes in spans
3. **Error Handling**: Properly capture and propagate errors
4. **Sampling**: Use appropriate sampling rates for different environments

### Logging Best Practices
1. **Structured Logging**: Use JSON format with consistent structure
2. **Trace Correlation**: Include trace IDs in all log entries
3. **Context Information**: Include relevant context in log messages
4. **Log Levels**: Use appropriate log levels for different information

### Metrics Best Practices
1. **Naming Convention**: Use consistent metric naming
2. **Labels**: Use meaningful labels for filtering and grouping
3. **Cardinality**: Avoid high cardinality labels
4. **Documentation**: Document all metrics and their meanings

### Monitoring Best Practices
1. **Health Checks**: Implement comprehensive health checks
2. **Alerting**: Set up meaningful alerts with appropriate thresholds
3. **Dashboards**: Create informative dashboards for monitoring
4. **Documentation**: Document monitoring and alerting procedures

For more information about observability and monitoring, see:
- [Configuration Guide](./configuration.md) - Observability configuration options
- [API Documentation](./api.md) - Health check and metrics endpoints
- [Development Guide](./development.md) - Observability development practices
