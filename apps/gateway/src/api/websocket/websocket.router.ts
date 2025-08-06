import { logger } from '../../common/utils/logger';
import { IWebSocketMessageHandler } from '../../common/types';

/**
 * A dictionary to store message handlers, mapping message types to their handler functions.
 * @type {{ [messageType: string]: IWebSocketMessageHandler }}
 */
const messageHandlers: { [messageType: string]: IWebSocketMessageHandler } = {};

/**
 * Registers a message handler for a specific message type.
 * This function populates the messageHandlers dictionary.
 *
 * @param {string} messageType - The type of the message (e.g., 'webscrape').
 * @param {IWebSocketMessageHandler} handler - The handler function to execute for the message type.
 */
export function registerWebSocketHandler(
  messageType: string,
  handler: IWebSocketMessageHandler
): void {
  if (messageHandlers[messageType]) {
    logger.warn(
      `Overwriting existing handler for message type: ${messageType}`
    );
  }
  messageHandlers[messageType] = handler;
  logger.info(
    `Registered WebSocket handler for message type: "${messageType}"`
  );
}

/**
 * Retrieves the handler for a given message type.
 *
 * @param {string} messageType - The type of the message.
 * @returns {IWebSocketMessageHandler | undefined} The handler function or undefined if not found.
 */
export function getWebSocketHandler(
  messageType: string
): IWebSocketMessageHandler | undefined {
  return messageHandlers[messageType];
}
