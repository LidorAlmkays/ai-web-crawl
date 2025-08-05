/**
 * Standard Kafka message headers following best practices
 */
export interface IKafkaMessageHeaders {
  // Message identification
  'message-id': string;
  'message-type': string;
  'message-version': string;

  // Service identification
  'source-service': string;

  // Timestamp information
  timestamp: string;
  'created-at': string;

  // Correlation and tracing
  'correlation-id'?: string;
  'trace-id'?: string;
  'span-id'?: string;

  // Message metadata
  'content-type': string;
  encoding: string;

  // Business context
  'user-id'?: string;
  'session-id'?: string;
  'request-id'?: string;
  'connection-id'?: string;

  // Custom headers
  [key: string]: string | undefined;
}

/**
 * Standard Kafka message payload structure
 */
export interface IKafkaMessagePayload<T = any> {
  data: T;
  metadata: {
    messageId: string;
    timestamp: string;
    version: string;
    correlationId?: string;
    traceId?: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
  };
}

/**
 * Complete Kafka message structure
 */
export interface IKafkaMessage<T = any> {
  topic: string;
  key: string;
  value: string; // JSON stringified payload
  headers: IKafkaMessageHeaders;
  payload: IKafkaMessagePayload<T>;
}

/**
 * Message builder interface for creating standardized messages
 */
export interface IKafkaMessageBuilder {
  setMessageType(messageType: string): IKafkaMessageBuilder;
  setMessageVersion(version: string): IKafkaMessageBuilder;
  setCorrelationId(correlationId: string): IKafkaMessageBuilder;
  setTraceId(traceId: string): IKafkaMessageBuilder;
  setUserId(userId: string): IKafkaMessageBuilder;
  setSessionId(sessionId: string): IKafkaMessageBuilder;
  setRequestId(requestId: string): IKafkaMessageBuilder;
  setConnectionId(connectionId: string): IKafkaMessageBuilder;
  setCustomHeader(key: string, value: string): IKafkaMessageBuilder;
  build<T>(data: T, topic: string, key: string): IKafkaMessage<T>;
}
