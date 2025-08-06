import { IUserNotificationPort } from '../../ports/user-notification.port';
import { WebSocketServerManager } from '../../../common/clients/websocket-server';
import { IWebSocketMessage } from '../../../common/types';
import { logger } from '../../../common/utils/logger';

export class WebSocketUserNotificationAdapter implements IUserNotificationPort {
  constructor(private readonly webSocketManager: WebSocketServerManager) {}

  async send(connectionId: string, message: IWebSocketMessage): Promise<void> {
    logger.info('Sending notification to user', {
      connectionId,
      type: message.type,
    });
    try {
      this.webSocketManager.sendMessage(connectionId, message);
    } catch (error) {
      logger.error('Failed to send notification to user', {
        connectionId,
        error:
          error instanceof Error ? error.message : 'Unknown WebSocket error',
      });
    }
  }
}
