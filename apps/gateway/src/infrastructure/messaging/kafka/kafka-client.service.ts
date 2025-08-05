import { Kafka, Producer, Consumer, KafkaConfig } from 'kafkajs';
import { logger } from '../../../common/utils/logger';
import { kafkaConfig } from '../../../config/kafka';
import { IKafkaClientService } from './kafka-client.interface';

export class KafkaClientService implements IKafkaClientService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private isConnectedFlag = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    logger.info('Kafka client service initialized', {
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
  }

  public getProducer(): Producer {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      logger.debug('Kafka producer created');
    }
    return this.producer;
  }

  public getConsumer(groupId = 'default-group'): Consumer {
    if (!this.consumers.has(groupId)) {
      const consumer = this.kafka.consumer({ groupId });
      this.consumers.set(groupId, consumer);
      logger.debug('Kafka consumer created', { groupId });
    }
    return this.consumers.get(groupId)!;
  }

  public async connect(): Promise<void> {
    try {
      if (this.isConnectedFlag) {
        logger.warn('Kafka client already connected');
        return;
      }

      const producer = this.getProducer();
      await producer.connect();

      this.isConnectedFlag = true;
      logger.info('Kafka client connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnectedFlag) {
        logger.warn('Kafka client already disconnected');
        return;
      }

      // Disconnect producer
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      // Disconnect all consumers
      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        logger.debug('Kafka consumer disconnected', { groupId });
      }
      this.consumers.clear();

      this.isConnectedFlag = false;
      logger.info('Kafka client disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect Kafka client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.isConnectedFlag;
  }
}

// Singleton instance for dependency injection
export const kafkaClientService = new KafkaClientService();
