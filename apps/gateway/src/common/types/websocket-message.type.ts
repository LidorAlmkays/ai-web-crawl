/**
 * Defines the contract for a generic WebSocket message.
 */
export interface IWebSocketMessage {
  event: string;
  data: any;
  timestamp?: string;
}
