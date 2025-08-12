import { IUserNotificationPort } from '../../ports/user-notification.port';
import { IWebSocketMessage } from '../../../common/types';
import { logger } from '../../../common/utils/logger';
import { WebSocket } from 'ws';

export class WebSocketUserNotificationAdapter implements IUserNotificationPort {
  async send(connection: WebSocket, message: IWebSocketMessage): Promise<void> {
    logger.info('Sending notification to user', {
      type: message.event,
    });
    try {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(message));
      } else {
        logger.warn(
          'Attempted to send message to a closed WebSocket connection.'
        );
      }
    } catch (error) {
      logger.error('Failed to send notification to user', {
        error:
          error instanceof Error ? error.message : 'Unknown WebSocket error',
      });
    }
  }
}
