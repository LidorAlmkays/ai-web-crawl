import { IWebSocketMessage } from '../../common/types';

export interface IUserNotificationPort {
  send(connectionId: string, message: IWebSocketMessage): Promise<void>;
}
