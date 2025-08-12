import { IWebSocketMessage } from '../../common/types';
import { WebSocket } from 'ws';

export interface IUserNotificationPort {
  send(connection: WebSocket, message: IWebSocketMessage): Promise<void>;
}
