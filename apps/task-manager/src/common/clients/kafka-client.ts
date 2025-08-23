import {
  Kafka,
  Consumer,
  Producer,
  EachMessagePayload,
  ITopicMetadata,
} from 'kafkajs';
import { kafkaConfig } from '../../config';
import { logger } from '../utils/logger';
import { extractTraceContextFromHeaders, createTraceContextForLogging } from '../utils/trace-context-extractor';
import { SimpleSpanManager } from '../utils/simple-span-manager';

// Suppress KafkaJS internal logs
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
process.env.KAFKAJS_LOG_LEVEL = 'error';

/**
 * Kafka Client
 *
 * Manages Kafka connections, consumers, and producers for the Task Manager service.
 * Provides a clean interface for subscribing to topics and sending messages.
 * Uses simple manual offset management - commits only after successful processing.
 *
 * This client encapsulates all Kafka-specific operations and provides a
 * simplified interface for the application layer. It handles connection
 * management, message consumption, and production with proper error handling
 * and logging.
 *
 * The client uses manual offset management to ensure messages are only
 * committed after successful processing, preventing message loss.
 */
export class KafkaClient {
  private static instance: KafkaClient | null = null;
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private isConnected = false;

  /**
   * Gets the singleton instance of KafkaClient
   * 
   * @returns The singleton KafkaClient instance
   */
  public static getInstance(): KafkaClient {
    if (!KafkaClient.instance) {
      KafkaClient.instance = new KafkaClient();
    }
    return KafkaClient.instance;
  }

  /**
   * Creates a new KafkaClient instance
   *
   * Initializes the Kafka client with the configured brokers, consumer group,
   * and producer settings. Sets up connection parameters and logging.
   */
  private constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: kafkaConfig.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer();

    // Log routine operation (client creation) at DEBUG level
    logger.debug('Kafka client created', {
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      groupId: kafkaConfig.groupId,
    });
  }

  /**
   * Connects to Kafka brokers
   *
   * Establishes connections to both consumer and producer components.
   * This method must be called before any Kafka operations can be performed.
   *
   * @throws Error - When connection to Kafka brokers fails
   *
   * @example
   * ```typescript
   * await kafkaClient.connect();
   * ```
   */
  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.producer.connect();
      this.isConnected = true;

      // Log important event (Kafka connection) at INFO level
      // Remove: 'Kafka connected successfully' - let Kafka client handle its own log
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error });
      throw error;
    }
  }

  /**
   * Disconnects from Kafka brokers
   *
   * Gracefully closes consumer and producer connections.
   * This method should be called during application shutdown.
   *
   * @throws Error - When disconnection fails
   *
   * @example
   * ```typescript
   * await kafkaClient.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      this.isConnected = false;

      // Log important event (Kafka disconnection) at INFO level
      logger.info('Kafka disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Kafka', { error });
      throw error;
    }
  }

  private messageHandlers: Map<
    string,
    (payload: EachMessagePayload, traceContext?: any) => Promise<void>
  > = new Map();
  private isRunning = false;

  /**
   * Gets the current connection status
   *
   * @returns true if connected to Kafka, false otherwise
   *
   * @example
   * ```typescript
   * if (kafkaClient.getConnectionStatus()) {
   *   console.log('Connected to Kafka');
   * }
   * ```
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Fetches cluster metadata using an admin client
   *
   * Creates, connects, fetches metadata, and closes the admin client.
   * This method provides information about the Kafka cluster topology.
   *
   * @returns Promise resolving to cluster metadata including topics and cluster info
   * @throws Error - When metadata fetching fails
   *
   * @example
   * ```typescript
   * const metadata = await kafkaClient.fetchClusterMetadata();
   * console.log(`Cluster has ${metadata.topicsCount} topics`);
   * ```
   */
  public async fetchClusterMetadata(): Promise<{
    topics: ITopicMetadata[];
    topicsCount: number;
    clusterId?: string;
    controllerId?: number;
  }> {
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      const metadata = await admin.fetchTopicMetadata();
      const { clusterId, controllerId } = metadata as any;
      return {
        topics: metadata.topics,
        topicsCount: metadata.topics.length,
        clusterId,
        controllerId,
      };
    } finally {
      try {
        await admin.disconnect();
      } catch (e) {
        logger.error('Failed to disconnect Kafka admin client cleanly');
      }
    }
  }

  /**
   * Subscribes to a Kafka topic
   *
   * Registers a message handler for a specific topic and subscribes
   * the consumer to that topic. The handler will be called for each
   * message received from the topic.
   *
   * @param topic - The topic to subscribe to
   * @param handler - The message handler function to process messages
   * @throws Error - When subscription fails
   *
   * @example
   * ```typescript
   * await kafkaClient.subscribe('my-topic', async (payload) => {
   *   console.log('Received message:', payload.message.value);
   * });
   * ```
   */
  async subscribe(
    topic: string,
    handler: (payload: EachMessagePayload, traceContext?: any) => Promise<void>
  ): Promise<void> {
    try {
      // Store the handler for this topic
      this.messageHandlers.set(topic, handler);

      // Subscribe to the topic
      await this.consumer.subscribe({ topic, fromBeginning: false });

      // Log important event (topic subscription) at INFO level
      logger.info(`Subscribed to topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topic: ${topic}`, { error });
      throw error;
    }
  }

  /**
   * Starts consuming messages from all subscribed topics
   *
   * Uses simple manual offset management - commits only after successful processing.
   * This ensures that messages are not lost if processing fails.
   *
   * @throws Error - When consumption fails to start
   *
   * @example
   * ```typescript
   * await kafkaClient.startConsuming();
   * ```
   */
  async startConsuming(): Promise<void> {
    if (this.isRunning) {
      logger.error('Consumer is already running');
      return;
    }

    try {
      await this.consumer.run({
        autoCommit: false, // Manual offset management
        autoCommitInterval: 0, // Disable auto commit
        autoCommitThreshold: 0, // Disable auto commit
        eachMessage: async (payload) => {
          try {
            const topic = payload.topic;
            const handler = this.messageHandlers.get(topic);

            if (!handler) {
              logger.error(`No handler found for topic: ${topic}`);
              return;
            }

            // Extract trace context from headers (passive extraction)
            const traceContext = extractTraceContextFromHeaders(payload.message.headers || {});
            
            // Use withSpan pattern for proper span management
            await SimpleSpanManager.withSpan(
              'kafka-message-processing',
              async (span) => {
                // Log routine operation (message processing) at DEBUG level
                logger.debug('Processing Kafka message', {
                  topic,
                  partition: payload.partition,
                  offset: payload.message.offset,
                  ...createTraceContextForLogging(traceContext),
                });

                // Process the message with trace context
                await handler(payload, traceContext);
              },
              traceContext,
              {
                'messaging.kafka.topic': topic,
                'messaging.kafka.partition': payload.partition,
                'messaging.kafka.offset': payload.message.offset,
              }
            );

            // Commit offset only after successful processing
            await this.consumer.commitOffsets([
              {
                topic: payload.topic,
                partition: payload.partition,
                offset: (BigInt(payload.message.offset) + 1n).toString(),
              },
            ]);

            // Log routine operation (offset commit) at DEBUG level
            logger.debug(
              'Successfully processed Kafka message and committed offset',
              {
                topic,
                partition: payload.partition,
                offset: payload.message.offset,
              }
            );
          } catch (error) {
            // Log error event at ERROR level (this will be handled by stacked error handler)
            logger.error(
              'Error processing Kafka message - offset will not be committed',
              {
                topic: payload.topic,
                partition: payload.partition,
                offset: payload.message.offset,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            // Don't commit offset on error - message will be reprocessed
          }
        },
      });

      this.isRunning = true;

      // Log important event (consumer start) at INFO level
      logger.info('Started consuming messages from all subscribed topics');
    } catch (error) {
      logger.error('Failed to start consuming messages', { error });
      throw error;
    }
  }

  /**
   * Sends a message to a Kafka topic
   *
   * @param topic - The topic to send the message to
   * @param message - The message to send (will be JSON stringified)
   * @throws Error - When message sending fails
   *
   * @example
   * ```typescript
   * await kafkaClient.sendMessage('my-topic', { key: 'value' });
   * ```
   */
  async sendMessage(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      logger.debug('Message sent to Kafka', { topic, message });
    } catch (error) {
      logger.error('Failed to send message to Kafka', { topic, error });
      throw error;
    }
  }

  /**
   * Checks if the client is connected to Kafka
   *
   * @returns true if connected, false otherwise
   *
   * @example
   * ```typescript
   * if (kafkaClient.isConnectedToKafka()) {
   *   console.log('Kafka connection is active');
   * }
   * ```
   */
  isConnectedToKafka(): boolean {
    return this.isConnected;
  }



  /**
   * Produces messages to Kafka with advanced options
   *
   * @param options - Production options including topic, messages, timeout, and acks
   * @returns Promise resolving to array of message results
   * @throws Error - When message production fails
   *
   * @example
   * ```typescript
   * const results = await kafkaClient.produce({
   *   topic: 'my-topic',
   *   messages: [{ key: 'key1', value: 'value1' }],
   *   timeout: 30000,
   *   acks: 1
   * });
   * ```
   */
  async produce(options: {
    topic: string;
    messages: Array<{
      key?: string | Buffer;
      value: string | Buffer;
      headers?: Record<string, Buffer>;
    }>;
    timeout?: number;
    acks?: number;
  }): Promise<Array<{ partition: number; offset: string; baseOffset: number }>> {
    try {
      const result = await this.producer.send({
        topic: options.topic,
        messages: options.messages,
        timeout: options.timeout || 30000,
        acks: options.acks || 1,
      });

      logger.debug('Messages produced to Kafka', {
        topic: options.topic,
        messageCount: options.messages.length,
        results: result,
      });

      return result.map((record) => ({
        partition: record.partition,
        offset: record.offset || '',
        baseOffset: typeof record.baseOffset === 'number' ? record.baseOffset : 0,
      }));
    } catch (error) {
      logger.error('Failed to produce messages to Kafka', {
        topic: options.topic,
        error,
      });
      throw error;
    }
  }

  /**
   * Gets Kafka metadata for specified topics
   *
   * @param topics - Array of topic names to get metadata for
   * @returns Promise resolving to topic metadata
   * @throws Error - When metadata retrieval fails
   *
   * @example
   * ```typescript
   * const metadata = await kafkaClient.getMetadata(['my-topic']);
   * console.log('Topic partitions:', metadata.topics[0].partitions.length);
   * ```
   */
  async getMetadata(topics: string[]): Promise<{ topics: ITopicMetadata[] }> {
    try {
      const metadata = await this.kafka.admin().fetchTopicMetadata({ topics });
      logger.debug('Kafka metadata retrieved', { topics, metadata });
      return metadata;
    } catch (error) {
      logger.error('Failed to get Kafka metadata', { topics, error });
      throw error;
    }
  }

  /**
   * Gets the current Kafka client configuration
   *
   * @returns Configuration object
   */
  getConfig(): any {
    return {
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      groupId: kafkaConfig.groupId,
      isConnected: this.isConnected,
    };
  }

  /**
   * Pauses consumption for specific topics
   *
   * @param topics - Array of topic-partition pairs to pause
   * @throws Error - When pause operation fails
   *
   * @example
   * ```typescript
   * await kafkaClient.pauseTopics([{ topic: 'my-topic' }]);
   * ```
   */
  async pauseTopics(
    topics: Array<{ topic: string; partition?: number }>
  ): Promise<void> {
    try {
      await this.consumer.pause(topics);
      logger.debug('Topics paused successfully', { topics });
    } catch (error) {
      logger.error('Failed to pause topics', { error, topics });
      throw error;
    }
  }

  /**
   * Resumes consumption for specific topics
   *
   * @param topics - Array of topic-partition pairs to resume
   * @throws Error - When resume operation fails
   *
   * @example
   * ```typescript
   * await kafkaClient.resumeTopics([{ topic: 'my-topic' }]);
   * ```
   */
  async resumeTopics(
    topics: Array<{ topic: string; partition?: number }>
  ): Promise<void> {
    try {
      await this.consumer.resume(topics);
      logger.debug('Topics resumed successfully', { topics });
    } catch (error) {
      logger.error('Failed to resume topics', { error, topics });
      throw error;
    }
  }

  /**
   * Gets current consumer group metadata
   *
   * @returns Promise resolving to consumer group metadata
   * @throws Error - When metadata retrieval fails
   *
   * @example
   * ```typescript
   * const metadata = await kafkaClient.getConsumerGroupMetadata();
   * console.log('Consumer group:', metadata.groupId);
   * ```
   */
  async getConsumerGroupMetadata(): Promise<any> {
    try {
      const metadata = await this.consumer.describeGroup();
      logger.debug('Consumer group metadata retrieved', { metadata });
      return metadata;
    } catch (error) {
      logger.error('Failed to get consumer group metadata', { error });
      throw error;
    }
  }


}
