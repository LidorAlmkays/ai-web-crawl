# Kafka Message Best Practices

This implementation follows industry best practices for Kafka messaging with proper headers, metadata, and tracing.

## Key Features

### 1. Standardized Message Headers

Every Kafka message includes these standard headers:

```typescript
interface IKafkaMessageHeaders {
  // Message identification
  'message-id': string; // Unique message identifier
  'message-type': string; // Type of message (e.g., 'crawl_request')
  'message-version': string; // API version (e.g., '1.0.0')

  // Service identification
  'source-service': string; // Service name (e.g., 'gateway')
  'source-instance': string; // Instance ID (e.g., 'gateway-1')

  // Timestamp information
  timestamp: string; // Current timestamp
  'created-at': string; // Message creation time

  // Correlation and tracing
  'correlation-id'?: string; // Request correlation ID
  'trace-id'?: string; // Distributed tracing ID
  'span-id'?: string; // Span ID for tracing

  // Message metadata
  'content-type': string; // Always 'application/json'
  encoding: string; // Always 'utf-8'

  // Business context
  'user-id'?: string; // User identifier
  'session-id'?: string; // Session identifier
  'request-id'?: string; // Request identifier
}
```

### 2. Structured Message Payload

Messages follow a consistent structure:

```typescript
interface IKafkaMessagePayload<T> {
  data: T; // Actual message data
  metadata: {
    messageId: string; // Unique message ID
    timestamp: string; // ISO timestamp
    version: string; // API version
    correlationId?: string; // Correlation ID
    traceId?: string; // Trace ID
    userId?: string; // User ID
    sessionId?: string; // Session ID
    requestId?: string; // Request ID
  };
}
```

## Usage Examples

### Basic Message Publishing

```typescript
import { KafkaPublisherBase } from './kafka/kafka-publisher.base';
import { kafkaClientService } from './kafka/kafka-client.service';

class MyPublisher extends KafkaPublisherBase {
  constructor() {
    super(kafkaClientService, 'my-topic', 'my-service', 'instance-1');
  }

  async publishUserEvent(userData: any): Promise<void> {
    await this.publishMessage(userData, userData.id, 'user_created', {
      userId: userData.id,
      correlationId: userData.requestId,
      customHeaders: {
        'user-type': 'premium',
        region: 'us-east-1',
      },
    });
  }
}
```

### Advanced Message Publishing with Tracing

```typescript
async publishWithTracing(data: any, traceId: string, spanId: string): Promise<void> {
  await this.publishMessage(
    data,
    data.id,
    'complex_event',
    {
      traceId,
      correlationId: data.correlationId,
      userId: data.userId,
      sessionId: data.sessionId,
      customHeaders: {
        'business-unit': 'ecommerce',
        'priority': 'high',
        'retry-count': '0',
      },
    }
  );
}
```

### Message Builder (Direct Usage)

```typescript
import { KafkaMessageBuilder } from './kafka/kafka-message-builder';

// Create a message builder
const builder = KafkaMessageBuilder.create('gateway', 'gateway-1').setMessageType('crawl_request').setCorrelationId('req-123').setUserId('user-456').setCustomHeader('crawl-priority', 'high').setCustomHeader('crawl-depth', '2');

// Build the message
const message = builder.build({ url: 'https://example.com', query: 'products' }, 'crawl-requests', 'crawl-123');
```

## Best Practices Implemented

### 1. **Service Identification**

- Every message includes source service and instance information
- Enables tracking message flow across microservices

### 2. **Message Tracing**

- Correlation IDs for request tracing
- Trace IDs for distributed tracing
- Span IDs for detailed tracing

### 3. **Business Context**

- User IDs for user-specific tracking
- Session IDs for session management
- Request IDs for request correlation

### 4. **Message Metadata**

- Unique message IDs for deduplication
- Timestamps for temporal analysis
- Version information for API evolution

### 5. **Custom Headers**

- Extensible header system for business-specific metadata
- Type-safe header management

### 6. **Structured Payload**

- Consistent data structure across all messages
- Metadata separated from business data
- Versioned payload format

## Environment Variables

```bash
# Service identification
INSTANCE_ID=gateway-1

# Kafka configuration
KAFKA_CLIENT_ID=gateway-service
KAFKA_BROKERS=localhost:9092
```

## Monitoring and Observability

The implementation provides rich logging for monitoring:

```typescript
logger.info('Message published successfully with best practices', {
  topic: 'crawl-requests',
  key: 'crawl-123',
  messageId: 'msg-456',
  messageType: 'crawl_request',
  sourceService: 'gateway',
  correlationId: 'req-123',
  timestamp: '2024-01-01T12:00:00.000Z',
});
```

## Benefits

1. **Traceability**: Full request tracing across services
2. **Observability**: Rich metadata for monitoring and debugging
3. **Consistency**: Standardized message format across all services
4. **Extensibility**: Easy to add new headers and metadata
5. **Type Safety**: TypeScript interfaces ensure correct usage
6. **Backward Compatibility**: Legacy methods still supported
