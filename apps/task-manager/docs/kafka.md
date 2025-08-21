# Kafka Integration Documentation

This document provides comprehensive information about the Apache Kafka integration in the Task Manager Service.

## 📋 Overview

The Task Manager Service uses Apache Kafka for event-driven communication, enabling:
- **Asynchronous Task Processing**: Decoupled task creation and processing
- **Real-time Status Updates**: Live task status notifications
- **Scalable Architecture**: Horizontal scaling through consumer groups
- **Reliable Messaging**: Guaranteed message delivery and ordering

## 🔄 Kafka Architecture

### Message Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Gateway   │───▶│ Task Manager│───▶│   Workers   │
│   Service   │    │   Service   │    │   (Future)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│requests-web-│    │ task-status │    │ task-status │
│   crawl     │    │   topic     │    │   topic     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Consumer Groups
- **`task-manager-group`**: Primary consumer group for task status processing
- **Future**: Additional consumer groups for different processing needs

## 📡 Kafka Topics

### Consumer Topics

#### `task-status` Topic
**Purpose**: Receives task status updates and completion notifications

**Configuration**:
- **Topic Name**: `task-status` (configurable via `TASK_STATUS_TOPIC`)
- **Partitions**: Default Kafka configuration
- **Replication Factor**: Default Kafka configuration
- **Retention**: Default Kafka configuration

**Message Types**:
- Task completion notifications
- Task error notifications
- Task status updates

#### `requests-web-crawl` Topic
**Purpose**: Receives new web crawl task requests

**Configuration**:
- **Topic Name**: `requests-web-crawl` (configurable via `WEB_CRAWL_REQUEST_TOPIC`)
- **Partitions**: Default Kafka configuration
- **Replication Factor**: Default Kafka configuration
- **Retention**: Default Kafka configuration

**Message Types**:
- New web crawl task requests
- Task creation notifications

## 📨 Message Formats

### Task Status Messages

#### New Task Message
```json
{
  "headers": {
    "taskId": "uuid-string",
    "taskType": "web-crawl",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "traceId": "trace-id-string",
    "spanId": "span-id-string"
  },
  "message": {
    "taskId": "uuid-string",
    "userEmail": "user@example.com",
    "userQuery": "Find product information",
    "originalUrl": "https://example.com",
    "receivedAt": "2024-01-01T00:00:00.000Z",
    "status": "new"
  }
}
```

#### Task Completion Message
```json
{
  "headers": {
    "taskId": "uuid-string",
    "taskType": "web-crawl",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "traceId": "trace-id-string",
    "spanId": "span-id-string"
  },
  "message": {
    "taskId": "uuid-string",
    "status": "completed",
    "result": "Found 5 products matching criteria",
    "finishedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Task Error Message
```json
{
  "headers": {
    "taskId": "uuid-string",
    "taskType": "web-crawl",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "traceId": "trace-id-string",
    "spanId": "span-id-string"
  },
  "message": {
    "taskId": "uuid-string",
    "status": "error",
    "error": "Network timeout occurred",
    "finishedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Web Crawl Request Messages

#### New Web Crawl Request
```json
{
  "headers": {
    "requestId": "uuid-string",
    "requestType": "web-crawl",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "traceId": "trace-id-string",
    "spanId": "span-id-string"
  },
  "message": {
    "userEmail": "user@example.com",
    "userQuery": "Find product information",
    "originalUrl": "https://example.com",
    "requestedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔧 Kafka Configuration

### Environment Variables

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
| `KAFKA_SASL_MECHANISM` | enum | `plain` | SASL mechanism |
| `KAFKA_CONNECTION_TIMEOUT` | number | `3000` | Connection timeout (ms) |
| `KAFKA_REQUEST_TIMEOUT` | number | `30000` | Request timeout (ms) |
| `KAFKA_SESSION_TIMEOUT` | number | `30000` | Session timeout (ms) |
| `KAFKA_HEARTBEAT_INTERVAL` | number | `3000` | Heartbeat interval (ms) |
| `KAFKA_RETRY_BACKOFF` | number | `100` | Retry backoff (ms) |
| `KAFKA_MAX_RETRY_ATTEMPTS` | number | `3` | Maximum retry attempts |

### Client Configuration

#### Producer Configuration
```typescript
{
  clientId: 'task-manager',
  brokers: ['localhost:9092'],
  ssl: false,
  sasl: false,
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
}
```

#### Consumer Configuration
```typescript
{
  groupId: 'task-manager-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
}
```

## 🔄 Consumer Implementation

### Task Status Consumer

The Task Manager Service implements a consumer for the `task-status` topic that processes task status updates.

#### Consumer Features
- **Message Deserialization**: Automatic JSON parsing
- **Error Handling**: Comprehensive error handling and retry logic
- **Tracing Integration**: OpenTelemetry trace context propagation
- **Health Monitoring**: Consumer health checks and metrics

#### Message Processing Flow
1. **Message Reception**: Consumer receives message from Kafka
2. **Header Validation**: Validates message headers and trace context
3. **Message Deserialization**: Parses JSON message payload
4. **Business Logic**: Processes task status update
5. **Database Update**: Updates task status in PostgreSQL
6. **Acknowledgment**: Commits message offset

#### Error Handling
- **Retry Logic**: Automatic retry for transient failures
- **Dead Letter Queue**: Failed messages sent to DLQ for manual processing
- **Circuit Breaker**: Prevents cascading failures
- **Health Checks**: Monitors consumer health and performance

### Consumer Health Monitoring

#### Health Check Endpoints
- `GET /api/health/kafka` - Kafka-specific health check
- `GET /api/health/detailed` - Comprehensive health including Kafka

#### Health Metrics
- **Consumer Lag**: Messages behind current offset
- **Consumer Group Status**: Consumer group health
- **Message Processing Rate**: Messages processed per second
- **Error Rate**: Failed message processing rate

## 📊 Kafka Metrics

### Prometheus Metrics

The service exposes Kafka-related metrics in Prometheus format:

```prometheus
# Kafka consumer metrics
kafka_consumer_messages_processed_total{topic="task-status"} 1234
kafka_consumer_messages_failed_total{topic="task-status"} 5
kafka_consumer_lag{topic="task-status",partition="0"} 10
kafka_consumer_processing_duration_seconds{topic="task-status"} 0.5

# Kafka producer metrics
kafka_producer_messages_sent_total{topic="task-status"} 5678
kafka_producer_messages_failed_total{topic="task-status"} 2
kafka_producer_send_duration_seconds{topic="task-status"} 0.1
```

### Metrics Endpoints
- `GET /api/metrics` - Prometheus format metrics
- `GET /api/metrics/json` - JSON format metrics

## 🔍 Kafka Debugging

### Consumer Debugging

#### Check Consumer Group Status
```bash
# List consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group task-manager-group --describe
```

#### Monitor Consumer Lag
```bash
# Check consumer lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group task-manager-group --describe
```

### Message Debugging

#### View Topic Messages
```bash
# Consume messages from topic
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic task-status --from-beginning

# Consume with key and value
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic task-status --property print.key=true --property print.value=true --from-beginning
```

#### Produce Test Messages
```bash
# Produce message to topic
kafka-console-producer.sh --bootstrap-server localhost:9092 --topic task-status
```

## 🚀 Kafka Testing

### Test Commands

#### Test Kafka Connection
```bash
# Test Kafka connectivity
npm run test-kafka
```

#### Test Task Publishing
```bash
# Publish test task
npm run publish-new-task
```

#### Test Task Updates
```bash
# Test task status updates
npm run test-task-updates
```

### Test Scripts

#### Kafka Connection Test
```typescript
// scripts/test-kafka-connection.ts
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'test-client',
  brokers: ['localhost:9092'],
});

async function testConnection() {
  const admin = kafka.admin();
  await admin.connect();
  
  const topics = await admin.listTopics();
  console.log('Available topics:', topics);
  
  await admin.disconnect();
}
```

#### Task Publishing Test
```typescript
// scripts/publish-new-task.ts
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'test-publisher',
  brokers: ['localhost:9092'],
});

async function publishTestTask() {
  const producer = kafka.producer();
  await producer.connect();
  
  await producer.send({
    topic: 'requests-web-crawl',
    messages: [{
      key: 'test-task-1',
      value: JSON.stringify({
        userEmail: 'test@example.com',
        userQuery: 'Test query',
        originalUrl: 'https://example.com',
        requestedAt: new Date().toISOString(),
      }),
    }],
  });
  
  await producer.disconnect();
}
```

## 🔐 Security Configuration

### SSL/TLS Configuration

#### Enable SSL
```bash
# Enable SSL for Kafka
KAFKA_SSL_ENABLED=true
```

#### SSL Configuration Example
```typescript
const kafka = new Kafka({
  clientId: 'task-manager',
  brokers: ['kafka.example.com:9093'],
  ssl: {
    rejectUnauthorized: false,
    ca: [fs.readFileSync('/path/to/ca.pem', 'utf-8')],
    key: fs.readFileSync('/path/to/client-key.pem', 'utf-8'),
    cert: fs.readFileSync('/path/to/client-cert.pem', 'utf-8'),
  },
});
```

### SASL Authentication

#### Enable SASL
```bash
# Enable SASL authentication
KAFKA_SASL_ENABLED=true
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
KAFKA_SASL_MECHANISM=scram-sha-256
```

#### SASL Configuration Example
```typescript
const kafka = new Kafka({
  clientId: 'task-manager',
  brokers: ['kafka.example.com:9092'],
  sasl: {
    mechanism: 'scram-sha-256',
    username: 'your-username',
    password: 'your-password',
  },
});
```

## 📈 Performance Optimization

### Producer Optimization

#### Batch Configuration
```typescript
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
  maxInFlightRequests: 1,
  idempotent: true,
});
```

#### Send Configuration
```typescript
await producer.send({
  topic: 'task-status',
  messages: [{
    key: 'task-id',
    value: JSON.stringify(message),
  }],
  timeout: 30000,
  acks: 1,
});
```

### Consumer Optimization

#### Consumer Configuration
```typescript
const consumer = kafka.consumer({
  groupId: 'task-manager-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576, // 1MB
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
});
```

#### Processing Configuration
```typescript
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    // Process message
  },
  autoCommit: true,
  autoCommitInterval: 5000,
  autoCommitThreshold: 100,
});
```

## 🔄 Message Patterns

### Event Sourcing Pattern

The service uses event sourcing for task lifecycle management:

1. **Task Created Event**: Published when new task is created
2. **Task Started Event**: Published when task processing begins
3. **Task Completed Event**: Published when task completes successfully
4. **Task Failed Event**: Published when task fails with error

### Saga Pattern

For complex task workflows, the service implements saga patterns:

1. **Compensation Actions**: Rollback operations for failed steps
2. **State Management**: Track saga state across multiple events
3. **Error Handling**: Comprehensive error handling and recovery

## 📚 Best Practices

### Message Design
1. **Immutable Messages**: Messages should be immutable once published
2. **Schema Evolution**: Design messages for backward compatibility
3. **Idempotency**: Ensure message processing is idempotent
4. **Tracing**: Include trace context in all messages

### Consumer Design
1. **Error Handling**: Implement comprehensive error handling
2. **Retry Logic**: Use exponential backoff for retries
3. **Circuit Breaker**: Prevent cascading failures
4. **Monitoring**: Monitor consumer health and performance

### Producer Design
1. **Batching**: Use batching for improved performance
2. **Compression**: Enable compression for large messages
3. **Acknowledgment**: Use appropriate acknowledgment levels
4. **Idempotency**: Enable idempotent producers when possible

For more information about Kafka integration and configuration, see:
- [Configuration Guide](./configuration.md) - Kafka configuration options
- [Observability Documentation](./observability.md) - Kafka monitoring and tracing
- [Development Guide](./development.md) - Kafka development practices
