import { KafkaClient } from '../../../../common/clients/kafka-client';
import { kafkaConfig } from '../../../../config';
import { WebCrawlRequestMessageDto } from '../dtos/web-crawl-request.dto';
import { logger } from '../../../../common/utils/logger';
import { validateDto } from '../../../../common/utils/validation';

export interface PublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
  topic?: string;
  partition?: number;
  offset?: number;
}

export interface PublishOptions {
  timeout?: number;
  retries?: number;
  acks?: number;
}

/**
 * Publisher for web crawl request messages
 * Uses singleton Kafka client to ensure single instance management
 */
export class WebCrawlRequestPublisher {
  private readonly kafkaClient: KafkaClient;
  private readonly topicName: string;

  constructor() {
    this.kafkaClient = KafkaClient.getInstance();
    this.topicName = kafkaConfig.topics.webCrawlRequest;
  }

  /**
   * Publish web crawl request message
   */
  async publish(message: WebCrawlRequestMessageDto, options: PublishOptions = {}): Promise<PublishResult> {
    try {
      // Validate message before publishing
      const validation = await validateDto(WebCrawlRequestMessageDto, message);
      if (!validation.isValid) {
        const error = `Message validation failed: ${validation.errorMessage}`;
        logger.error('Failed to publish web crawl request - validation error', {
          errors: validation.errorMessage,
          taskId: message.headers.task_id,
        });
        return {
          success: false,
          error,
          topic: this.topicName,
        };
      }

      // Prepare Kafka message (auto-instrumentation handles trace context)
      const kafkaMessage = this.prepareKafkaMessage(message);

      // Publish to Kafka
      const result = await this.kafkaClient.produce({
        topic: this.topicName,
        messages: [kafkaMessage],
        timeout: options.timeout || 30000, // 30 seconds default
        acks: options.acks || 1, // Wait for leader acknowledgment
      });

      // Success log (application layer): message sent to Kafka
      logger.info('Web crawl request published to Kafka', {
        topic: this.topicName,
        taskId: message.headers.task_id,
        partition: result[0]?.partition,
        offset: typeof result[0]?.offset === 'number' ? result[0].offset : 0,
      });

      return {
        success: true,
        messageId: result[0]?.baseOffset?.toString(),
        topic: this.topicName,
        partition: result[0]?.partition,
        offset: typeof result[0]?.offset === 'number' ? result[0].offset : 0,
      };
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Failed to publish web crawl request', {
        error: errorMessage,
        taskId: message.headers.task_id,
        topic: this.topicName,
        userEmail: message.body.user_email,
        baseUrl: message.body.base_url,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: errorMessage,
        topic: this.topicName,
      };
    }
  }

  /**
   * Publish web crawl request from task data
   */
  async publishFromTaskData(taskId: string, userEmail: string, userQuery: string, baseUrl: string, options: PublishOptions = {}): Promise<PublishResult> {
    try {
      const message = new WebCrawlRequestMessageDto();
      message.headers = {
        task_id: taskId,
        timestamp: new Date().toISOString(),
      };
      message.body = {
        user_email: userEmail,
        user_query: userQuery,
        base_url: baseUrl,
      };

      return await this.publish(message, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Failed to create web crawl request message', {
        error: errorMessage,
        taskId,
        userEmail,
        baseUrl,
      });

      return {
        success: false,
        error: `Failed to create message: ${errorMessage}`,
        topic: this.topicName,
      };
    }
  }

  /**
   * Prepare Kafka message with proper headers
   */
  private prepareKafkaMessage(message: WebCrawlRequestMessageDto) {
    const headers: Record<string, Buffer> = {};

    // Add task_id header
    headers['task_id'] = Buffer.from(message.headers.task_id);



    // Add timestamp
    headers['timestamp'] = Buffer.from(Date.now().toString());

    return {
      key: message.headers.task_id, // Use task_id as message key for partitioning
      value: Buffer.from(JSON.stringify(message.body)),
      headers,
    };
  }



  /**
   * Get publisher status and configuration
   */
  getStatus(): {
    topicName: string;
    kafkaClientConnected: boolean;
    kafkaClientConfig: any;
  } {
    return {
      topicName: this.topicName,
      kafkaClientConnected: this.kafkaClient.isConnectedToKafka(),
      kafkaClientConfig: this.kafkaClient.getConfig(),
    };
  }

  /**
   * Validate publisher configuration
   */
  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if Kafka client is connected
      if (!this.kafkaClient.isConnectedToKafka()) {
        errors.push('Kafka client is not connected');
      }

      // Check if topic exists (optional check)
      try {
        const metadata = await this.kafkaClient.getMetadata([this.topicName]);
        const topicMetadata = metadata.topics.find((t) => t.name === this.topicName);

        if (!topicMetadata) {
          warnings.push(`Topic ${this.topicName} does not exist and will be auto-created`);
        }
      } catch (error) {
        warnings.push(`Could not verify topic existence: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Validate topic name format
      if (!this.topicName || this.topicName.trim() === '') {
        errors.push('Topic name is empty');
      }

      if (this.topicName.length > 249) {
        errors.push('Topic name is too long (max 249 characters)');
      }
    } catch (error) {
      errors.push(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Factory function to create web crawl request publisher
 */
export function createWebCrawlRequestPublisher(): WebCrawlRequestPublisher {
  return new WebCrawlRequestPublisher();
}
