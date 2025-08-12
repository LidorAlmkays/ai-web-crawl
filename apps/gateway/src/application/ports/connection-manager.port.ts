import { WebSocket } from 'ws';

export interface IConnectionManagerPort {
  add(email: string, connection: WebSocket): void;
  remove(connection: WebSocket): void;
  getConnectionByEmail(email: string): WebSocket | undefined;
  getEmailByConnection(connection: WebSocket): string | undefined;
}
