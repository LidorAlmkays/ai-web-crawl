import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { IWebSocketConnection, IWebSocketMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getWebSocketHandler } from '../../api/websocket/websocket.router';

/**
 * Centralized WebSocket Server Manager
 * Implements singleton pattern to ensure single WebSocket server instance
 * across the entire application. It now uses a centralized router to handle messages.
 */
export class WebSocketServerManager {
  private wss: WebSocketServer;
  private connections: Map<string, IWebSocketConnection> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const connectionId = uuidv4();
      const connection: IWebSocketConnection = {
        id: connectionId,
        socket: ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.connections.set(connectionId, connection);
      logger.info('WebSocket client connected', {
        connectionId,
        totalConnections: this.connections.size,
      });

      ws.on('message', async (message: Buffer) => {
        try {
          connection.lastActivity = new Date();
          const parsedMessage = JSON.parse(
            message.toString()
          ) as IWebSocketMessage;

          logger.info('WebSocket message received', {
            connectionId,
            messageType: parsedMessage.type,
            hasData: !!parsedMessage.data,
          });

          // Use the central router to get the handler
          const handler = getWebSocketHandler(parsedMessage.type);

          if (handler) {
            await handler(connection, parsedMessage);
          } else {
            logger.warn('No handler found for message type', {
              type: parsedMessage.type,
              connectionId,
            });
            this.sendMessage(connectionId, {
              type: 'error',
              data: {
                error: `Unknown message type: ${parsedMessage.type}`,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error('Error processing WebSocket message', {
            error: error instanceof Error ? error.message : 'Unknown error',
            connectionId,
          });
          this.sendMessage(connectionId, {
            type: 'error',
            data: {
              error: 'Failed to process message',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: new Date().toISOString(),
          });
        }
      });

      ws.on('close', () => {
        this.connections.delete(connectionId);
        logger.info('WebSocket client disconnected', {
          connectionId,
          totalConnections: this.connections.size,
        });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', {
          error: error.message,
          connectionId,
        });
      });

      this.sendMessage(connectionId, {
        type: 'connected',
        data: {
          connectionId,
          message: 'Connected to Gateway WebSocket server',
        },
        timestamp: new Date().toISOString(),
      });
    });

    logger.info(`WebSocket server started on port ${this.wss.options.port}`);
  }

  public sendMessage(connectionId: string, message: IWebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
      connection.lastActivity = new Date();
    } else {
      logger.warn('Connection not found or not open for sending message', {
        connectionId,
      });
    }
  }

  public broadcast(message: IWebSocketMessage): void {
    let sentCount = 0;
    this.connections.forEach((connection) => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        this.sendMessage(connection.id, message);
        sentCount++;
      }
    });
    logger.info('Message broadcasted', {
      sentCount,
      messageType: message.type,
    });
  }

  public close(): void {
    this.wss.close();
    this.connections.forEach((conn) => conn.socket.terminate());
    this.connections.clear();
    logger.info('WebSocket server closed');
  }
}

// Export singleton instance using configuration
import { serverConfig } from '../../config/server';
export const webSocketServerManager = new WebSocketServerManager(
  serverConfig.websocketPort
);
