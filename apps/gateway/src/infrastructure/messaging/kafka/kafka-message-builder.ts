import { v4 as uuidv4 } from 'uuid';
import {
  IKafkaMessageHeaders,
  IKafkaMessagePayload,
  IKafkaMessage,
  IKafkaMessageBuilder,
} from './kafka-message.interface';

/**
 * Kafka message builder implementing best practices
 * Provides fluent interface for creating standardized Kafka messages
 */
export class KafkaMessageBuilder implements IKafkaMessageBuilder {
  private headers: Partial<IKafkaMessageHeaders> = {};
  private metadata: Partial<IKafkaMessagePayload['metadata']> = {};

  constructor(private serviceName: string) {
    // Set default headers
    this.headers['source-service'] = serviceName;
    this.headers['content-type'] = 'application/json';
    this.headers['encoding'] = 'utf-8';
    this.headers['timestamp'] = new Date().toISOString();
    this.headers['created-at'] = new Date().toISOString();
    this.headers['message-id'] = uuidv4();
    this.headers['message-version'] = '1.0.0';
  }

  public setMessageType(messageType: string): IKafkaMessageBuilder {
    this.headers['message-type'] = messageType;
    return this;
  }

  public setMessageVersion(version: string): IKafkaMessageBuilder {
    this.headers['message-version'] = version;
    this.metadata.version = version;
    return this;
  }

  public setCorrelationId(correlationId: string): IKafkaMessageBuilder {
    this.headers['correlation-id'] = correlationId;
    this.metadata.correlationId = correlationId;
    return this;
  }

  public setTraceId(traceId: string): IKafkaMessageBuilder {
    this.headers['trace-id'] = traceId;
    this.metadata.traceId = traceId;
    return this;
  }

  public setSpanId(spanId: string): IKafkaMessageBuilder {
    this.headers['span-id'] = spanId;
    return this;
  }

  public setUserId(userId: string): IKafkaMessageBuilder {
    this.headers['user-id'] = userId;
    this.metadata.userId = userId;
    return this;
  }

  public setSessionId(sessionId: string): IKafkaMessageBuilder {
    this.headers['session-id'] = sessionId;
    this.metadata.sessionId = sessionId;
    return this;
  }

  public setRequestId(requestId: string): IKafkaMessageBuilder {
    this.headers['request-id'] = requestId;
    this.metadata.requestId = requestId;
    return this;
  }

  public setConnectionId(connectionId: string): IKafkaMessageBuilder {
    this.headers['connection-id'] = connectionId;
    return this;
  }

  public setCustomHeader(key: string, value: string): IKafkaMessageBuilder {
    this.headers[key] = value;
    return this;
  }

  public build<T>(data: T, topic: string, key: string): IKafkaMessage<T> {
    const messageId = this.headers['message-id'] || uuidv4();
    const timestamp = new Date().toISOString();

    // Ensure required headers are set
    const completeHeaders: IKafkaMessageHeaders = {
      'message-id': messageId,
      'message-type': this.headers['message-type'] || 'unknown',
      'message-version': this.headers['message-version'] || '1.0.0',
      'source-service': this.headers['source-service'] || this.serviceName,
      timestamp: timestamp,
      'created-at': this.headers['created-at'] || timestamp,
      'content-type': this.headers['content-type'] || 'application/json',
      encoding: this.headers['encoding'] || 'utf-8',
      'correlation-id': this.headers['correlation-id'],
      'trace-id': this.headers['trace-id'],
      'span-id': this.headers['span-id'],
      'user-id': this.headers['user-id'],
      'session-id': this.headers['session-id'],
      'request-id': this.headers['request-id'],
      ...this.headers,
    };

    // Build payload with metadata
    const payload: IKafkaMessagePayload<T> = {
      data,
      metadata: {
        messageId,
        timestamp,
        version: completeHeaders['message-version'],
        correlationId: completeHeaders['correlation-id'],
        traceId: completeHeaders['trace-id'],
        userId: completeHeaders['user-id'],
        sessionId: completeHeaders['session-id'],
        requestId: completeHeaders['request-id'],
      },
    };

    return {
      topic,
      key,
      value: JSON.stringify(payload),
      headers: completeHeaders,
      payload,
    };
  }

  /**
   * Create a new message builder instance
   */
  public static create(
    serviceName: string,
    instanceId: string
  ): KafkaMessageBuilder {
    return new KafkaMessageBuilder(serviceName, instanceId);
  }

  /**
   * Create a message builder with correlation ID for request tracing
   */
  public static createWithCorrelation(
    serviceName: string,
    instanceId: string,
    correlationId: string
  ): KafkaMessageBuilder {
    return new KafkaMessageBuilder(serviceName, instanceId).setCorrelationId(
      correlationId
    );
  }
}
