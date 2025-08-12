import { WebSocket } from 'ws';
import { IConnectionManagerPort } from '../ports/connection-manager.port';
import { logger } from '../../common/utils/logger';

export class ConnectionManagerService implements IConnectionManagerPort {
  private emailToConnection = new Map<string, WebSocket>();
  private connectionToEmail = new Map<WebSocket, string>();

  add(email: string, connection: WebSocket): void {
    // If user is already connected, terminate the old connection
    const oldConnection = this.emailToConnection.get(email);
    if (oldConnection && oldConnection !== connection) {
      logger.warn(`User ${email} reconnected, terminating old connection.`);
      oldConnection.terminate();
      this.remove(oldConnection);
    }

    this.emailToConnection.set(email, connection);
    this.connectionToEmail.set(connection, email);
    logger.info(`Connection added for user ${email}`);
  }

  remove(connection: WebSocket): void {
    const email = this.connectionToEmail.get(connection);
    if (email) {
      this.connectionToEmail.delete(connection);
      // Only remove the email-to-connection mapping if the connection being removed
      // is the currently active one for that email.
      if (this.emailToConnection.get(email) === connection) {
        this.emailToConnection.delete(email);
      }
      logger.info(`Connection removed for user ${email}`);
    }
  }

  getConnectionByEmail(email: string): WebSocket | undefined {
    return this.emailToConnection.get(email);
  }

  getEmailByConnection(connection: WebSocket): string | undefined {
    return this.connectionToEmail.get(connection);
  }
}
