import { Consumer } from 'kafkajs';
import { logger } from '../../../common/utils/logger';
import { IKafkaClientService } from './kafka-client.interface';

export abstract class KafkaConsumerBase {
  protected consumer: Consumer;
  protected topic: string;
  protected groupId: string;

  constructor(
    protected kafkaClientService: IKafkaClientService,
    topic: string,
    groupId: string
  ) {
    this.consumer = kafkaClientService.getConsumer(groupId);
    this.topic = topic;
    this.groupId = groupId;
  }

  protected async startConsumer(
    messageHandler: (message: any) => Promise<void>
  ): Promise<void> {
    try {
      if (!this.kafkaClientService.isConnected()) {
        await this.kafkaClientService.connect();
      }

      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = JSON.parse(message.value?.toString() || '{}');

            logger.debug('Processing Kafka message', {
              topic,
              partition,
              offset: message.offset,
              groupId: this.groupId,
            });

            await messageHandler(messageValue);
          } catch (error) {
            logger.error('Error processing Kafka message', {
              error: error instanceof Error ? error.message : 'Unknown error',
              topic,
              partition,
              offset: message.offset,
            });
          }
        },
      });

      logger.info('Kafka consumer started successfully', {
        topic: this.topic,
        groupId: this.groupId,
      });
    } catch (error) {
      logger.error('Failed to start Kafka consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        topic: this.topic,
        groupId: this.groupId,
      });
      throw error;
    }
  }

  protected async stopConsumer(): Promise<void> {
    try {
      await this.consumer.disconnect();
      logger.info('Kafka consumer stopped successfully', {
        topic: this.topic,
        groupId: this.groupId,
      });
    } catch (error) {
      logger.error('Failed to stop Kafka consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        topic: this.topic,
        groupId: this.groupId,
      });
      throw error;
    }
  }
}
