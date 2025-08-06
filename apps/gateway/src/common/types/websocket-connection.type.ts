/**
 * Represents a single WebSocket client connection.
 */
export interface IWebSocketConnection {
  id: string;
  socket: any; // WebSocket instance
  userId?: string;
  connectedAt?: Date;
  lastActivity?: Date;
}
