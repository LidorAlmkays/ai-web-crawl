import { IWebSocketConnection } from './websocket-connection.type';
import { IWebSocketMessage } from './websocket-message.type';

/**
 * Defines the functional contract for a WebSocket message handler.
 * A function of this type is responsible for processing a specific message type.
 */
export type IWebSocketMessageHandler = (
  connection: IWebSocketConnection,
  message: IWebSocketMessage
) => Promise<void>;

/**
 * Defines the contract for a class that contains a WebSocket message handler.
 * This is useful for dependency injection.
 */
export interface IWebSocketHandler {
  handle: IWebSocketMessageHandler;
}
