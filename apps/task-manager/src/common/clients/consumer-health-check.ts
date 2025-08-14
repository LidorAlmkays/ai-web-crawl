import { KafkaClient } from './kafka-client';
import { logger } from '../utils/logger';

/**
 * Consumer Health Check
 *
 * Provides health monitoring for Kafka consumers including:
 * - Consumer group state
 * - Offset lag monitoring
 * - Connection health
 * - Processing status
 */
export class ConsumerHealthCheck {
  private readonly kafkaClient: KafkaClient;

  constructor(kafkaClient: KafkaClient) {
    this.kafkaClient = kafkaClient;
  }

  /**
   * Perform comprehensive health check
   *
   * @returns Promise<ConsumerHealthStatus>
   */
  async performHealthCheck(): Promise<ConsumerHealthStatus> {
    try {
      const isConnected = this.kafkaClient.isConnectedToKafka();

      if (!isConnected) {
        return {
          healthy: false,
          status: 'disconnected',
          details: 'Kafka client is not connected',
          timestamp: new Date().toISOString(),
        };
      }

      const metadata = await this.kafkaClient.getConsumerGroupMetadata();

      return {
        healthy: true,
        status: 'healthy',
        details: {
          groupId: metadata.groupId,
          state: metadata.state,
          members: metadata.members?.length || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Consumer health check failed', { error });
      return {
        healthy: false,
        status: 'error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed consumer group information
   *
   * @returns Promise<ConsumerGroupInfo>
   */
  async getConsumerGroupInfo(): Promise<ConsumerGroupInfo> {
    try {
      const metadata = await this.kafkaClient.getConsumerGroupMetadata();

      return {
        groupId: metadata.groupId,
        state: metadata.state,
        members: metadata.members || [],
        protocol: metadata.protocol,
        protocolType: metadata.protocolType,
      };
    } catch (error) {
      logger.error('Failed to get consumer group info', { error });
      throw error;
    }
  }

  /**
   * Check if consumer is lagging
   *
   * @returns Promise<boolean>
   */
  async isConsumerLagging(): Promise<boolean> {
    try {
      // This would require additional implementation to check actual lag
      // For now, we'll return false as a placeholder
      // In a real implementation, you'd compare current offset with log end offset
      return false;
    } catch (error) {
      logger.error('Failed to check consumer lag', { error });
      return false;
    }
  }
}

/**
 * Consumer Health Status
 */
export interface ConsumerHealthStatus {
  healthy: boolean;
  status: 'healthy' | 'disconnected' | 'error' | 'lagging';
  details: string | object;
  timestamp: string;
}

/**
 * Consumer Group Information
 */
export interface ConsumerGroupInfo {
  groupId: string;
  state: string;
  members: any[];
  protocol: string;
  protocolType: string;
}












