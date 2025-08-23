import { Kafka, Producer, Consumer } from 'kafkajs';
import { configuration } from '../../config';
import { logger } from '../utils/logger';

/**
 * Factory for creating Kafka clients
 * Manages Kafka producer and consumer instances
 */
export class KafkaFactory {
  private static instance: KafkaFactory;
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;

  private constructor() {}

  public static getInstance(): KafkaFactory {
    if (!KafkaFactory.instance) {
      KafkaFactory.instance = new KafkaFactory();
    }
    return KafkaFactory.instance;
  }

  /**
   * Get or create Kafka instance
   */
  public getKafka(): Kafka {
    if (!this.kafka) {
      const config = configuration.getConfig();
      
      this.kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        retry: {
          initialRetryTime: config.kafka.retry.initialRetryTime,
          retries: config.kafka.retry.retries,
        },
        ssl: config.kafka.ssl.enabled ? config.kafka.ssl : undefined,
      });

      logger.info('Kafka client created', {
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
      });
    }
    return this.kafka;
  }

  /**
   * Get or create Kafka producer
   */
  public async getProducer(): Promise<Producer> {
    if (!this.producer) {
      const kafka = this.getKafka();
      this.producer = kafka.producer();
      
      await this.producer.connect();
      logger.info('Kafka producer connected');
    }
    return this.producer;
  }

  /**
   * Create a new Kafka consumer
   */
  public createConsumer(groupId: string): Consumer {
    const kafka = this.getKafka();
    return kafka.consumer({ groupId });
  }

  /**
   * Disconnect all Kafka clients
   */
  public async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
      logger.info('Kafka producer disconnected');
    }
  }

  /**
   * Reset the factory (useful for testing)
   */
  public reset(): void {
    this.kafka = null;
    this.producer = null;
    logger.info('Kafka factory reset');
  }
}
