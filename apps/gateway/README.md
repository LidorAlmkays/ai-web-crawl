# Gateway Application

## Overview

The Gateway application is part of the WebCrawling system and serves as the entry point for crawl requests. It provides a REST API for submitting crawl requests and publishes them to Kafka for processing.

## Architecture

### Kafka Messaging

The application uses a centralized Kafka client service to manage all Kafka connections. This ensures:

- **Single Kafka Instance**: All publishers and consumers share the same Kafka client
- **Resource Efficiency**: Reduces connection overhead and memory usage
- **Centralized Management**: Connection lifecycle is managed in one place
- **Dependency Injection**: Easy to inject and mock for testing

### Key Components

#### KafkaClientService

- Manages a single Kafka instance
- Provides producer and consumer factories
- Handles connection lifecycle (connect/disconnect)
- Tracks connection state

#### KafkaPublisherBase

- Abstract base class for all Kafka publishers
- Handles message publishing with proper error handling
- Automatically manages connection state
- Provides consistent logging

#### KafkaConsumerBase

- Abstract base class for all Kafka consumers
- Handles message consumption with proper error handling
- Manages subscription and message processing
- Provides consistent logging

## Usage

### Creating a Publisher

```typescript
import { KafkaPublisherBase } from './infrastructure/messaging/kafka-publisher.base';
import { kafkaClientService } from './infrastructure/messaging/kafka-client.service';

export class MyPublisher extends KafkaPublisherBase {
  constructor() {
    super(kafkaClientService, 'my-topic');
  }

  public async publishMyMessage(data: any): Promise<void> {
    const message = {
      data,
      timestamp: new Date().toISOString(),
    };

    const headers = {
      'message-type': 'my_message',
      source: 'gateway',
    };

    await this.publishMessage(message, 'my-key', headers);
  }
}
```

### Creating a Consumer

```typescript
import { KafkaConsumerBase } from './infrastructure/messaging/kafka-consumer.base';
import { kafkaClientService } from './infrastructure/messaging/kafka-client.service';

export class MyConsumer extends KafkaConsumerBase {
  constructor() {
    super(kafkaClientService, 'my-topic', 'my-consumer-group');
  }

  public async start(): Promise<void> {
    await this.startConsumer(async (message) => {
      await this.handleMessage(message);
    });
  }

  public async stop(): Promise<void> {
    await this.stopConsumer();
  }

  private async handleMessage(message: any): Promise<void> {
    // Process the message
    console.log('Received message:', message);
  }
}
```

## Configuration

Kafka configuration is managed in `src/config/kafka.ts`:

```typescript
export const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'gateway-crawl-request-publisher',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  // ... other configuration
};
```

## Environment Variables

- `KAFKA_CLIENT_ID`: Kafka client identifier
- `KAFKA_BROKERS`: Comma-separated list of Kafka brokers
- `KAFKA_CRAWL_REQUEST_TOPIC`: Topic for crawl requests
- `KAFKA_CRAWL_RESPONSE_TOPIC`: Topic for crawl responses

## Testing

The application includes comprehensive tests for the Kafka messaging components:

- `KafkaClientService` tests
- `KafkaPublisherBase` tests
- `KafkaConsumerBase` tests
- Publisher implementation tests

Run tests with:

```bash
npm test
```

## Lifecycle Management

The application manages Kafka connection lifecycle during startup and shutdown:

1. **Startup**: Connects to Kafka before starting the HTTP server
2. **Shutdown**: Disconnects from Kafka during graceful shutdown
3. **Error Handling**: Comprehensive error handling and logging

## Benefits

- **Resource Efficiency**: Single Kafka client instead of multiple instances
- **Centralized Configuration**: All Kafka settings in one place
- **Better Error Handling**: Comprehensive logging and error management
- **Lifecycle Management**: Proper connection handling during app startup/shutdown
- **Testability**: Easy to mock and test individual components
- **Consistency**: Standardized patterns for publishers and consumers
