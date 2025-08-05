import { Producer } from 'kafkajs';
import { logger } from '../../../common/utils/logger';
import { IKafkaClientService } from './kafka-client.interface';
import { KafkaMessageBuilder } from './kafka-message-builder';
import { IKafkaMessage } from './kafka-message.interface';

export abstract class KafkaPublisherBase {
  protected producer: Producer;
  protected topic: string;
  protected serviceName: string;
  protected instanceId: string;

  constructor(
    protected kafkaClientService: IKafkaClientService,
    topic: string,
    serviceName = 'gateway',
    instanceId = process.env.INSTANCE_ID || 'default'
  ) {
    this.producer = kafkaClientService.getProducer();
    this.topic = topic;
    this.serviceName = serviceName;
    this.instanceId = instanceId;
  }

  protected async publishMessage<T>(
    data: T,
    key: string,
    messageType: string,
    options?: {
      correlationId?: string;
      traceId?: string;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      connectionId?: string;
      customHeaders?: Record<string, string>;
    }
  ): Promise<void> {
    try {
      if (!this.kafkaClientService.isConnected()) {
        await this.kafkaClientService.connect();
      }

      // Build standardized message with best practices
      const messageBuilder = KafkaMessageBuilder.create(
        this.serviceName,
        this.instanceId
      ).setMessageType(messageType);

      // Add optional headers
      if (options?.correlationId) {
        messageBuilder.setCorrelationId(options.correlationId);
      }
      if (options?.traceId) {
        messageBuilder.setTraceId(options.traceId);
      }
      if (options?.userId) {
        messageBuilder.setUserId(options.userId);
      }
      if (options?.sessionId) {
        messageBuilder.setSessionId(options.sessionId);
      }
      if (options?.requestId) {
        messageBuilder.setRequestId(options.requestId);
      }
      if (options?.connectionId) {
        messageBuilder.setConnectionId(options.connectionId);
      }
      if (options?.customHeaders) {
        Object.entries(options.customHeaders).forEach(([key, value]) => {
          messageBuilder.setCustomHeader(key, value);
        });
      }

      const message: IKafkaMessage<T> = messageBuilder.build(
        data,
        this.topic,
        key
      );

      const messagePayload = {
        topic: this.topic,
        messages: [
          {
            key: message.key,
            value: message.value,
            headers: message.headers,
          },
        ],
      };

      await this.producer.send(messagePayload);

      logger.info('Message published successfully', {
        topic: this.topic,
        key: message.key,
        messageId: message.headers['message-id'],
        messageType: message.headers['message-type'],
        sourceService: message.headers['source-service'],
        correlationId: message.headers['correlation-id'],
        timestamp: message.headers['timestamp'],
      });
    } catch (error) {
      logger.error('Failed to publish message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        topic: this.topic,
        key,
        messageType,
      });
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use publishMessage with proper options instead
   */
  protected async publishMessageLegacy(
    message: any,
    key?: string,
    headers?: Record<string, string>
  ): Promise<void> {
    return this.publishMessage(
      message,
      key || 'default',
      headers?.['message-type'] || 'unknown',
      {
        customHeaders: headers,
      }
    );
  }
}
