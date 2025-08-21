# API Reference Documentation

This document provides comprehensive information about the REST API endpoints available in the Task Manager Service.

## 📋 Overview

The Task Manager Service exposes a REST API for:
- **Health Monitoring**: System health checks and status monitoring
- **Metrics Collection**: Performance and business metrics retrieval
- **Task Management**: Web crawl task operations (future endpoints)

## 🔗 Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## 📡 API Endpoints

### Health Check Endpoints

#### GET /api/health
Basic health check endpoint that returns the overall system health status.

**Request:**
```http
GET /api/health
```

**Response:**
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

**Status Codes:**
- `200` - System is healthy
- `503` - System is unhealthy

#### GET /api/health/detailed
Comprehensive health check with detailed information about all system components.

**Request:**
```http
GET /api/health/detailed
```

**Response:**
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
        "activeConnections": 2,
        "database": "tasks_manager",
        "host": "localhost",
        "port": 5432
      }
    },
    "kafka": {
      "status": "up",
      "responseTime": 10,
      "details": {
        "consumerLag": 0,
        "connectedBrokers": 1,
        "topics": ["task-status", "requests-web-crawl"],
        "consumerGroup": "task-manager-group",
        "brokers": ["localhost:9092"]
      }
    },
    "service": {
      "status": "up",
      "responseTime": 1,
      "details": {
        "memoryUsage": "45MB",
        "cpuUsage": "2.5%",
        "activeConnections": 5,
        "uptime": 3600,
        "nodeVersion": "18.17.0"
      }
    }
  }
}
```

#### GET /api/health/database
Database-specific health check.

**Request:**
```http
GET /api/health/database
```

**Response:**
```json
{
  "component": "database",
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": 5,
  "details": {
    "connectionCount": 5,
    "idleConnections": 3,
    "activeConnections": 2,
    "database": "tasks_manager",
    "host": "localhost",
    "port": 5432
  }
}
```

#### GET /api/health/kafka
Kafka-specific health check.

**Request:**
```http
GET /api/health/kafka
```

**Response:**
```json
{
  "component": "kafka",
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": 10,
  "details": {
    "consumerLag": 0,
    "connectedBrokers": 1,
    "topics": ["task-status", "requests-web-crawl"],
    "consumerGroup": "task-manager-group",
    "brokers": ["localhost:9092"]
  }
}
```

#### GET /api/health/service
Service-specific health check.

**Request:**
```http
GET /api/health/service
```

**Response:**
```json
{
  "component": "service",
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": 1,
  "details": {
    "memoryUsage": "45MB",
    "cpuUsage": "2.5%",
    "activeConnections": 5,
    "uptime": 3600,
    "nodeVersion": "18.17.0"
  }
}
```

#### GET /api/health/ready
Kubernetes readiness probe endpoint.

**Request:**
```http
GET /api/health/ready
```

**Response:**
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

**Status Codes:**
- `200` - Service is ready to accept requests
- `503` - Service is not ready

#### GET /api/health/live
Kubernetes liveness probe endpoint.

**Request:**
```http
GET /api/health/live
```

**Response:**
```json
{
  "alive": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

**Status Codes:**
- `200` - Service is alive
- `503` - Service is not responding

### Metrics Endpoints

#### GET /api/metrics
Retrieves metrics in Prometheus format.

**Request:**
```http
GET /api/metrics
GET /api/metrics?hours=24
```

**Query Parameters:**
- `hours` (optional): Time range in hours for metrics (default: 24)

**Response:**
```prometheus
# HELP web_crawl_tasks_total Total number of web crawl tasks by status
# TYPE web_crawl_tasks_total counter
web_crawl_tasks_total{status="new"} 100
web_crawl_tasks_total{status="completed"} 85
web_crawl_tasks_total{status="error"} 5

# HELP web_crawl_task_duration_seconds Duration of web crawl tasks
# TYPE web_crawl_task_duration_seconds histogram
web_crawl_task_duration_seconds_bucket{status="completed",le="10"} 20
web_crawl_task_duration_seconds_bucket{status="completed",le="30"} 45
web_crawl_task_duration_seconds_bucket{status="completed",le="60"} 85
web_crawl_task_duration_seconds_bucket{status="completed",le="+Inf"} 85

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/api/health"} 150
http_requests_total{method="GET",endpoint="/api/metrics"} 75

# HELP http_request_duration_seconds Duration of HTTP requests
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",endpoint="/api/health",le="0.1"} 150
http_request_duration_seconds_bucket{method="GET",endpoint="/api/health",le="0.5"} 150
http_request_duration_seconds_bucket{method="GET",endpoint="/api/health",le="1"} 150
http_request_duration_seconds_bucket{method="GET",endpoint="/api/health",le="+Inf"} 150
```

**Status Codes:**
- `200` - Metrics retrieved successfully
- `400` - Invalid hours parameter
- `500` - Internal server error

#### GET /api/metrics/json
Retrieves metrics in JSON format.

**Request:**
```http
GET /api/metrics/json
GET /api/metrics/json?hours=24
```

**Query Parameters:**
- `hours` (optional): Time range in hours for metrics (default: 24)

**Response:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "timeRange": {
    "hours": 24,
    "startTime": "2023-12-31T00:00:00.000Z",
    "endTime": "2024-01-01T00:00:00.000Z"
  },
  "metrics": {
    "tasks": {
      "new": 100,
      "completed": 85,
      "error": 5,
      "total": 190
    },
    "performance": {
      "averageTaskDuration": 30.5,
      "taskCompletionRate": 0.85,
      "errorRate": 0.05
    },
    "system": {
      "httpRequests": {
        "total": 150,
        "successful": 145,
        "failed": 5
      },
      "database": {
        "activeConnections": 5,
        "idleConnections": 3,
        "queryCount": 1250
      },
      "kafka": {
        "messagesProcessed": 1234,
        "consumerLag": 0,
        "connectedBrokers": 1
      }
    }
  }
}
```

**Status Codes:**
- `200` - Metrics retrieved successfully
- `400` - Invalid hours parameter
- `500` - Internal server error

#### GET /api/metrics/config
Retrieves metrics configuration information.

**Request:**
```http
GET /api/metrics/config
```

**Response:**
```json
{
  "availableTimeRanges": [1, 6, 12, 24, 48, 72],
  "defaultTimeRange": 24,
  "refreshInterval": 15
}
```

**Status Codes:**
- `200` - Configuration retrieved successfully
- `500` - Internal server error

## 🔧 Error Handling

### Error Response Format

All API endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/metrics",
  "method": "GET"
}
```

### HTTP Status Codes

| Status Code | Description | Usage |
|-------------|-------------|-------|
| `200` | OK | Successful request |
| `400` | Bad Request | Invalid parameters or request format |
| `404` | Not Found | Endpoint not found |
| `500` | Internal Server Error | Server-side error |

### Common Error Scenarios

#### Invalid Hours Parameter
```http
GET /api/metrics?hours=invalid
```

**Response:**
```json
{
  "error": "Invalid hours parameter. Must be a positive number.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Code:** `400`

#### Endpoint Not Found
```http
GET /api/nonexistent
```

**Response:**
```json
{
  "error": "Endpoint not found",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/nonexistent"
}
```

**Status Code:** `404`

#### Internal Server Error
```http
GET /api/metrics
```

**Response:**
```json
{
  "error": "Failed to retrieve metrics",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Code:** `500`

## 🔍 Request/Response Examples

### Health Check Examples

#### Basic Health Check
```bash
curl -X GET http://localhost:3000/api/health
```

#### Detailed Health Check
```bash
curl -X GET http://localhost:3000/api/health/detailed
```

#### Database Health Check
```bash
curl -X GET http://localhost:3000/api/health/database
```

#### Kafka Health Check
```bash
curl -X GET http://localhost:3000/api/health/kafka
```

### Metrics Examples

#### Prometheus Metrics
```bash
# Default time range (24 hours)
curl -X GET http://localhost:3000/api/metrics

# Custom time range (6 hours)
curl -X GET "http://localhost:3000/api/metrics?hours=6"
```

#### JSON Metrics
```bash
# Default time range (24 hours)
curl -X GET http://localhost:3000/api/metrics/json

# Custom time range (12 hours)
curl -X GET "http://localhost:3000/api/metrics/json?hours=12"
```

#### Metrics Configuration
```bash
curl -X GET http://localhost:3000/api/metrics/config
```

## 🔐 Authentication & Security

### Current Implementation
The current API implementation does not require authentication for health check and metrics endpoints. This is typical for monitoring endpoints that need to be accessible by monitoring systems.

### Security Considerations
- **Network Security**: Ensure API endpoints are only accessible from trusted networks
- **Rate Limiting**: Consider implementing rate limiting for production environments
- **TLS/SSL**: Use HTTPS in production environments
- **Access Control**: Implement authentication for sensitive endpoints in the future

## 📊 API Monitoring

### Health Check Monitoring
Monitor the health check endpoints to ensure system availability:

```bash
# Check basic health
curl -f http://localhost:3000/api/health

# Check readiness for Kubernetes
curl -f http://localhost:3000/api/health/ready

# Check liveness for Kubernetes
curl -f http://localhost:3000/api/health/live
```

### Metrics Monitoring
Monitor metrics endpoints for performance insights:

```bash
# Monitor task metrics
curl http://localhost:3000/api/metrics/json | jq '.metrics.tasks'

# Monitor system performance
curl http://localhost:3000/api/metrics/json | jq '.metrics.system'
```

## 🚀 Future API Endpoints

### Planned Task Management Endpoints

#### POST /api/tasks
Create a new web crawl task.

#### GET /api/tasks/{taskId}
Retrieve a specific task by ID.

#### GET /api/tasks
List tasks with filtering and pagination.

#### PUT /api/tasks/{taskId}/status
Update task status.

#### DELETE /api/tasks/{taskId}
Delete a task (soft delete).

### Planned User Management Endpoints

#### GET /api/users/{email}/tasks
Get tasks for a specific user.

#### GET /api/users/{email}/statistics
Get user-specific statistics.

## 📚 API Documentation Tools

### OpenAPI/Swagger
Future versions will include OpenAPI specification for interactive API documentation.

### Postman Collection
A Postman collection will be provided for testing API endpoints.

## 🔧 Development and Testing

### Local Development
```bash
# Start the service
nx serve task-manager

# Test health endpoint
curl http://localhost:3000/api/health

# Test metrics endpoint
curl http://localhost:3000/api/metrics
```

### Integration Testing
```bash
# Run API tests
npm test

# Run specific API test
npm test -- --testNamePattern="API"
```

### Load Testing
```bash
# Test health endpoint performance
ab -n 1000 -c 10 http://localhost:3000/api/health

# Test metrics endpoint performance
ab -n 1000 -c 10 http://localhost:3000/api/metrics
```

For more information about API development and testing, see:
- [Configuration Guide](./configuration.md) - API configuration options
- [Development Guide](./development.md) - API development practices
- [Observability Documentation](./observability.md) - API monitoring and tracing
