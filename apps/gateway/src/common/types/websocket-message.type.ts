/**
 * Defines the contract for a generic WebSocket message.
 */
export interface IWebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}
