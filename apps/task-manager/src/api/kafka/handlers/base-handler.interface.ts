import { EachMessagePayload } from 'kafkajs';

/**
 * Base interface for message handlers
 *
 * Defines the contract for processing Kafka messages. This interface
 * provides a standard way to handle incoming Kafka messages across
 * different message types and processing requirements.
 *
 * The interface follows the Strategy pattern and allows for different
 * message processing strategies to be implemented while maintaining
 * a consistent interface.
 */
export interface IHandler {
  /**
   * Processes a Kafka message
   *
   * This method is responsible for handling a single Kafka message
   * and performing the necessary business logic based on the message
   * content and headers.
   *
   * @param message - The full Kafka message payload containing headers, value, and metadata
   * @returns Promise that resolves when message processing is complete
   * @throws Error - When message processing fails
   *
   * @example
   * ```typescript
   * class MyHandler implements IHandler {
   *   async process(message: EachMessagePayload): Promise<void> {
   *     const data = JSON.parse(message.message.value?.toString() || '{}');
   *     await this.processData(data);
   *   }
   * }
   * ```
   */
  process(message: EachMessagePayload): Promise<void>;
}
